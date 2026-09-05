/**
 * Isaacs & Partners — AI Liaison Runtime Connector
 *
 * Supabase-backed server runtime for the AI liaison.
 *
 * Responsibilities:
 *   1. Authenticate the signed-in client using the caller JWT.
 *   2. Resolve or create the client's AI conversation.
 *   3. Persist the inbound client message through the protected RPC.
 *   4. Run the existing WhatsAppAgent orchestration and policy layer.
 *   5. Generate a ChatGPT/Gemini-quality response through TruthFusionEngine,
 *      merging general model reasoning with authoritative company truth.
 *   6. Persist trusted AI output through the service-role boundary.
 *   7. Return the authoritative conversation and AI response to the caller.
 *
 * Required Edge Function secrets/configuration:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_ANON_KEY (or SUPABASE_PUBLISHABLE_KEY)
 *   AI_PROVIDER=openai|gemini
 *   OPENAI_API_KEY and optionally OPENAI_MODEL
 *   GEMINI_API_KEY and optionally GEMINI_MODEL
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import WhatsAppAgent from "../../../app/communication/agents/WhatsAppAgent.js";
import AIProviderService from "../../../app/ai/providers/AIProviderService.js";
import CompanyTruthService from "../../../app/ai/CompanyTruthService.js";
import TruthFusionEngine from "../../../app/ai/TruthFusionEngine.js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
const ALLOWED_ORIGIN = Deno.env.get("AI_LIAISON_ALLOWED_ORIGIN") ?? "https://www.isaacsandpartners.online";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  throw new Error("AI liaison runtime configuration is incomplete.");
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function clean(value: unknown, max = 4096) {
  return String(value ?? "").trim().slice(0, max);
}

function nullable(value: unknown, max = 255) {
  const result = clean(value, max);
  return result || null;
}

function normaliseChannel(value: unknown) {
  const channel = clean(value, 32).toUpperCase() || "PORTAL";
  if (!["WHATSAPP", "PORTAL", "EMAIL", "OTHER"].includes(channel)) {
    throw new Error("Invalid conversation channel.");
  }
  return channel;
}

async function authenticate(request: Request) {
  const token = clean(request.headers.get("Authorization")).replace(/^Bearer\s+/i, "");
  if (!token) {
    throw new Response(JSON.stringify({ error: "Authentication is required." }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const caller = createClient(SUPABASE_URL!, ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await caller.auth.getUser(token);
  if (error || !data?.user?.id) {
    throw new Response(JSON.stringify({ error: "Authenticated user could not be verified." }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  return { caller, user: data.user };
}

async function getMatter(matterId: string | null) {
  if (!matterId) return null;

  const { data, error } = await admin
    .from("matters")
    .select("*")
    .eq("id", matterId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Matter not found.");
  return data;
}

async function verifyMatterOwnership(userId: string, matterId: string | null) {
  const matter = await getMatter(matterId);
  if (!matter) return null;

  if (matter.individual_user_id === userId) return matter;

  if (matter.business_id) {
    const { data: business, error: businessError } = await admin
      .from("businesses")
      .select("id")
      .eq("id", matter.business_id)
      .eq("owner_user_id", userId)
      .maybeSingle();

    if (businessError) throw businessError;
    if (business) return matter;
  }

  throw new Error("You are not authorised to use this matter in the AI conversation.");
}

async function resolveConversation({
  userId,
  chatId,
  phoneNumber,
  channel,
  matterId,
}: {
  userId: string;
  chatId: string | null;
  phoneNumber: string | null;
  channel: string;
  matterId: string | null;
}) {
  let query = admin
    .from("ai_conversations")
    .select("*")
    .eq("client_user_id", userId)
    .eq("channel", channel)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (chatId) query = query.eq("chat_id", chatId);

  const { data: existing, error } = await query.maybeSingle();
  if (error) throw error;
  if (existing) return existing;

  const { data: created, error: createError } = await admin
    .from("ai_conversations")
    .insert({
      client_user_id: userId,
      matter_id: matterId,
      chat_id: chatId,
      phone_number: phoneNumber,
      channel,
      state: "AI_ACTIVE",
      metadata: { source: "ai-liaison-runtime", created_by: "authenticated-client" },
    })
    .select("*")
    .single();

  if (createError) {
    if (createError.code === "23505" && chatId) {
      const retry = await admin
        .from("ai_conversations")
        .select("*")
        .eq("chat_id", chatId)
        .maybeSingle();
      if (retry.error) throw retry.error;
      if (retry.data?.client_user_id !== userId) {
        throw new Error("WhatsApp conversation belongs to another client.");
      }
      return retry.data;
    }
    throw createError;
  }

  return created;
}

async function persistAiMessage({
  conversationId,
  body,
  intent,
  serviceDomain,
  metadata = {},
}: {
  conversationId: string;
  body: string;
  intent?: string | null;
  serviceDomain?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await admin.rpc("ai_append_conversation_message", {
    p_conversation_id: conversationId,
    p_sender_type: "AI",
    p_direction: "OUTBOUND",
    p_body: body,
    p_intent: intent ?? null,
    p_service_domain: serviceDomain ?? null,
    p_metadata: {
      source: "ai-liaison-runtime",
      runtime: "WhatsAppAgent",
      ...metadata,
    },
  });

  if (error) throw error;
  return data;
}

function createLiaisonAgent() {
  const provider = new AIProviderService();
  const companyTruth = new CompanyTruthService();
  const fusion = new TruthFusionEngine({ provider, companyTruth });

  return new WhatsAppAgent({
    responseGenerator: (input) => fusion.generate(input)
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  try {
    const { caller, user } = await authenticate(request);
    const payload = await request.json();

    const body = clean(payload?.body);
    if (!body) return json({ error: "Message body is required." }, 400);

    const channel = normaliseChannel(payload?.channel);
    const chatId = nullable(payload?.chatId, 255);
    const phoneNumber = nullable(payload?.phoneNumber, 64);
    const matterId = nullable(payload?.matterId, 64);
    const messageId = nullable(payload?.messageId, 255);

    if (channel === "WHATSAPP" && !chatId) {
      return json({ error: "WhatsApp conversations require chatId." }, 400);
    }

    const matter = await verifyMatterOwnership(user.id, matterId);

    const conversation = await resolveConversation({
      userId: user.id,
      chatId,
      phoneNumber,
      channel,
      matterId,
    });

    if (conversation.matter_id && matterId && conversation.matter_id !== matterId) {
      return json({ error: "Conversation is already linked to a different matter." }, 409);
    }

    if (matterId && !conversation.matter_id) {
      const { error: linkError } = await admin
        .from("ai_conversations")
        .update({ matter_id: matterId })
        .eq("id", conversation.id)
        .eq("client_user_id", user.id);
      if (linkError) throw linkError;
      conversation.matter_id = matterId;
    }

    const metadata = {
      source: "ai-liaison-runtime",
      ...(messageId ? { client_message_id: messageId } : {}),
    };

    const { data: message, error: messageError } = await caller.rpc("ai_append_conversation_message", {
      p_conversation_id: conversation.id,
      p_sender_type: "CLIENT",
      p_direction: "INBOUND",
      p_body: body,
      p_intent: nullable(payload?.intent, 100),
      p_service_domain: nullable(payload?.serviceDomain, 100),
      p_metadata: metadata,
    });

    if (messageError) throw messageError;

    const agent = createLiaisonAgent();
    const result = await agent.handleInbound({
      chatId: chatId || `portal:${user.id}`,
      phoneNumber,
      body,
      messageId,
      user,
      matter,
      conversation: null,
    });

    const aiReply = clean(result?.reply, 8192);
    let aiMessage = null;

    if (aiReply) {
      aiMessage = await persistAiMessage({
        conversationId: conversation.id,
        body: aiReply,
        intent: result?.intent?.intent ?? null,
        serviceDomain: result?.servicePlan?.domain ?? null,
        metadata: {
          action: result?.action ?? "RESPOND",
          handled: result?.handled === true,
          ai_provider: result?.aiProvider ?? null,
          ai_model: result?.aiModel ?? null,
          company_truth_sources: result?.companySources ?? [],
          ...(result?.escalation
            ? {
                escalation: {
                  superAdminRequired: result.escalation.superAdminRequired === true,
                  requiredCapabilities: result.escalation.requiredCapabilities ?? [],
                },
              }
            : {}),
        },
      });
    }

    if (result?.action === "ESCALATE") {
      const { error: stateError } = await admin
        .from("ai_conversations")
        .update({ state: "AI_ESCALATED", updated_at: new Date().toISOString() })
        .eq("id", conversation.id);
      if (stateError) throw stateError;
    }

    const { data: refreshed, error: refreshError } = await admin
      .from("ai_conversations")
      .select("*")
      .eq("id", conversation.id)
      .single();

    if (refreshError) throw refreshError;

    return json({
      ok: true,
      conversation: refreshed,
      message,
      aiMessage,
      result: {
        action: result?.action ?? null,
        intent: result?.intent ?? null,
        servicePlan: result?.servicePlan ?? null,
        sales: result?.sales ?? null,
        escalated: result?.action === "ESCALATE",
        aiProvider: result?.aiProvider ?? null,
        aiModel: result?.aiModel ?? null,
        companySources: result?.companySources ?? [],
      },
      next: {
        aiResponse: aiMessage ? "PERSISTED" : "NONE",
        aiOutputIsServerControlled: true,
        engine: "WhatsAppAgent + TruthFusionEngine",
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("AI liaison runtime failed", error);
    return json({ error: error instanceof Error ? error.message : "AI liaison runtime failed." }, 500);
  }
});
