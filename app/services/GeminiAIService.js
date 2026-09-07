/**
 * Isaacs & Partners — Gemini AI Service
 *
 * Dedicated Gemini 2.5 Flash / Pro model management layer for Isaacs & Partners.
 * Interfaces server-side with Gemini API via AIProviderService and TruthFusionEngine.
 * Never exposes API keys or internal credentials to the browser.
 */

import AIProviderService from "../ai/providers/AIProviderService.js";
import CompanyTruthService from "../ai/CompanyTruthService.js";
import TruthFusionEngine from "../ai/TruthFusionEngine.js";

class GeminiAIService {
    constructor() {
        this.provider = new AIProviderService({ provider: "gemini" });
        this.companyTruth = new CompanyTruthService();
        this.fusionEngine = new TruthFusionEngine({
            provider: this.provider,
            companyTruth: this.companyTruth
        });
    }

    async generateResponse({ body, context = {}, userId = null, matter = null, operationalContext = null }) {
        try {
            const input = {
                body: String(body || "").trim(),
                user: userId ? { id: userId } : null,
                matter,
                operationalContext,
                conversation: context
            };

            const result = await this.fusionEngine.generate(input);
            return {
                ok: true,
                reply: result.reply,
                action: result.action || "RESPOND",
                intent: result.intent || null,
                servicePlan: result.servicePlan || null,
                escalated: result.action === "ESCALATE",
                provider: result.aiProvider || "GEMINI",
                model: result.aiModel || "gemini-2.5-flash",
                companySources: result.companySources || []
            };
        } catch (error) {
            console.error("[GeminiAIService] Response generation failed:", error);
            return {
                ok: false,
                reply: "I am currently unable to process your request. An authorised team member will follow up shortly.",
                error: error.message
            };
        }
    }
}

export const geminiAIService = new GeminiAIService();
export default geminiAIService;
