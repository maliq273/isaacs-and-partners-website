/**
 * Isaacs & Partners — General AI Provider
 *
 * Server-side adapter for ChatGPT-style / Gemini-style conversational models.
 * No API key is ever exposed to the browser.
 *
 * Configuration (Supabase Edge Function secrets):
 *   AI_PROVIDER=openai | gemini
 *   OPENAI_API_KEY=...
 *   OPENAI_MODEL=gpt-4.1-mini
 *   GEMINI_API_KEY=...
 *   GEMINI_MODEL=gemini-2.5-flash
 */

const env = (name) => globalThis.Deno?.env?.get(name) ?? undefined;

function clean(value, max = 12000) {
    return String(value ?? "").trim().slice(0, max);
}

function extractOpenAIText(data) {
    if (typeof data?.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
    const output = Array.isArray(data?.output) ? data.output : [];
    const parts = [];
    for (const item of output) {
        for (const content of Array.isArray(item?.content) ? item.content : []) {
            if (typeof content?.text === "string") parts.push(content.text);
        }
    }
    return parts.join("\n").trim();
}

function extractGeminiText(data) {
    const parts = data?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return "";
    return parts.map((part) => typeof part?.text === "string" ? part.text : "").join("").trim();
}

export default class AIProviderService {
    constructor({
        provider = env("AI_PROVIDER") || "openai",
        openAIKey = env("OPENAI_API_KEY"),
        openAIModel = env("OPENAI_MODEL") || "gpt-4.1-mini",
        geminiKey = env("GEMINI_API_KEY"),
        geminiModel = env("GEMINI_MODEL") || "gemini-2.5-flash",
        fetchImpl = globalThis.fetch
    } = {}) {
        this.provider = String(provider || "openai").trim().toLowerCase();
        if (!["openai", "gemini"].includes(this.provider)) throw new Error("AI_PROVIDER must be openai or gemini.");
        this.openAIKey = clean(openAIKey, 512);
        this.openAIModel = clean(openAIModel, 128);
        this.geminiKey = clean(geminiKey, 512);
        this.geminiModel = clean(geminiModel, 128);
        this.fetch = fetchImpl;
    }

    isConfigured() {
        return this.provider === "gemini" ? Boolean(this.geminiKey) : Boolean(this.openAIKey);
    }

    getProviderName() {
        return this.provider === "gemini" ? "GEMINI" : "OPENAI";
    }

    async generate({ system, user, temperature = 0.2, maxOutputTokens = 1800 } = {}) {
        const systemText = clean(system, 30000);
        const userText = clean(user, 16000);
        if (!systemText || !userText) throw new Error("AI provider requires system and user prompts.");
        if (!this.isConfigured()) return null;
        if (typeof this.fetch !== "function") throw new Error("AI provider fetch implementation is unavailable.");
        return this.provider === "gemini"
            ? this.generateGemini({ system: systemText, user: userText, temperature, maxOutputTokens })
            : this.generateOpenAI({ system: systemText, user: userText, temperature, maxOutputTokens });
    }

    async generateOpenAI({ system, user, temperature, maxOutputTokens }) {
        const response = await this.fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: { Authorization: `Bearer ${this.openAIKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: this.openAIModel, instructions: system, input: user, temperature, max_output_tokens: maxOutputTokens })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(`OpenAI provider error (${response.status}): ${clean(data?.error?.message || "request failed", 500)}`);
        const text = extractOpenAIText(data);
        if (!text) throw new Error("OpenAI provider returned no text.");
        return { text, provider: "OPENAI", model: this.openAIModel };
    }

    async generateGemini({ system, user, temperature, maxOutputTokens }) {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.geminiModel)}:generateContent?key=${encodeURIComponent(this.geminiKey)}`;
        const response = await this.fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: system }] },
                contents: [{ role: "user", parts: [{ text: user }] }],
                generationConfig: { temperature, maxOutputTokens }
            })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(`Gemini provider error (${response.status}): ${clean(data?.error?.message || "request failed", 500)}`);
        const text = extractGeminiText(data);
        if (!text) throw new Error("Gemini provider returned no text.");
        return { text, provider: "GEMINI", model: this.geminiModel };
    }
}

export { extractOpenAIText, extractGeminiText };
