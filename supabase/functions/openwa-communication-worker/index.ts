/**
 * Isaacs & Partners — PR43 OpenWA Communication Worker
 *
 * Server-side WhatsApp transport boundary. The browser never receives the
 * OpenWA API key. Outbound work is consumed from communication_outbox and
 * inbound OpenWA webhooks are verified with HMAC-SHA256 before persistence.
 *
 * Required Edge Function secrets:
 *   OPENWA_BASE_URL
 *   OPENWA_API_KEY
 *   OPENWA_SESSION_ID
 *   OPENWA_WEBHOOK_SECRET
 *   OPENWA_WORKER_TOKEN
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const OPENWA_BASE_URL = Deno.env.get("OPENWA_BASE_URL")?.replace(/\/$/, "");
const OPENWA_API_KEY = Deno.env.get("OPENWA_API_KEY");
const OPENWA_SESSION_ID = Deno.env.get("OPENWA_SESSION_ID");
const OPENWA_WEBHOOK_SECRET = Deno.env.get("OPENWA_WEBHOOK_SECRET");
const OPENWA_WORKER_TOKEN = Deno.env.get("OPENWA_WORKER_TOKEN");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error("Supabase worker configuration is incomplete.");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const MAX_ATTEMPTS = 5;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
  return result === 0;
}

async function verifyWebhookSignature(rawBody: string, signature: string | null) {
  if (!OPENWA_WEBHOOK_SECRET || !signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(OPENWA_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)));
  const expected = `sha256=${Array.from(digest).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
  return timingSafeEqual(new TextEncoder().encode(expected), new TextEncoder().encode(signature));
}

function normaliseChatId(value: string | null | undefined) {
  return String(value || "").trim();
}

async function processOutbound() {
  if (!OPENWA_BASE_URL || !OPENWA_API_KEY || !OPENWA_SESSION_ID) {
    throw new Error("OpenWA outbound configuration is incomplete.");
  }

  const { data: row, error } = await supabase
    .from("communication_outbox")
    .select("*, communication_messages(*)")
    .eq("status", "QUEUED")
    .lte("available_at", new Date().toISOString())
    .order("available_at", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!row) return { processed: false, message: "No queued WhatsApp messages." };

  const attempts = Number(row.attempts || 0) + 1;
  const claim = await supabase
    .from("communication_outbox")
    .update({ status: "PROCESSING", attempts, locked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", row.id)
    .eq("status", "QUEUED")
    .select()
    .maybeSingle();

  if (claim.error) throw claim.error;
  if (!claim.data) return { processed: false, message: "Message was claimed by another worker." };

  const message = row.communication_messages;
  try {
    await supabase.from("communication_messages").update({
      status: "SENDING",
      openwa_session_id: OPENWA_SESSION_ID,
      updated_at: new Date().toISOString(),
    }).eq("id", message.id);

    const response = await fetch(`${OPENWA_BASE_URL}/api/sessions/${encodeURIComponent(OPENWA_SESSION_ID)}/messages/send-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": OPENWA_API_KEY },
      body: JSON.stringify({ chatId: normaliseChatId(row.chat_id), text: message.body }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`OpenWA HTTP ${response.status}: ${JSON.stringify(result).slice(0, 1000)}`);

    const providerMessageId = result?.id || result?.messageId || result?.data?.id || null;
    await supabase.from("communication_messages").update({
      status: "SENT",
      openwa_session_id: OPENWA_SESSION_ID,
      openwa_message_id: providerMessageId,
      metadata: { ...(message.metadata || {}), openwa_response: result },
      updated_at: new Date().toISOString(),
    }).eq("id", message.id);

    await supabase.from("communication_outbox").update({
      status: "SENT", locked_at: null, updated_at: new Date().toISOString(), last_error: null,
    }).eq("id", row.id);

    return { processed: true, messageId: message.id, openwaMessageId: providerMessageId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const terminal = attempts >= MAX_ATTEMPTS;
    await supabase.from("communication_outbox").update({
      status: terminal ? "FAILED" : "QUEUED",
      available_at: new Date(Date.now() + Math.min(attempts * 15000, 300000)).toISOString(),
      locked_at: null,
      last_error: errorMessage.slice(0, 2000),
      updated_at: new Date().toISOString(),
    }).eq("id", row.id);
    await supabase.from("communication_messages").update({
      status: terminal ? "FAILED" : "QUEUED",
      metadata: { ...(message.metadata || {}), last_transport_error: errorMessage },
      updated_at: new Date().toISOString(),
    }).eq("id", message.id);
    throw error;
  }
}

async function processWebhook(req: Request) {
  const rawBody = await req.text();
  if (!(await verifyWebhookSignature(rawBody, req.headers.get("X-OpenWA-Signature")))) {
    return json({ error: "Invalid webhook signature." }, 401);
  }

  let payload: any;
  try { payload = JSON.parse(rawBody); } catch { return json({ error: "Invalid JSON." }, 400); }

  const event = String(payload?.event || "");
  const data = payload?.data || {};
  const idempotencyKey = payload?.idempotencyKey || req.headers.get("X-OpenWA-Idempotency-Key") || null;

  if (idempotencyKey) {
    const existing = await supabase.from("communication_messages").select("id").eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existing.data) return json({ received: true, duplicate: true });
    if (existing.error && existing.error.code !== "PGRST116") throw existing.error;
  }

  if (event === "message.received") {
    const chatId = normaliseChatId(data.from || data.chatId);
    const { data: contact } = await supabase.from("communication_contacts").select("user_id").eq("chat_id", chatId).eq("is_active", true).maybeSingle();
    const customerUserId = contact?.user_id || null;

    const { data: inserted, error } = await supabase.from("communication_messages").insert({
      customer_user_id: customerUserId,
      channel: "WHATSAPP",
      direction: "INBOUND",
      phone_number: String(data.from || "").replace(/@.*$/, "") || null,
      chat_id: chatId,
      body: String(data.body || "").slice(0, 4096),
      status: "RECEIVED",
      openwa_session_id: payload?.sessionId || OPENWA_SESSION_ID || null,
      openwa_message_id: data.id || null,
      idempotency_key: idempotencyKey,
      delivery_id: payload?.deliveryId || req.headers.get("X-OpenWA-Delivery-Id") || null,
      metadata: { openwa_event: payload },
    }).select("id").single();

    if (error) {
      if (error.code === "23505") return json({ received: true, duplicate: true });
      throw error;
    }

    if (customerUserId) {
      await supabase.from("notifications").insert({
        recipient_user_id: customerUserId,
        channel: "WHATSAPP",
        subject: "New WhatsApp message",
        message: String(data.body || "").slice(0, 4096),
        status: "SENT",
        provider: "openwa",
        provider_reference: data.id || null,
        metadata: { communication_message_id: inserted.id },
      });
    }
  } else if (["message.sent", "message.ack", "message.failed"].includes(event)) {
    const providerId = data.id || data.messageId || null;
    if (providerId) {
      const status = event === "message.failed" ? "FAILED" : event === "message.ack" ? mapAckStatus(data) : "SENT";
      await supabase.from("communication_messages").update({
        status,
        metadata: { openwa_event: payload },
        updated_at: new Date().toISOString(),
      }).eq("openwa_message_id", providerId);
    }
  }

  return json({ received: true });
}

function mapAckStatus(data: any) {
  const value = String(data?.ack || data?.status || "").toLowerCase();
  if (value.includes("read")) return "READ";
  if (value.includes("deliver")) return "DELIVERED";
  return "SENT";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    if (req.headers.get("X-OpenWA-Signature")) return await processWebhook(req);

    const token = req.headers.get("X-OpenWA-Worker-Token");
    if (!OPENWA_WORKER_TOKEN || token !== OPENWA_WORKER_TOKEN) return json({ error: "Forbidden." }, 403);

    return json(await processOutbound());
  } catch (error) {
    console.error("OpenWA communication worker failed", error);
    return json({ error: "Communication worker failed." }, 500);
  }
});
