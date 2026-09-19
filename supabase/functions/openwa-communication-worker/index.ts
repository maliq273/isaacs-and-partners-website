import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const OPENWA_BASE_URL = Deno.env.get("OPENWA_BASE_URL")?.replace(/\/$/, "");
const OPENWA_API_KEY = Deno.env.get("OPENWA_API_KEY");
const OPENWA_SESSION_ID = Deno.env.get("OPENWA_SESSION_ID");
const OPENWA_WEBHOOK_SECRET = Deno.env.get("OPENWA_WEBHOOK_SECRET");
const OPENWA_WORKER_TOKEN = Deno.env.get("OPENWA_WORKER_TOKEN");
const OWNER_PHONE = (Deno.env.get("ANTHONY_OWNER_PHONE") || "27718831097").replace(/\D/g, "");
const OPENWA_USER_AGENT = "IsaacsPartners-OpenWA/1.0";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Supabase worker configuration is incomplete.");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const MAX_ATTEMPTS = 5;
let webhookReadyAt = 0;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function clean(v: unknown, max = 4096) {
  return String(v ?? "").trim().slice(0, max);
}

function normaliseChatId(v: unknown) {
  return clean(v, 255);
}

function normalisePhone(v: unknown) {
  const value = clean(v, 64);
  if (!value || value.includes("@lid")) return null;
  return value.replace(/@c\.us$/i, "").replace(/\D/g, "") || null;
}

function isDirectChat(chatId: string) {
  const id = normaliseChatId(chatId).toLowerCase();
  if (!id) return false;
  if (
    id.endsWith("@g.us") ||
    id.endsWith("@broadcast") ||
    id.endsWith("@newsletter") ||
    id === "status@broadcast"
  ) return false;
  return id.endsWith("@c.us") || id.endsWith("@lid") || /^\d{6,20}$/.test(id);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}

async function verifySignature(raw: string, sig: string | null) {
  if (!OPENWA_WEBHOOK_SECRET || !sig) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(OPENWA_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw)),
  );
  const expected = `sha256=${Array.from(digest)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;
  return timingSafeEqual(
    new TextEncoder().encode(expected),
    new TextEncoder().encode(sig),
  );
}

async function openwaRequest(path: string, init: RequestInit = {}) {
  if (!OPENWA_BASE_URL || !OPENWA_API_KEY) {
    throw new Error("OpenWA API configuration is incomplete.");
  }
  return fetch(`${OPENWA_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": OPENWA_API_KEY,
      "User-Agent": OPENWA_USER_AGENT,
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });
}

async function ensureWebhookRegistered() {
  if (!OPENWA_BASE_URL || !OPENWA_API_KEY || !OPENWA_SESSION_ID || !OPENWA_WEBHOOK_SECRET) {
    throw new Error("OpenWA webhook configuration is incomplete.");
  }

  if (Date.now() < webhookReadyAt) return;

  const webhookUrl = `${SUPABASE_URL}/functions/v1/openwa-communication-worker`;
  const desiredEvents = [
    "message.received",
    "message.sent",
    "message.ack",
    "message.failed",
  ];

  const listResponse = await openwaRequest(
    `/api/sessions/${encodeURIComponent(OPENWA_SESSION_ID)}/webhooks`,
    { method: "GET" },
  );
  const listed = await listResponse.json().catch(() => ({}));

  if (!listResponse.ok) {
    throw new Error(
      `OpenWA webhook list HTTP ${listResponse.status}: ${JSON.stringify(listed).slice(0, 1000)}`,
    );
  }

  const webhooks = Array.isArray(listed) ? listed : Array.isArray(listed?.data) ? listed.data : [];
  const matches = webhooks.filter((webhook: any) => clean(webhook?.url, 2048) === webhookUrl);

  if (matches.length > 0) {
    const keeper = matches[0];

    for (const duplicate of matches.slice(1)) {
      if (!duplicate?.id) continue;
      const deleteResponse = await openwaRequest(
        `/api/sessions/${encodeURIComponent(OPENWA_SESSION_ID)}/webhooks/${encodeURIComponent(duplicate.id)}`,
        { method: "DELETE" },
      );
      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        const deleteResult = await deleteResponse.json().catch(() => ({}));
        throw new Error(
          `OpenWA duplicate webhook delete HTTP ${deleteResponse.status}: ${JSON.stringify(deleteResult).slice(0, 1000)}`,
        );
      }
    }

    const needsUpdate =
      keeper.active !== true ||
      JSON.stringify(keeper.events || []) !== JSON.stringify(desiredEvents);

    if (needsUpdate && keeper.id) {
      const updateResponse = await openwaRequest(
        `/api/sessions/${encodeURIComponent(OPENWA_SESSION_ID)}/webhooks/${encodeURIComponent(keeper.id)}`,
        {
          method: "PUT",
          body: JSON.stringify({
            active: true,
            events: desiredEvents,
            filters: null,
            retryCount: 5,
            secret: OPENWA_WEBHOOK_SECRET,
          }),
        },
      );
      if (!updateResponse.ok) {
        const updateResult = await updateResponse.json().catch(() => ({}));
        throw new Error(
          `OpenWA webhook update HTTP ${updateResponse.status}: ${JSON.stringify(updateResult).slice(0, 1000)}`,
        );
      }
    }

    webhookReadyAt = Date.now() + 5 * 60 * 1000;
    return;
  }

  const createResponse = await openwaRequest(
    `/api/sessions/${encodeURIComponent(OPENWA_SESSION_ID)}/webhooks`,
    {
      method: "POST",
      body: JSON.stringify({
        url: webhookUrl,
        events: desiredEvents,
        secret: OPENWA_WEBHOOK_SECRET,
      }),
    },
  );

  const created = await createResponse.json().catch(() => ({}));
  if (!createResponse.ok && createResponse.status !== 409) {
    throw new Error(
      `OpenWA webhook registration HTTP ${createResponse.status}: ${JSON.stringify(created).slice(0, 1000)}`,
    );
  }

  webhookReadyAt = Date.now() + 5 * 60 * 1000;
}

async function resolveInboundPhone(chatId: string, data: any) {
  const candidates = [
    data?.senderPhone,
    data?.phoneNumber,
    data?.sender?.phoneNumber,
    data?.sender?.phone,
    data?.contact?.phoneNumber,
    data?.contact?.phone,
    data?.contact?.number,
    data?.participantPn,
    data?.senderPn,
  ];
  for (const candidate of candidates) {
    const resolved = normalisePhone(candidate);
    if (resolved) return { phone: resolved, source: "webhook_payload" };
  }

  if (/@lid$/i.test(chatId) && OPENWA_SESSION_ID) {
    try {
      const response = await openwaRequest(
        `/api/sessions/${encodeURIComponent(OPENWA_SESSION_ID)}/contacts/${encodeURIComponent(chatId)}/phone`,
        { method: "GET" },
      );
      const result = await response.json().catch(() => ({}));
      if (response.ok) {
        const resolved = normalisePhone(result?.phone || result?.phoneNumber || result?.data?.phone || result?.data?.phoneNumber);
        if (resolved) return { phone: resolved, source: "openwa_lid_resolution" };
      }
    } catch (error) {
      console.warn("Unable to resolve inbound WhatsApp LID to phone", error);
    }
  }

  const direct = normalisePhone(chatId);
  return direct ? { phone: direct, source: "chat_id" } : { phone: null, source: "unresolved" };
}

async function ensureInboundContact({ phoneNumber, chatId, messageId }: { phoneNumber: string | null; chatId: string; messageId: string | null }) {
  if (phoneNumber) {
    const byPhone = await supabase
      .from("communication_contacts")
      .select("id,user_id,phone_number,chat_id,is_active,identity_status,onboarding_state,dashboard_status,claimed_account_type,onboarding_facts")
      .eq("phone_number", phoneNumber)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (byPhone.error) throw byPhone.error;
    if (byPhone.data) {
      if (byPhone.data.chat_id !== chatId) {
        const updated = await supabase
          .from("communication_contacts")
          .update({ chat_id: chatId, last_inbound_at: new Date().toISOString(), last_message_id: messageId, updated_at: new Date().toISOString() })
          .eq("id", byPhone.data.id)
          .select("*")
          .single();
        if (updated.error) throw updated.error;
        return updated.data;
      }
      return byPhone.data;
    }
  }

  const byChat = await supabase
    .from("communication_contacts")
    .select("id,user_id,phone_number,chat_id,is_active,identity_status,onboarding_state,dashboard_status,claimed_account_type,onboarding_facts")
    .eq("chat_id", chatId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (byChat.error) throw byChat.error;
  if (byChat.data) return byChat.data;

  if (!phoneNumber) return null;

  const created = await supabase
    .from("communication_contacts")
    .insert({
      phone_number: phoneNumber,
      chat_id: chatId,
      identity_status: "UNAUTHENTICATED_WHATSAPP_CONTACT",
      contact_type: "WHATSAPP",
      whatsapp_consent: false,
      onboarding_state: "NEW",
      dashboard_status: "NOT_ACTIVATED_PENDING_APPROVAL",
      account_match_status: "NOT_CHECKED",
      last_inbound_at: new Date().toISOString(),
      last_message_id: messageId,
      onboarding_facts: {},
    })
    .select("*")
    .single();
  if (!created.error) return created.data;
  if (created.error.code === "23505") {
    const retry = await supabase
      .from("communication_contacts")
      .select("*")
      .or(`phone_number.eq.${phoneNumber},chat_id.eq.${chatId}`)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (retry.error) throw retry.error;
    return retry.data || null;
  }
  throw created.error;
}

async function processOutbound(limit = 5) {
  if (!OPENWA_BASE_URL || !OPENWA_API_KEY || !OPENWA_SESSION_ID) {
    throw new Error("OpenWA outbound configuration is incomplete.");
  }

  await ensureWebhookRegistered();
  const results = [];

  for (let i = 0; i < limit; i++) {
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
    if (!row) break;

    const message = row.communication_messages;
    const chatId = normaliseChatId(row.chat_id);

    if (!message || !isDirectChat(chatId)) {
      await supabase
        .from("communication_outbox")
        .update({
          status: "FAILED",
          last_error: "Blocked: WhatsApp group/broadcast destinations are not permitted.",
          locked_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (message?.id) {
        await supabase
          .from("communication_messages")
          .update({
            status: "FAILED",
            metadata: {
              ...(message.metadata || {}),
              transport_blocked: "NON_DIRECT_WHATSAPP_DESTINATION",
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", message.id);
      }
      continue;
    }

    const attempts = Number(row.attempts || 0) + 1;
    const claim = await supabase
      .from("communication_outbox")
      .update({
        status: "PROCESSING",
        attempts,
        locked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("status", "QUEUED")
      .select()
      .maybeSingle();

    if (claim.error) throw claim.error;
    if (!claim.data) continue;

    try {
      await supabase
        .from("communication_messages")
        .update({
          status: "SENDING",
          openwa_session_id: OPENWA_SESSION_ID,
          updated_at: new Date().toISOString(),
        })
        .eq("id", message.id);

      const response = await openwaRequest(
        `/api/sessions/${encodeURIComponent(OPENWA_SESSION_ID)}/messages/send-text`,
        {
          method: "POST",
          body: JSON.stringify({ chatId, text: message.body }),
        },
      );

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          `OpenWA HTTP ${response.status}: ${JSON.stringify(result).slice(0, 1000)}`,
        );
      }

      const providerMessageId =
        result?.id || result?.messageId || result?.data?.id || null;

      await supabase
        .from("communication_messages")
        .update({
          status: "SENT",
          openwa_session_id: OPENWA_SESSION_ID,
          openwa_message_id: providerMessageId,
          metadata: { ...(message.metadata || {}), openwa_response: result },
          updated_at: new Date().toISOString(),
        })
        .eq("id", message.id);

      await supabase
        .from("communication_outbox")
        .update({
          status: "SENT",
          locked_at: null,
          updated_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", row.id);

      results.push({
        processed: true,
        messageId: message.id,
        openwaMessageId: providerMessageId,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const terminal = attempts >= MAX_ATTEMPTS;

      await supabase
        .from("communication_outbox")
        .update({
          status: terminal ? "FAILED" : "QUEUED",
          available_at: new Date(
            Date.now() + Math.min(attempts * 15000, 300000),
          ).toISOString(),
          locked_at: null,
          last_error: errorMessage.slice(0, 2000),
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      await supabase
        .from("communication_messages")
        .update({
          status: terminal ? "FAILED" : "QUEUED",
          metadata: {
            ...(message.metadata || {}),
            last_transport_error: errorMessage,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", message.id);

      results.push({
        processed: false,
        messageId: message.id,
        error: errorMessage,
      });
    }
  }

  return results;
}

async function invokeAi(payload: any) {
  if (!OPENWA_WORKER_TOKEN) {
    throw new Error("OpenWA worker token is not configured.");
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-liaison-runtime`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-AI-Internal-Worker-Token": OPENWA_WORKER_TOKEN,
      "User-Agent": OPENWA_USER_AGENT,
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `AI liaison HTTP ${response.status}: ${JSON.stringify(result).slice(0, 1500)}`,
    );
  }
  return result;
}

async function handleInbound({
  payload,
  data,
  chatId,
  phoneNumber,
  contact,
  body,
  idempotencyKey,
  sourceEvent,
}: {
  payload: any;
  data: any;
  chatId: string;
  phoneNumber: string | null;
  contact: any;
  body: string;
  idempotencyKey: string | null;
  sourceEvent: string;
}) {
  const customerUserId = contact?.user_id || null;

  if (idempotencyKey) {
    const existing = await supabase
      .from("communication_messages")
      .select("id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existing.data) return { received: true, duplicate: true };
    if (existing.error && existing.error.code !== "PGRST116") throw existing.error;
  }

  const whatsappName =
    clean(
      data.pushName ||
        data.notifyName ||
        data.senderName ||
        data.contactName ||
        data.contact?.pushName ||
        data.contact?.name ||
        "",
      255,
    ) || null;

  const { data: inserted, error } = await supabase
    .from("communication_messages")
    .insert({
      customer_user_id: customerUserId,
      channel: "WHATSAPP",
      direction: "INBOUND",
      phone_number: phoneNumber,
      chat_id: chatId,
      body,
      status: "RECEIVED",
      openwa_session_id: payload?.sessionId || OPENWA_SESSION_ID || null,
      openwa_message_id: data.id || null,
      idempotency_key: idempotencyKey,
      delivery_id: payload?.deliveryId || null,
      metadata: {
        openwa_event: payload,
        whatsapp_name: whatsappName,
        phone_number_resolved: phoneNumber,
        anthony_owner_channel: phoneNumber === OWNER_PHONE,
        owner_transport_event: sourceEvent,
      },
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { received: true, duplicate: true };
    throw error;
  }

  try {
    const ai = await invokeAi({
      ...(customerUserId ? { userId: customerUserId } : {}),
      contactId: contact?.id || null,
      channel: "WHATSAPP",
      chatId,
      phoneNumber,
      whatsappName,
      body,
      messageId: data.id || inserted.id,
    });

    await supabase
      .from("communication_messages")
      .update({
        status: "HANDLED",
        metadata: {
          openwa_event: payload,
          ai_runtime_invoked: true,
          whatsapp_name: whatsappName,
          phone_number_resolved: phoneNumber,
          anthony_owner_channel: phoneNumber === OWNER_PHONE,
          owner_transport_event: sourceEvent,
        },
      })
      .eq("id", inserted.id);

    const outbound = await processOutbound(5);
    return {
      received: true,
      authenticatedClient: Boolean(customerUserId),
      aiRuntime: ai ? "HANDLED" : "FAILED_OR_NOT_RETURNED",
      outbound,
    };
  } catch (error) {
    console.error("AI handling failed after inbound persistence", error);

    await supabase
      .from("communication_messages")
      .update({
        metadata: {
          openwa_event: payload,
          ai_runtime_invoked: false,
          ai_runtime_error: String(error).slice(0, 1500),
          whatsapp_name: whatsappName,
          phone_number_resolved: phoneNumber,
          anthony_owner_channel: phoneNumber === OWNER_PHONE,
          owner_transport_event: sourceEvent,
        },
      })
      .eq("id", inserted.id);

    try {
      return {
        received: true,
        authenticatedClient: Boolean(customerUserId),
        aiRuntime: "FAILED_OR_NOT_RETURNED",
        outbound: await processOutbound(5),
      };
    } catch (outboundError) {
      console.error(
        "Outbound drain after AI failure also failed",
        outboundError,
      );
      return {
        received: true,
        authenticatedClient: Boolean(customerUserId),
        aiRuntime: "FAILED_OR_NOT_RETURNED",
      };
    }
  }
}

async function processWebhook(req: Request) {
  const rawBody = await req.text();

  if (!(await verifySignature(rawBody, req.headers.get("X-OpenWA-Signature")))) {
    return json({ error: "Invalid webhook signature." }, 401);
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }

  const event = String(payload?.event || "");
  const data = payload?.data || {};
  const idempotencyKey =
    payload?.idempotencyKey ||
    req.headers.get("X-OpenWA-Idempotency-Key") ||
    null;

  if (event === "message.received") {
    const chatId = normaliseChatId(data.from || data.chatId);
    if (!chatId) return json({ received: true, ignored: true, reason: "Missing chat ID." });
    if (!isDirectChat(chatId)) {
      return json({ received: true, ignored: true, reason: "GROUP_OR_BROADCAST_CHAT_BLOCKED" });
    }

    const resolvedSender = await resolveInboundPhone(chatId, data);
    const fromPhone = resolvedSender.phone;
    const body = clean(data.body || data.text || data.message, 4096);
    if (!body) return json({ received: true, ignored: true, reason: "EMPTY_MESSAGE" });

    const contact = await ensureInboundContact({ phoneNumber: fromPhone, chatId, messageId: data.id || null });
    return json(
      await handleInbound({
        payload,
        data,
        chatId,
        phoneNumber: fromPhone || normalisePhone(contact?.phone_number),
        contact,
        body,
        idempotencyKey,
        sourceEvent: `${event}:${resolvedSender.source}`,
      }),
    );
  }

  if (event === "message.sent") {
    const providerId = data.id || data.messageId || null;

    if (providerId) {
      const existing = await supabase
        .from("communication_messages")
        .select("id,direction,metadata")
        .eq("openwa_message_id", providerId)
        .maybeSingle();

      if (existing.data) {
        await supabase
          .from("communication_messages")
          .update({
            status: "SENT",
            metadata: { ...(existing.data.metadata || {}), openwa_event: payload },
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.data.id);
      }
    }

    const fromMe = Boolean(data.fromMe ?? data.isFromMe ?? data.from_me);
    const chatId = normaliseChatId(data.chatId || data.to || data.from || data.recipient || "");
    const body = clean(data.body || data.text || data.message, 4096);
    const ownerChatId = normalisePhone(chatId);
    const ownerTargetPhone = normalisePhone(data.to || data.recipient);
    let ownerLid = false;

    if (chatId && isDirectChat(chatId) && ownerChatId === null) {
      const ownerContact = await supabase
        .from("communication_contacts")
        .select("chat_id")
        .eq("phone_number", OWNER_PHONE)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (ownerContact.error) throw ownerContact.error;
      ownerLid = Boolean(
        ownerContact.data?.chat_id &&
          normaliseChatId(ownerContact.data.chat_id).toLowerCase() === chatId.toLowerCase(),
      );
    }

    const selfTarget = Boolean(
      chatId &&
        isDirectChat(chatId) &&
        (ownerChatId === OWNER_PHONE || ownerTargetPhone === OWNER_PHONE || ownerLid),
    );

    if (fromMe && selfTarget && body) {
      const recentCutoff = new Date(Date.now() - 30000).toISOString();
      const recent = await supabase
        .from("communication_messages")
        .select("id,openwa_message_id,body,direction")
        .eq("direction", "OUTBOUND")
        .eq("phone_number", OWNER_PHONE)
        .eq("body", body)
        .gte("created_at", recentCutoff)
        .limit(5);

      if (recent.error) throw recent.error;
      const isAnthonyOutbound = Boolean(
        providerId && recent.data?.some((r: any) => r.openwa_message_id === providerId),
      );

      if (!isAnthonyOutbound && !recent.data?.length) {
        const r = await supabase
          .from("communication_contacts")
          .select("id,user_id,phone_number,chat_id,is_active")
          .eq("phone_number", OWNER_PHONE)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();
        if (r.error) throw r.error;

        return json(
          await handleInbound({
            payload,
            data,
            chatId,
            phoneNumber: OWNER_PHONE,
            contact: r.data,
            body,
            idempotencyKey: idempotencyKey || `owner-self:${providerId || Date.now()}`,
            sourceEvent: "message.sent.owner_self",
          }),
        );
      }
    }

    return json({ received: true });
  }

  if (["message.ack", "message.failed"].includes(event)) {
    const providerId = data.id || data.messageId || null;
    if (providerId) {
      const status = event === "message.failed" ? "FAILED" : mapAckStatus(data);
      await supabase
        .from("communication_messages")
        .update({
          status,
          metadata: { openwa_event: payload },
          updated_at: new Date().toISOString(),
        })
        .eq("openwa_message_id", providerId);
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
    if (req.headers.get("X-OpenWA-Signature")) {
      return await processWebhook(req);
    }

    const token = req.headers.get("X-OpenWA-Worker-Token");
    if (!OPENWA_WORKER_TOKEN || token !== OPENWA_WORKER_TOKEN) {
      return json({ error: "Forbidden." }, 403);
    }

    return json(await processOutbound(5));
  } catch (error) {
    console.error("OpenWA communication worker failed", error);
    return json({ error: "Communication worker failed." }, 500);
  }
});
