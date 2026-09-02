/**
 * Isaacs & Partners — Service Intelligence Engine
 *
 * Converts a customer service request into a governed AI workflow and pricing
 * instruction set. This is intentionally provider-neutral: live web research,
 * document OCR and privileged persistence are performed by trusted server-side
 * workers, while this engine remains deterministic and auditable.
 */

import WORKERS, { getServiceWorkers } from "./ServiceWorkerRegistry.js";

const DOMAIN_ALIASES = Object.freeze({
    IMMIGRATION: "IMMIGRATION",
    "IMMIGRATION SERVICES": "IMMIGRATION",
    "HR & INDUSTRIAL RELATIONS": "HR_IR",
    HR: "HR_IR",
    IR: "HR_IR",
    LABOUR: "HR_IR",
    "BUSINESS COMPLIANCE": "BUSINESS_COMPLIANCE",
    BUSINESS: "BUSINESS_COMPLIANCE",
    "LEGAL SERVICES": "LEGAL",
    LEGAL: "LEGAL"
});

const IMMIGRATION_SPECIAL_BILLING = new Set([
    "section-22-applications",
    "section-24-applications",
    "visa-appeals"
]);

export default class ServiceIntelligenceEngine {
    constructor({ serviceCatalog = null, pricingPolicy = null } = {}) {
        this.serviceCatalog = serviceCatalog;
        this.pricingPolicy = pricingPolicy;
    }

    normaliseDomain(value) {
        const key = String(value || "").trim().toUpperCase();
        return DOMAIN_ALIASES[key] || key || "OTHER";
    }

    resolveService({ domain, serviceId, serviceName } = {}) {
        const normalisedDomain = this.normaliseDomain(domain);
        const target = String(serviceId || serviceName || "").trim().toLowerCase();

        if (!this.serviceCatalog || !Array.isArray(this.serviceCatalog.departments)) {
            return { domain: normalisedDomain, service: target || null };
        }

        const department = this.serviceCatalog.departments.find((item) => {
            const itemDomain = this.normaliseDomain(item.name || item.id);
            return itemDomain === normalisedDomain || String(item.id).toLowerCase() === String(domain || "").toLowerCase();
        });

        const service = department?.services?.find((item) =>
            String(item.id).toLowerCase() === target || String(item.name).toLowerCase() === target
        );

        return {
            domain: normalisedDomain,
            department: department || null,
            service: service || (target ? { id: target, name: serviceName || serviceId } : null)
        };
    }

    buildPlan({ domain, serviceId, serviceName, clientType = "INDIVIDUAL", facts = {} } = {}) {
        const resolved = this.resolveService({ domain, serviceId, serviceName });
        const service = resolved.service;
        const normalisedDomain = resolved.domain;
        const serviceKey = String(service?.id || "").toLowerCase();

        const workers = getServiceWorkers(normalisedDomain).map((worker) => worker.id);
        const humanRequired = normalisedDomain === "HR_IR" || normalisedDomain === "LEGAL" ||
            (normalisedDomain === "IMMIGRATION" && Boolean(service));

        const plan = {
            version: "1.0.0",
            clientType,
            domain: normalisedDomain,
            service: service ? { id: service.id, name: service.name } : null,
            workers,
            humanRequired,
            stages: [],
            pricing: this.getPricingInstruction(normalisedDomain, serviceKey, facts),
            safeguards: [
                "AI output is advisory unless explicitly marked deterministic.",
                "No binding legal or immigration quote is issued by AI.",
                "Authority fees are separated from professional fees.",
                "Human approvals are recorded before gated work proceeds.",
                "All document processing uses the trusted private-document pipeline."
            ]
        };

        if (normalisedDomain === "IMMIGRATION") {
            plan.stages = [
                "QUALIFICATION",
                "CURRENT_REGULATORY_RESEARCH",
                "DOCUMENT_COLLECTION",
                "AI_DOCUMENT_PRECHECK",
                "PRELIMINARY_COST_ESTIMATE",
                "STAFF_QUOTE",
                "TERMS_ACCEPTANCE_AND_50_PERCENT_DEPOSIT",
                "APPLICATION_PREPARATION",
                "QUALITY_CONTROL",
                "FILES_READY",
                "50_PERCENT_FINAL_BALANCE",
                "VFS_OR_DHA_SUBMISSION",
                "STATUS_TRACKING"
            ];
            if (IMMIGRATION_SPECIAL_BILLING.has(serviceKey)) {
                plan.pricing.billingModel = "HOURLY_PLUS_PER_PAGE_PLUS_FLAT_SERVICE_RATE";
            }
        } else if (normalisedDomain === "HR_IR") {
            plan.stages = [
                "AI_INTAKE",
                "AI_TRIAGE",
                "HUMAN_ASSIGNMENT",
                "DOCUMENT_COLLECTION",
                "HUMAN_SERVICE_DELIVERY",
                "QUALITY_CONTROL",
                "CLIENT_UPDATE",
                "CLOSURE"
            ];
        } else if (normalisedDomain === "BUSINESS_COMPLIANCE") {
            plan.stages = [
                "AI_INTAKE",
                "SERVICE_SELECTION",
                "LIVE_MARKET_RESEARCH",
                "39_PERCENT_MARKUP",
                "RETainer_PACKAGE_ANALYSIS",
                "STAFF_PRICE_REVIEW",
                "QUOTE",
                "DELIVERY",
                "COMPLIANCE_TRACKING"
            ];
        } else if (normalisedDomain === "LEGAL") {
            plan.stages = [
                "AI_INTAKE",
                "FREE_30_MINUTE_AI_CONSULTATION",
                "SCOPE_CONFIRMATION",
                "HOURLY_AND_DOCUMENT_PRICING",
                "PAYMENT",
                "HUMAN_LEGAL_REVIEW",
                "DRAFT_OR_ADVICE",
                "QUALITY_CONTROL",
                "DELIVERY"
            ];
        } else {
            plan.stages = ["INTAKE", "TRIAGE", "HUMAN_REVIEW", "DELIVERY"];
        }

        return plan;
    }

    getPricingInstruction(domain, serviceId, facts = {}) {
        if (domain === "LEGAL") {
            return {
                model: "HOURLY_PLUS_PER_DOCUMENT",
                paidConsultation: 1250,
                vat: "EXCLUDED",
                freeAiConsultationMinutes: 30,
                bindingRateSource: "SERVICE_INVENTORY"
            };
        }

        if (domain === "HR_IR") {
            return {
                model: "HUMAN_ASSISTANCE",
                payrollOutsourcingPercentOfMonthlySalary: 12.5,
                temporaryStaffingPercentOfHourlyRate: 23.5,
                hearingRepresentationHourly: 400,
                suppliedDocumentFee: 150,
                bindingRateSource: "SERVICE_INVENTORY"
            };
        }

        if (domain === "BUSINESS_COMPLIANCE") {
            const itemCount = Number(facts.selectedItemCount || 0);
            return {
                model: itemCount >= 3 ? "RETAINER_OR_RECOMMENDED_PACKAGE" : "MARKET_RESEARCH_PLUS_MARKUP",
                marketMarkupPercent: 39,
                monthlyRetainer: 1250,
                baseIncludedItems: 3,
                selectedItemCount: itemCount,
                staffRecommendationRequired: true
            };
        }

        if (domain === "IMMIGRATION") {
            return {
                model: IMMIGRATION_SPECIAL_BILLING.has(serviceId)
                    ? "HOURLY_PLUS_PER_PAGE_PLUS_FLAT_SERVICE_RATE"
                    : "STAFF_QUOTE_AFTER_AI_ESTIMATE",
                depositPercent: 50,
                finalBalancePercent: 50,
                finalBalanceTrigger: "FILES_READY_FOR_VFS_OR_DHA",
                authorityFeesExcluded: true,
                estimateIsNonBinding: true,
                source: "CURRENT_REGULATORY_AND_MARKET_RESEARCH"
            };
        }

        return { model: "STAFF_DEFINED", bindingRateSource: "SERVICE_INVENTORY" };
    }

    validatePlan(plan) {
        if (!plan || !Array.isArray(plan.workers) || !Array.isArray(plan.stages)) {
            throw new TypeError("Invalid service intelligence plan.");
        }
        const unknown = plan.workers.filter((id) => !WORKERS[id]);
        if (unknown.length) {
            throw new Error(`Unknown service worker(s): ${unknown.join(", ")}`);
        }
        return true;
    }
}
