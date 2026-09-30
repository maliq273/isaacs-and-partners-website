
/**
 * Isaacs & Partners — Hindsight Memory Adapter.
 *
 * Hindsight is a learned-memory layer, not the source of company truth.
 * Supabase live records, approved company knowledge and authorised human
 * instructions remain authoritative over anything recalled from Hindsight.
 */
const DEFAULT_API_URL = "https://api.hindsight.vectorize.io";
const DEFAULT_TENANT = "default";

function clean(value, max = 4000) {
    return String(value ?? "").trim().slice(0, max);
}
function slug(value, max = 120) {
    return clean(value, max).toLowerCase().replace(/[^a-z0-9:_-]+/g, "-").replace(/^-+|-+$/g, "");
}
function env(name, fallback = "") {
    if (typeof process !== "undefined" && process?.env) return process.env[name] || fallback;
    return fallback;
}

export default class HindsightMemoryService {
    constructor({ baseUrl = env("HINDSIGHT_API_URL", DEFAULT_API_URL), apiKey = env("HINDSIGHT_API_KEY"), tenant = env("HINDSIGHT_TENANT", DEFAULT_TENANT), enabled = env("HINDSIGHT_ENABLED", "true") !== "false", fetchImpl = globalThis.fetch } = {}) {
        this.baseUrl = clean(baseUrl).replace(/\/$/, "");
        this.apiKey = clean(apiKey, 1000);
        this.tenant = slug(tenant, 64) || DEFAULT_TENANT;
        this.enabled = Boolean(enabled && this.baseUrl && this.apiKey && typeof fetchImpl === "function");
        this.fetchImpl = fetchImpl;
    }

    bankId(scope, id = "default") {
        return "anthony:" + (slug(scope, 32) || "global") + ":" + (slug(id, 160) || "default");
    }

    async request(path, { method = "GET", body, signal } = {}) {
        if (!this.enabled) return null;
        const response = await this.fetchImpl(this.baseUrl + "/v1/" + this.tenant + "/" + path.replace(/^\//, ""), {
            method,
            signal,
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + this.apiKey },
            ...(body === undefined ? {} : { body: JSON.stringify(body) })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            const error = new Error("Hindsight " + method + " " + path + " failed: " + (payload?.detail?.message || payload?.detail || response.status));
            error.status = response.status;
            throw error;
        }
        return payload;
    }

    async ensureBank(bankId, { mission, observationsMission } = {}) {
        if (!this.enabled) return null;
        await this.request("banks/" + encodeURIComponent(bankId), { method: "PUT", body: {} }).catch(error => {
            if (![409, 422].includes(Number(error?.status))) throw error;
        });
        return this.request("banks/" + encodeURIComponent(bankId) + "/config", {
            method: "PATCH",
            body: {
                updates: {
                    retain_mission: mission || "Retain only durable, reusable facts, preferences, decisions and interaction outcomes. Never treat memory as company policy or authoritative legal or operational truth. Ignore secrets and transient chatter.",
                    observations_mission: observationsMission || "Consolidate recurring, evidence-backed patterns. Preserve uncertainty and do not turn guesses into facts.",
                    memory_defense: { enabled: true, rules: [{ on: "sensitive_data", action: "redact" }] }
                }
            }
        });
    }

    async recall(bankId, query, { maxTokens = 900, budget = "low", tags, signal } = {}) {
        if (!this.enabled || !bankId || !clean(query)) return { results: [], disabled: !this.enabled };
        try {
            return await this.request("banks/" + encodeURIComponent(bankId) + "/memories/recall", {
                method: "POST",
                signal,
                body: { query: clean(query, 3000), budget, max_tokens: maxTokens, ...(Array.isArray(tags) && tags.length ? { tags, tags_match: "any" } : {}) }
            }) || { results: [] };
        } catch (error) {
            return { results: [], degraded: true, error: clean(error?.message, 500) };
        }
    }

    async recallForAgent({ query, actorBank, globalBank, maxTokens = 900 } = {}) {
        if (!this.enabled) return { enabled: false, memories: [] };
        const [actor, global] = await Promise.all([
            actorBank ? this.recall(actorBank, query, { maxTokens }) : { results: [] },
            globalBank ? this.recall(globalBank, query, { maxTokens: Math.floor(maxTokens / 2) }) : { results: [] }
        ]);
        return {
            enabled: true,
            degraded: Boolean(actor?.degraded || global?.degraded),
            memories: [
                ...(actor?.results || []).map(item => ({ ...item, memoryScope: "ACTOR" })),
                ...(global?.results || []).map(item => ({ ...item, memoryScope: "GLOBAL_LEARNED" }))
            ].slice(0, 16)
        };
    }

    async retain(bankId, content, { context = "Anthony interaction learning", documentId, tags = ["source:anthony", "memory:learned"], metadata = {}, timestamp = new Date().toISOString(), signal } = {}) {
        if (!this.enabled || !bankId || !clean(content)) return { disabled: !this.enabled };
        try {
            return await this.request("banks/" + encodeURIComponent(bankId) + "/memories", {
                method: "POST",
                signal,
                body: {
                    items: [{
                        content: clean(content, 6000),
                        context: clean(context, 500),
                        timestamp,
                        metadata: Object.fromEntries(Object.entries(metadata || {}).map(([k, v]) => [k, clean(v, 500)])),
                        ...(documentId ? { document_id: clean(documentId, 255) } : {}),
                        tags
                    }],
                    async: false
                }
            });
        } catch (error) {
            return { degraded: true, error: clean(error?.message, 500) };
        }
    }
}
export { clean as cleanHindsightValue, slug as hindsightSlug };
