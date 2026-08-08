/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * knowledgebase.service.js
 * ============================================================
 *
 * LOCATION
 * app/services/knowledgebase.service.js
 *
 * PURPOSE
 * Legacy compatibility adapter.
 *
 * MAIN SERVICE
 * KnowledgeService.js
 * ============================================================
 */

import KnowledgeService
    from "./KnowledgeService.js";

const knowledgeService =
    new KnowledgeService();

export async function getKnowledge(
    category
) {

    return knowledgeService.getKnowledge(
        category
    );

}

export async function getRequiredDocuments(
    matter
) {

    return knowledgeService.getRequiredDocuments(
        matter
    );

}

export async function getVisaRequirements(
    visaType
) {

    return knowledgeService.getVisaRequirements(
        visaType
    );

}

export async function search(
    query,
    category
) {

    return knowledgeService.search(
        query,
        category
    );

}

export async function validateKnowledge() {

    return knowledgeService.validateKnowledge();

}


/*
 * ============================================================
 * FUTURE INSERT
 *
 * This adapter must never contain a second knowledge engine.
 *
 * KnowledgeService.js is the production authority.
 * ============================================================
 */

export default knowledgeService;
