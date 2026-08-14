import {
    generateId,
    nowISO
} from "../functions/DatabaseFunctions.js";

/**
 * Only foundational metadata is seeded here.
 *
 * The substantive South African legal knowledgebase is loaded through
 * app/knowledgebase and its KnowledgeLoader/KnowledgeIndexer pipeline.
 *
 * This prevents the database seed from becoming a second, conflicting
 * source of legal authority.
 */

export const KNOWLEDGE_DOMAINS = [
    {
        id: generateId(),
        domain: "business",
        category: "legal_compliance",
        title: "Business Compliance",
        content:
            "Business registration, regulatory compliance, SARS-related business administration and corporate compliance knowledge domain.",
        source_type: "internal_domain",
        source_name:
            "Isaacs and Partners Knowledgebase",
        source_url: null,
        citation: null,
        source_date: null,
        effective_date: null,
        version: "1.0.0",
        jurisdiction: "South Africa",
        status: "active",
        authority_level: "domain",
        tags: JSON.stringify([
            "business",
            "compliance",
            "sars",
            "corporate"
        ]),
        metadata: JSON.stringify({
            sourceDirectory:
                "app/knowledgebase/business.json"
        }),
        created_at: nowISO(),
        updated_at: nowISO()
    },

    {
        id: generateId(),
        domain: "immigration",
        category: "immigration_law",
        title: "South African Immigration",
        content:
            "Immigration law, visa applications, permits, appeals and related administrative processes.",
        source_type: "internal_domain",
        source_name:
            "Isaacs and Partners Knowledgebase",
        source_url: null,
        citation: null,
        source_date: null,
        effective_date: null,
        version: "1.0.0",
        jurisdiction: "South Africa",
        status: "active",
        authority_level: "domain",
        tags: JSON.stringify([
            "immigration",
            "visa",
            "permit",
            "appeal"
        ]),
        metadata: JSON.stringify({
            sourceDirectory:
                "app/knowledgebase/immigration.json"
        }),
        created_at: nowISO(),
        updated_at: nowISO()
    },

    {
        id: generateId(),
        domain: "labour",
        category: "employment_law",
        title: "Labour and Employment",
        content:
            "South African labour, employment, workplace relations and disciplinary processes.",
        source_type: "internal_domain",
        source_name:
            "Isaacs and Partners Knowledgebase",
        source_url: null,
        citation: null,
        source_date: null,
        effective_date: null,
        version: "1.0.0",
        jurisdiction: "South Africa",
        status: "active",
        authority_level: "domain",
        tags: JSON.stringify([
            "labour",
            "employment",
            "disciplinary",
            "workplace"
        ]),
        metadata: JSON.stringify({
            sourceDirectory:
                "app/knowledgebase/labour.json"
        }),
        created_at: nowISO(),
        updated_at: nowISO()
    },

    {
        id: generateId(),
        domain: "ccma",
        category: "dispute_resolution",
        title: "CCMA",
        content:
            "CCMA processes, dispute resolution, conciliation, arbitration and related employment dispute procedures.",
        source_type: "internal_domain",
        source_name:
            "Isaacs and Partners Knowledgebase",
        source_url: null,
        citation: null,
        source_date: null,
        effective_date: null,
        version: "1.0.0",
        jurisdiction: "South Africa",
        status: "active",
        authority_level: "domain",
        tags: JSON.stringify([
            "ccma",
            "conciliation",
            "arbitration",
            "labour"
        ]),
        metadata: JSON.stringify({
            sourceDirectory:
                "app/knowledgebase/ccma.json"
        }),
        created_at: nowISO(),
        updated_at: nowISO()
    },

    {
        id: generateId(),
        domain: "contracts",
        category: "contract_law",
        title: "Contracts",
        content:
            "Contract drafting, review, contractual obligations, remedies and related legal principles.",
        source_type: "internal_domain",
        source_name:
            "Isaacs and Partners Knowledgebase",
        source_url: null,
        citation: null,
        source_date: null,
        effective_date: null,
        version: "1.0.0",
        jurisdiction: "South Africa",
        status: "active",
        authority_level: "domain",
        tags: JSON.stringify([
            "contracts",
            "agreements",
            "drafting",
            "breach"
        ]),
        metadata: JSON.stringify({
            sourceDirectory:
                "app/knowledgebase/contracts.json"
        }),
        created_at: nowISO(),
        updated_at: nowISO()
    },

    {
        id: generateId(),
        domain: "hr",
        category: "human_resources",
        title: "Human Resources",
        content:
            "Human resources management, workplace procedures, policies and employment administration.",
        source_type: "internal_domain",
        source_name:
            "Isaacs and Partners Knowledgebase",
        source_url: null,
        citation: null,
        source_date: null,
        effective_date: null,
        version: "1.0.0",
        jurisdiction: "South Africa",
        status: "active",
        authority_level: "domain",
        tags: JSON.stringify([
            "hr",
            "human_resources",
            "employees"
        ]),
        metadata: JSON.stringify({
            sourceDirectory:
                "app/knowledgebase/hr.json"
        }),
        created_at: nowISO(),
        updated_at: nowISO()
    },

    {
        id: generateId(),
        domain: "mediation",
        category: "dispute_resolution",
        title: "Mediation",
        content:
            "Mediation procedures, dispute resolution principles and settlement processes.",
        source_type: "internal_domain",
        source_name:
            "Isaacs and Partners Knowledgebase",
        source_url: null,
        citation: null,
        source_date: null,
        effective_date: null,
        version: "1.0.0",
        jurisdiction: "South Africa",
        status: "active",
        authority_level: "domain",
        tags: JSON.stringify([
            "mediation",
            "settlement",
            "dispute_resolution"
        ]),
        metadata: JSON.stringify({
            sourceDirectory:
                "app/knowledgebase/mediation.json"
        }),
        created_at: nowISO(),
        updated_at: nowISO()
    },

    {
        id: generateId(),
        domain: "notary",
        category: "notarial_practice",
        title: "Notarial Practice",
        content:
            "Notarial documents, authentication, certification and related notarial practice.",
        source_type: "internal_domain",
        source_name:
            "Isaacs and Partners Knowledgebase",
        source_url: null,
        citation: null,
        source_date: null,
        effective_date: null,
        version: "1.0.0",
        jurisdiction: "South Africa",
        status: "active",
        authority_level: "domain",
        tags: JSON.stringify([
            "notary",
            "notarial",
            "authentication",
            "certification"
        ]),
        metadata: JSON.stringify({
            sourceDirectory:
                "app/knowledgebase/notary.json"
        }),
        created_at: nowISO(),
        updated_at: nowISO()
    }
];

export default KNOWLEDGE_DOMAINS;
