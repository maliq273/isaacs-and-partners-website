
/**
 * Hindsight adapter for Supabase Edge Functions.
 * Learned context only; Supabase/company truth remains authoritative.
 */
const API_URL = (Deno.env.get("HINDSIGHT_API_URL") || "https://api.hindsight.vectorize.io").replace(/\/$/, "");
const API_KEY = Deno.env.get("HINDSIGHT_API_KEY") || "";
const TENANT = (Deno.env.get("HINDSIGHT_TENANT") || "default").replace(/[^a-zA-Z0-9_-]/g, "");
const ENABLED = Deno.env.get("HINDSIGHT_ENABLED") !== "false" && Boolean(API_URL && API_KEY);

function clean(value: unknown, max = 4000) { return String(value ?? "").trim().slice(0, max); }
function memorySafe(value: unknown, max = 4000) {
  return clean(value, max)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "[REDACTED_PHONE]")
    .replace(/\b\d{10,}\b/g, "[REDACTED_NUMBER]")
    .replace(/\b[A-Z]{2,6}\d{5,12}\b/g, "[REDACTED_IDENTIFIER]");
}
function slug(value: unknown, max = 160) { return clean(value, max).toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, ""); }
function bank(scope: string, id: string | null | undefined) { return "anthony-" + (slug(scope, 32) || "global") + "-" + (slug(id || "default", 160) || "default"); }

async function request(path: string, init: RequestInit = {}) {
  if (!ENABLED) return null;
  const response = await fetch(API_URL + "/v1/" + TENANT + "/" + path.replace(/^\//, ""), {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + API_KEY, ...(init.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error("Hindsight request failed: " + response.status + " " + clean(payload?.detail?.message || payload?.detail, 500));
    (error as any).status = response.status;
    throw error;
  }
  return payload;
}

async function ensureBank(bankId: string) {
  if (!ENABLED) return { enabled: false };
  try {
    await request("banks/" + encodeURIComponent(bankId), { method: "PUT", body: "{}" });
  } catch (error) {
    if (![409, 422].includes(Number((error as any)?.status))) throw error;
  }
  await request("banks/" + encodeURIComponent(bankId) + "/config", {
    method: "PATCH",
    body: JSON.stringify({
      updates: {
        retain_mission: "Retain only durable, reusable facts, preferences, decisions and interaction outcomes. Never treat memory as company policy or authoritative legal or operational truth. Ignore secrets and transient chatter.",
        observations_mission: "Consolidate recurring, evidence-backed patterns. Preserve uncertainty and never turn guesses into facts.",
        memory_defense: { enabled: true, rules: [{ on: "sensitive_data", action: "redact" }] }
      }
    })
  });
  return { enabled: true, bankId };
}

async function recall(bankId: string, query: string, maxTokens = 700) {
  if (!ENABLED || !bankId || !clean(query)) return { results: [] };
  try {
    return await request("banks/" + encodeURIComponent(bankId) + "/memories/recall", {
      method: "POST",
      body: JSON.stringify({ query: memorySafe(query, 3000), budget: "low", max_tokens: maxTokens })
    }) || { results: [] };
  } catch (error) {
    console.warn("Hindsight recall degraded:", clean((error as Error)?.message, 500));
    return { results: [], degraded: true };
  }
}

async function retain(bankId: string, content: string, metadata: Record<string, string> = {}) {
  if (!ENABLED || !bankId || !clean(content)) return { skipped: true };
  try {
    return await request("banks/" + encodeURIComponent(bankId) + "/memories", {
      method: "POST",
      body: JSON.stringify({
        items: [{
          content: memorySafe(content, 6000),
          context: "Anthony durable interaction learning",
          timestamp: new Date().toISOString(),
          metadata: Object.fromEntries(Object.entries(metadata).map(([key, value]) => [key, clean(value, 500)])),
          tags: ["source:anthony", "memory:learned"]
        }],
        async: false
      })
    }) || {};
  } catch (error) {
    console.warn("Hindsight retain degraded:", clean((error as Error)?.message, 500));
    return { degraded: true };
  }
}

export function hindsightEnabled() { return ENABLED; }
export function hindsightBank(scope: string, id: string | null | undefined) { return bank(scope, id); }

export async function hindsightRecall({ actorBank, globalBank, query, maxTokens = 900 }: {
  actorBank?: string | null;
  globalBank?: string | null;
  query: string;
  maxTokens?: number;
}) {
  if (!ENABLED) return { enabled: false, memories: [] };
  const [actor, global] = await Promise.all([
    actorBank ? recall(actorBank, query, maxTokens) : { results: [] },
    globalBank ? recall(globalBank, query, Math.floor(maxTokens / 2)) : { results: [] }
  ]);
  return {
    enabled: true,
    degraded: Boolean(actor.degraded || global.degraded),
    memories: [
      ...(actor.results || []).map((item: any) => ({ ...item, memoryScope: "ACTOR" })),
      ...(global.results || []).map((item: any) => ({ ...item, memoryScope: "GLOBAL_LEARNED" }))
    ].slice(0, 16)
  };
}

export async function hindsightRetain({ bankId, content, metadata = {} }: {
  bankId: string;
  content: string;
  metadata?: Record<string, string>;
}) {
  if (!ENABLED) return { enabled: false };
  return retain(bankId, content, metadata);
}
