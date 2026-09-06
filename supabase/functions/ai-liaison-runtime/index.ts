/**
 * Isaacs & Partners — authenticated AI Liaison runtime.
 * One AI path for the client portal and the trusted WhatsApp transport.
 * The browser never receives provider or OpenWA credentials.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import WhatsAppAgent from "../../../app/communication/agents/WhatsAppAgent.js";
import AIProviderService from "../../../app/ai/providers/AIProviderService.js";
import CompanyTruthService from "../../../app/ai/CompanyTruthService.js";
import TruthFusionEngine from "../../../app/ai/TruthFusionEngine.js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
const INTERNAL_WORKER_TOKEN = Deno.env.get("OPENWA_WORKER_TOKEN");
const ALLOWED_ORIGIN = Deno.env.get("AI_LIAISON_ALLOWED_ORIGIN") ?? "https://www.isaacsandpartners.online";
if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) throw new Error("AI liaison runtime configuration is incomplete.");

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const corsHeaders = { "Access-Control-Allow-Origin": ALLOWED_ORIGIN, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ai-internal-worker-token", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: corsHeaders }); }
function clean(value: unknown, max = 4096) { return String(value ?? "").trim().slice(0, max); }
function nullable(value: unknown, max = 255) { const text = clean(value, max); return text || null; }
function channelOf(value: unknown) { const channel = clean(value, 32).toUpperCase() || "PORTAL"; if (!["PORTAL", "WHATSAPP", "EMAIL", "OTHER"].includes(channel)) throw new Error("Invalid conversation channel."); return channel; }

async function authenticate(request: Request, payload: any) {
  const internalToken = clean(request.headers.get("X-AI-Internal-Worker-Token"), 512);
  if (internalToken) {
    if (!INTERNAL_WORKER_TOKEN || internalToken !== INTERNAL_WORKER_TOKEN) throw new Response(JSON.stringify({ error: "Invalid internal worker credentials." }), { status: 401, headers: corsHeaders });
    const userId = clean(payload?.userId, 128);
    if (!userId) throw new Response(JSON.stringify({ error: "Internal AI requests require userId." }), { status: 400, headers: corsHeaders });
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data?.user?.id) throw new Response(JSON.stringify({ error: "Internal client could not be resolved." }), { status: 404, headers: corsHeaders });
    return { caller: admin, user: data.user, internal: true };
  }
  const token = clean(request.headers.get("Authorization")).replace(/^Bearer\s+/i, "");
  if (!token) throw new Response(JSON.stringify({ error: "Authentication is required." }), { status: 401, headers: corsHeaders });
  const caller = createClient(SUPABASE_URL!, ANON_KEY!, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await caller.auth.getUser(token);
  if (error || !data?.user?.id) throw new Response(JSON.stringify({ error: "Authenticated user could not be verified." }), { status: 401, headers: corsHeaders });
  return { caller, user: data.user, internal: false };
}

async function getMatter(matterId: string | null) {
  if (!matterId) return null;
  const { data, error } = await admin.from("matters").select("*").eq("id", matterId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Matter not found.");
  return data;
}

async function verifyMatterOwnership(userId: string, matterId: string | null) {
  const matter = await getMatter(matterId);
  if (!matter) return null;
  if (matter.individual_user_id === userId) return matter;
  if (matter.business_id) {
    const { data, error } = await admin.from("businesses").select("id").eq("id", matter.business_id).eq("owner_user_id", userId).maybeSingle();
    if (error) throw error;
    if (data) return matter;
  }
  throw new Error("You are not authorised to use this matter in the AI conversation.");
}

async function getOperationalContext(userId: string, matterId: string | null) {
  const context: any = { matter: null, documents: [], appointments: [], invoices: [] };
  if (matterId) context.matter = await verifyMatterOwnership(userId, matterId);
  const run = async (table: string, select: string, orderColumn: string, ownerColumn: string, limit = 50) => {
    let query: any = admin.from(table).select(select).order(orderColumn, { ascending: false }).limit(limit);
    if (matterId) query = query.eq("matter_id", matterId);
    else query = query.eq(ownerColumn, userId);
    const result = await query;
    if (result.error) throw result.error;
    return result.data || [];
  };
  context.documents = await run("documents", "id,matter_id,document_type,name,status,required,reviewed,uploaded_at,reviewed_at,notes,created_at,updated_at", "updated_at", "individual_user_id");
  context.appointments = await run("appointments", "id,matter_id,title,appointment_type,starts_at,ends_at,status,location,notes", "starts_at", "individual_user_id", 20);
  context.invoices = await run("invoices", "id,matter_id,invoice_number,description,amount,currency,status,due_at,issued_at,paid_at", "created_at", "individual_user_id", 20);
  return context;
}

async function resolveConversation({ userId, chatId, phoneNumber, channel, matterId }: { userId: string; chatId: string; phoneNumber: string | null; channel: string; matterId: string | null }) {
  const query = admin.from("ai_conversations").select("*").eq("client_user_id", userId).eq("channel", channel).eq("chat_id", chatId).order("updated_at", { ascending: false }).limit(1);
  const { data: existing, error } = await query.maybeSingle();
  if (error) throw error;
  if (existing) return existing;
  const { data: created, error: createError } = await admin.from("ai_conversations").insert({ client_user_id: userId, matter_id: matterId, chat_id: chatId, phone_number: phoneNumber, channel, state: "AI_ACTIVE", metadata: { source: "ai-liaison-runtime", created_by: "trusted-runtime" } }).select("*").single();
  if (createError) {
    if (createError.code === "23505") {
      const retry = await admin.from("ai_conversations").select("*").eq("chat_id", chatId).maybeSingle();
      if (retry.error) throw retry.error;
      if (retry.data?.client_user_id !== userId) throw new Error("Conversation belongs to another client.");
      return retry.data;
    }
    throw createError;
  }
  return created;
}

async function persistClientMessage(caller: any, conversationId: string, body: string, messageId: string | null, intent: string | null, serviceDomain: string | null, internal: boolean) {
  const { data, error } = await caller.rpc("ai_append_conversation_message", { p_conversation_id: conversationId, p_sender_type: "CLIENT", p_direction: "INBOUND", p_body: body, p_intent: intent, p_service_domain: serviceDomain, p_metadata: { source: "ai-liaison-runtime", transport: internal ? "openwa" : "portal", ...(messageId ? { client_message_id: messageId } : {}) } });
  if (error) throw error;
  return data;
}

async function persistAiMessage(conversationId: string, body: string, result: any) {
  const { data, error } = await admin.rpc("ai_append_conversation_message", { p_conversation_id: conversationId, p_sender_type: "AI", p_direction: "OUTBOUND", p_body: body, p_intent: result?.intent?.intent ?? null, p_service_domain: result?.servicePlan?.domain ?? null, p_metadata: { source: "ai-liaison-runtime", runtime: "WhatsAppAgent", action: result?.action ?? "RESPOND", ai_provider: result?.aiProvider ?? null, ai_model: result?.aiModel ?? null, company_truth_sources: result?.companySources ?? [], ...(result?.escalation ? { escalation: { superAdminRequired: true, requiredCapabilities: result.escalation.requiredCapabilities ?? [] } } : {}) } });
  if (error) throw error;
  return data;
}

async function createIntervention(conversation: any, userId: string, result: any, matterId: string | null) {
  const { data, error } = await admin.rpc("ai_create_human_intervention", { p_conversation_id: conversation.id, p_matter_id: matterId || conversation.matter_id || null, p_client_user_id: userId, p_reason: result?.escalation?.reason || "AI Liaison requested human review.", p_priority: result?.escalation?.priority || "NORMAL", p_question: result?.escalation?.question || "The AI Liaison has requested authorised human review.", p_ai_context: { intent: result?.intent ?? null, servicePlan: result?.servicePlan ?? null, companySources: result?.companySources ?? [] } });
  if (error) throw error;
  return data;
}

async function queueWhatsAppAiReply({ userId, conversation, body, phoneNumber, matterId, sourceMessageId }: any) {
  if (conversation.channel !== "WHATSAPP") return null;
  const idempotencyKey = sourceMessageId ? `ai-reply:${conversation.id}:${sourceMessageId}` : `ai-reply:${conversation.id}:${Date.now()}`;
  const existing = await admin.from("communication_messages").select("id").eq("idempotency_key", idempotencyKey).maybeSingle();
  if (existing.error && existing.error.code !== "PGRST116") throw existing.error;
  if (existing.data?.id) return existing.data.id;
  const { data: message, error } = await admin.from("communication_messages").insert({ customer_user_id: userId, matter_id: matterId || conversation.matter_id || null, channel: "WHATSAPP", direction: "OUTBOUND", phone_number: phoneNumber || conversation.phone_number || null, chat_id: conversation.chat_id, body: body.slice(0, 4096), status: "QUEUED", idempotency_key: idempotencyKey, metadata: { source: "ai-liaison-runtime", generated_by: "authenticated-ai", conversation_id: conversation.id, source_message_id: sourceMessageId } }).select("id").single();
  if (error) throw error;
  const outbox = await admin.from("communication_outbox").insert({ message_id: message.id, session_id: null, chat_id: conversation.chat_id, status: "QUEUED" });
  if (outbox.error) throw outbox.error;
  return message.id;
}

function createLiaisonAgent() {
  const provider = new AIProviderService();
  const companyTruth = new CompanyTruthService();
  const fusion = new TruthFusionEngine({ provider, companyTruth });
  return new WhatsAppAgent({ responseGenerator: input => fusion.generate(input) });
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  try {
    const payload = await request.json();
    const { caller, user, internal } = await authenticate(request, payload);
    const body = clean(payload?.body);
    if (!body) return json({ error: "Message body is required." }, 400);
    const channel = channelOf(payload?.channel);
    if (internal && channel !== "WHATSAPP") return json({ error: "Internal worker requests are restricted to WhatsApp." }, 403);
    if (!internal && channel !== "PORTAL") return json({ error: "Browser AI requests are restricted to the client portal." }, 403);

    const chatId = nullable(payload?.chatId, 255) || `portal:${user.id}`;
    const phoneNumber = nullable(payload?.phoneNumber, 64);
    const matterId = nullable(payload?.matterId, 64);
    const messageId = nullable(payload?.messageId, 255);
    if (channel === "WHATSAPP" && !payload?.chatId) return json({ error: "WhatsApp conversations require chatId." }, 400);
    if (!internal && chatId !== `portal:${user.id}`) return json({ error: "Portal chat identity is server-controlled." }, 403);

    if (!internal) {
      const { data: accessStatus, error: accessError } = await caller.rpc("client_portal_access_status");
      if (accessError) throw accessError;
      if (String(Array.isArray(accessStatus) ? accessStatus[0] : accessStatus).toUpperCase() !== "APPROVED") return json({ error: "Client portal access is not approved." }, 403);
    }

    const matter = await verifyMatterOwnership(user.id, matterId);
    const operationalContext = await getOperationalContext(user.id, matterId);
    const conversation = await resolveConversation({ userId: user.id, chatId, phoneNumber, channel, matterId });
    if (conversation.matter_id && matterId && conversation.matter_id !== matterId) return json({ error: "Conversation is already linked to a different matter." }, 409);
    if (matterId && !conversation.matter_id) {
      const { error } = await admin.from("ai_conversations").update({ matter_id: matterId }).eq("id", conversation.id).eq("client_user_id", user.id);
      if (error) throw error;
      conversation.matter_id = matterId;
    }

    const message = await persistClientMessage(caller, conversation.id, body, messageId, nullable(payload?.intent, 100), nullable(payload?.serviceDomain, 100), internal);
    if (["HUMAN_ACTIVE","AI_ESCALATED"].includes(String(conversation.state || "").toUpperCase())) return json({ ok: true, conversation, message, aiMessage: null, result: { action: "ROUTE_TO_HUMAN", escalated: true }, next: { aiResponse: "HUMAN_REVIEW", whatsappTransport: "NONE", aiOutputIsServerControlled: true, engine: "WhatsAppAgent + TruthFusionEngine" } });

    const agentConversation = { chatId, phoneNumber: conversation.phone_number || phoneNumber, state: conversation.state || "AI_ACTIVE", facts: conversation.facts || {}, lastIntent: conversation.last_intent || null, lastService: conversation.last_service || null, messages: [] };
    const agent = createLiaisonAgent();
    const result = await agent.handleInbound({ chatId, phoneNumber: agentConversation.phoneNumber, body, messageId, user, matter, conversation: agentConversation });
    const aiReply = clean(result?.reply, 8192);
    let aiMessage = null; let transportMessageId = null; let intervention = null;
    if (aiReply) aiMessage = await persistAiMessage(conversation.id, aiReply, result);
    if (result?.action === "ESCALATE") intervention = await createIntervention(conversation, user.id, result, matterId);
    if (aiReply && channel === "WHATSAPP" && result?.action === "RESPOND") transportMessageId = await queueWhatsAppAiReply({ userId: user.id, conversation, body: aiReply, phoneNumber, matterId, sourceMessageId: messageId });
    const { data: refreshed, error: refreshError } = await admin.from("ai_conversations").select("*").eq("id", conversation.id).single();
    if (refreshError) throw refreshError;
    return json({ ok: true, conversation: refreshed, message, aiMessage, intervention, transportMessageId, operationalContext, result: { action: result?.action ?? null, intent: result?.intent ?? null, servicePlan: result?.servicePlan ?? null, sales: result?.sales ?? null, escalated: result?.action === "ESCALATE", aiProvider: result?.aiProvider ?? null, aiModel: result?.aiModel ?? null, companySources: result?.companySources ?? [] }, next: { aiResponse: aiMessage ? "PERSISTED" : "NONE", whatsappTransport: transportMessageId ? "QUEUED_FOR_OPENWA" : "NONE", aiOutputIsServerControlled: true, engine: "WhatsAppAgent + TruthFusionEngine" } });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("AI liaison runtime failed", error);
    return json({ error: error instanceof Error ? error.message : "AI liaison runtime failed." }, 500);
  }
});
