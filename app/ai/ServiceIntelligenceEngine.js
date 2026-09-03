/**
 * Isaacs & Partners — Service Intelligence Engine
 *
 * Converts a customer service request into a governed AI workflow and pricing
 * instruction set. Live web research, document OCR and privileged persistence
 * remain trusted server-side responsibilities.
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

const MATTER_COMMERCIAL_RULE = Object.freeze({
    quoteRequired: true,
    depositPercent: 50,
    finalBalancePercent: 50,
    finalBalanceTrigger: "FILE_CLOSURE_BEFORE_SUBMISSION",
    thirdPartyFeesExcluded: true
});

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
        const isConsultation = Boolean(facts.isConsultation || facts.workflowType === "CONSULTATION");

        const humanRequired = normalisedDomain === "HR_IR" || normalisedDomain === "LEGAL" ||
            (normalisedDomain === "IMMIGRATION" && Boolean(service));

        const plan = {
            version: "1.1.0",
            clientType,
            domain: normalisedDomain,
            service: service ? { id: service.id, name: service.name } : null,
            workers,
            humanRequired,
            stages: [],
            commercial: this.getCommercialInstruction(normalisedDomain, { isConsultation }),
            pricing: this.getPricingInstruction(normalisedDomain, serviceKey, facts),
            safeguards: [
                "AI output is advisory unless explicitly marked deterministic.",
                "No binding legal or immigration quote is issued by AI.",
                "Authority and third-party fees are separated from professional fees.",
                "All substantive matters require a quote and 50 percent professional-fee deposit before file opening.",
                "The remaining 50 percent is due on file closure before submission where applicable.",
                "Human approvals are recorded before gated work proceeds.",
                "Payment gates use verified payment state rather than client assertions.",
                "All document processing uses the trusted private-document pipeline."
            ]
        };

        if (normalisedDomain === "IMMIGRATION") {
            plan.stages = isConsultation
                ? ["QUALIFICATION", "CONSULTATION_BOOKING", "PAYMENT_VERIFICATION", "CONSULTATION", "FEEDBACK", "MATTER_INFORMATION", "STAFF_QUOTE"]
                : [
                    "QUALIFICATION",
                    "CURRENT_REGULATORY_RESEARCH",
                    "DOCUMENT_COLLECTION",
                    "AI_DOCUMENT_PRECHECK",
                    "PRELIMINARY_COST_ESTIMATE",
                    "STAFF_QUOTE",
                    "QUOTE_ACCEPTANCE",
                    "50_PERCENT_DEPOSIT",
                    "PAYMENT_VERIFICATION",
                    "FILE_OPENING",
                    "APPLICATION_PREPARATION",
                    "QUALITY_CONTROL",
                    "FILES_READY",
                    "50_PERCENT_FINAL_BALANCE",
                    "FINAL_PAYMENT_VERIFICATION",
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
                "MATTER_INFORMATION",
                "STAFF_QUOTE",
                "QUOTE_ACCEPTANCE",
                "50_PERCENT_DEPOSIT",
                "PAYMENT_VERIFICATION",
                "FILE_OPENING",
                "HUMAN_SERVICE_DELIVERY",
                "QUALITY_CONTROL",
                "CLIENT_UPDATE",
                "50_PERCENT_FINAL_BALANCE",
                "FINAL_PAYMENT_VERIFICATION",
                "CLOSURE_OR_SUBMISSION"
            ];
        } else if (normalisedDomain === "BUSINESS_COMPLIANCE") {
            plan.stages = [
                "AI_INTAKE",
                "SERVICE_SELECTION",
                "LIVE_MARKET_RESEARCH",
                "STAFF_PRICE_REVIEW",
                "QUOTE",
                "QUOTE_ACCEPTANCE",
                "50_PERCENT_DEPOSIT",
                "PAYMENT_VERIFICATION",
                "FILE_OPENING",
                "DELIVERY",
                "QUALITY_CONTROL",
                "50_PERCENT_FINAL_BALANCE",
                "FINAL_PAYMENT_VERIFICATION",
                "COMPLIANCE_TRACKING_OR_CLOSURE"
            ];
        } else if (normalisedDomain === "LEGAL") {
            plan.stages = isConsultation
                ? ["AI_INTAKE", "CONSULTATION_BOOKING", "PAYMENT_VERIFICATION", "CONSULTATION", "FEEDBACK", "MATTER_INFORMATION", "STAFF_QUOTE"]
                : [
                    "AI_INTAKE",
                    "MATTER_INFORMATION",
                    "STAFF_QUOTE",
                    "QUOTE_ACCEPTANCE",
                    "50_PERCENT_DEPOSIT",
                    "PAYMENT_VERIFICATION",
                    "FILE_OPENING",
                    "HUMAN_LEGAL_REVIEW",
                    "DRAFT_OR_ADVICE",
                    "QUALITY_CONTROL",
                    "DELIVERY",
                    "50_PERCENT_FINAL_BALANCE",
                    "FINAL_PAYMENT_VERIFICATION",
                    "SUBMISSION_OR_CLOSURE"
                ];
        } else {
            plan.stages = ["INTAKE", "TRIAGE", "STAFF_QUOTE", "QUOTE_ACCEPTANCE", "50_PERCENT_DEPOSIT", "PAYMENT_VERIFICATION", "FILE_OPENING", "DELIVERY", "FINAL_BALANCE", "CLOSURE"];
        }

        return plan;
    }

    getCommercialInstruction(domain, { isConsultation = false } = {}) {
        if (isConsultation) {
            return {
                quoteRequired: false,
                consultationOnly: true,
                paymentGate: "CONSULTATION_PAYMENT_VERIFIED",
                thirdPartyFeesExcluded: true
            };
        }
        return {
            ...MATTER_COMMERCIAL_RULE,
            paymentGate: "50_PERCENT_DEPOSIT_VERIFIED_BEFORE_FILE_OPENING",
            finalPaymentGate: "50_PERCENT_FINAL_BALANCE_VERIFIED_BEFORE_SUBMISSION"
        };
    }

    getPricingInstruction(domain, serviceId, facts = {}) {
        if (domain === "LEGAL") {
            return {
                model: "STAFF_QUOTE_AFTER_INFORMATION",
                consultationFee: 1250,
                vat: "EXCLUDED",
                freeAiConsultationMinutes: 30,
                bindingRateSource: "SERVICE_INVENTORY",
                quoteRequiredForMatter: true,
                depositPercent: 50,
                finalBalancePercent: 50
            };
        }

        if (domain === "HR_IR") {
            return {
                model: "STAFF_QUOTE_AFTER_INFORMATION",
                payrollOutsourcingPercentOfMonthlySalary: 12.5,
                temporaryStaffingPercentOfHourlyRate: 23.5,
                hearingRepresentationHourly: 400,
                suppliedDocumentFee: 150,
                bindingRateSource: "SERVICE_INVENTORY",
                quoteRequiredForMatter: true,
                depositPercent: 50,
                finalBalancePercent: 50
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
                staffRecommendationRequired: true,
                quoteRequiredForMatter: true,
                depositPercent: 50,
                finalBalancePercent: 50
            };
        }

        if (domain === "IMMIGRATION") {
            return {
                model: IMMIGRATION_SPECIAL_BILLING.has(serviceId)
                    ? "STAFF_QUOTE_AFTER_AI_ESTIMATE"
                    : "STAFF_QUOTE_AFTER_AI_ESTIMATE",
                depositPercent: 50,
                finalBalancePercent: 50,
                finalBalanceTrigger: "FILE_CLOSURE_BEFORE_SUBMISSION",
                authorityFeesExcluded: true,
                thirdPartyFeesExcluded: true,
                estimateIsNonBinding: true,
                quoteRequiredForMatter: true,
                source: "CURRENT_REGULATORY_AND_MARKET_RESEARCH"
            };
        }

        return {
            model: "STAFF_DEFINED",
            bindingRateSource: "SERVICE_INVENTORY",
            quoteRequiredForMatter: true,
            depositPercent: 50,
            finalBalancePercent: 50,
            thirdPartyFeesExcluded: true
        };
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
