import assert from "node:assert/strict";
import TruthFusionEngine from "../ai/TruthFusionEngine.js";
import AIProviderService from "../ai/providers/AIProviderService.js";

const fakeCompanyTruth = {
    buildContext(query) {
        assert.match(query, /immigration/i);
        return {
            sourceHierarchy: ["SUPER_ADMIN_INSTRUCTION", "LIVE_CLIENT_AND_MATTER_DATA", "COMPANY_POLICY", "COMPANY_KNOWLEDGE", "GENERAL_MODEL_KNOWLEDGE"],
            sources: [{ id: "pricing", name: "Company Pricing", authority: "COMPANY_POLICY" }],
            relevant: [{ sourceId: "pricing", sourceName: "Company Pricing", authority: "COMPANY_POLICY", score: 3, text: "Professional fee is R12,500." }]
        };
    }
};

const fakeProvider = {
    async generate({ system, user }) {
        assert.match(system, /Isaacs & Partners AI Liaison/);
        assert.match(system, /Professional fee is R12,500/);
        assert.match(user, /immigration/i);
        return { text: "The current Isaacs & Partners professional fee is R12,500.", provider: "TEST", model: "test-model" };
    }
};

const fusion = new TruthFusionEngine({ provider: fakeProvider, companyTruth: fakeCompanyTruth });
const result = await fusion.generate({ body: "I need help with immigration", intent: { intent: "UNKNOWN" } });
assert.equal(result.text, "The current Isaacs & Partners professional fee is R12,500.");
assert.deepEqual(result.companySources, ["pricing"]);

const provider = new AIProviderService({ provider: "openai", openAIKey: "", fetchImpl: async () => { throw new Error("network should not be called"); } });
assert.equal(provider.isConfigured(), false);

console.log("truth-fusion.test.js passed");
