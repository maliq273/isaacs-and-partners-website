/**
 * Isaacs & Partners — Company Truth Service
 *
 * Provides the AI with approved company knowledge before general-model
 * reasoning. The knowledge is bundled from the repository's reviewed
 * knowledgebase and pricing catalog; client/matter data is supplied separately
 * by the trusted server runtime.
 */

import immigration from "./../../knowledgebase/immigration.json" with { type: "json" };
import hr from "./../../knowledgebase/hr.json" with { type: "json" };
import labour from "./../../knowledgebase/labour.json" with { type: "json" };
import business from "./../../knowledgebase/business.json" with { type: "json" };
import contracts from "./../../knowledgebase/contracts.json" with { type: "json" };
import ccma from "./../../knowledgebase/ccma.json" with { type: "json" };
import mediation from "./../../knowledgebase/mediation.json" with { type: "json" };
import notary from "./../../knowledgebase/notary.json" with { type: "json" };
import servicePricing from "../../data/service-pricing.json" with { type: "json" };

const SOURCES = Object.freeze([
    { id: "company-service-pricing", name: "Isaacs & Partners Service Pricing", authority: "COMPANY_POLICY", data: servicePricing },
    { id: "company-immigration", name: "Isaacs & Partners Immigration Knowledgebase", authority: "COMPANY_KNOWLEDGE", data: immigration },
    { id: "company-hr", name: "Isaacs & Partners HR Knowledgebase", authority: "COMPANY_KNOWLEDGE", data: hr },
    { id: "company-labour", name: "Isaacs & Partners Labour Knowledgebase", authority: "COMPANY_KNOWLEDGE", data: labour },
    { id: "company-business", name: "Isaacs & Partners Business Compliance Knowledgebase", authority: "COMPANY_KNOWLEDGE", data: business },
    { id: "company-contracts", name: "Isaacs & Partners Contracts Knowledgebase", authority: "COMPANY_KNOWLEDGE", data: contracts },
    { id: "company-ccma", name: "Isaacs & Partners CCMA Knowledgebase", authority: "COMPANY_KNOWLEDGE", data: ccma },
    { id: "company-mediation", name: "Isaacs & Partners Mediation Knowledgebase", authority: "COMPANY_KNOWLEDGE", data: mediation },
    { id: "company-notary", name: "Isaacs & Partners Notary Knowledgebase", authority: "COMPANY_KNOWLEDGE", data: notary }
]);

function flatten(value, path = "", output = []) {
    if (value === null || value === undefined) return output;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        output.push(`${path}: ${String(value)}`);
        return output;
    }
    if (Array.isArray(value)) {
        value.forEach((item, index) => flatten(item, `${path}[${index}]`, output));
        return output;
    }
    Object.entries(value).forEach(([key, item]) => flatten(item, path ? `${path}.${key}` : key, output));
    return output;
}

function tokens(text) {
    return new Set(String(text || "").toLowerCase().match(/[a-z0-9][a-z0-9_-]{2,}/g) || []);
}

export default class CompanyTruthService {
    constructor({ sources = SOURCES } = {}) {
        this.sources = sources.map((source) => ({
            ...source,
            lines: flatten(source.data)
        }));
    }

    getSources() {
        return this.sources.map(({ id, name, authority }) => ({ id, name, authority }));
    }

    search(query, { limit = 18 } = {}) {
        const queryTokens = tokens(query);
        if (!queryTokens.size) return [];

        const matches = [];
        for (const source of this.sources) {
            for (const line of source.lines) {
                const lineTokens = tokens(line);
                let score = 0;
                for (const token of queryTokens) if (lineTokens.has(token)) score += 1;
                if (score > 0) {
                    matches.push({
                        sourceId: source.id,
                        sourceName: source.name,
                        authority: source.authority,
                        score,
                        text: line
                    });
                }
            }
        }

        return matches
            .sort((a, b) => b.score - a.score || a.sourceId.localeCompare(b.sourceId))
            .slice(0, limit);
    }

    buildContext(query, { limit = 18 } = {}) {
        const matches = this.search(query, { limit });
        return {
            sourceHierarchy: [
                "SUPER_ADMIN_INSTRUCTION",
                "LIVE_CLIENT_AND_MATTER_DATA",
                "COMPANY_POLICY",
                "COMPANY_KNOWLEDGE",
                "GENERAL_MODEL_KNOWLEDGE"
            ],
            sources: this.getSources(),
            relevant: matches
        };
    }
}

export { SOURCES };
