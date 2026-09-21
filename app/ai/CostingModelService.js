/**
 * Isaacs & Partners — Costing Model Service
 *
 * Authoritative compiler for service quotes and pricing based on
 * app/data/service-pricing.json and app/data/services.json.
 *
 * Implements the firm's commercial policy:
 * - 50% deposit required prior to file opening.
 * - 50% balance payable upon file readiness before VFS/DHA or statutory submission.
 * - Third-party and statutory authority fees (DHA, VFS, CIPC, court) are strictly excluded.
 * - All compiled quotes must be submitted for Super Admin human approval
 *   with Yes/No verification buttons before sending to the client.
 */

import servicePricing from "../data/service-pricing.json" with { type: "json" };
import servicesCatalog from "../data/services.json" with { type: "json" };

const DOMAIN_MAP = Object.freeze({
    immigration: "IMMIGRATION",
    "immigration services": "IMMIGRATION",
    "hr-industrial-relations": "HR_IR",
    "hr & industrial relations": "HR_IR",
    hr: "HR_IR",
    ir: "HR_IR",
    labour: "HR_IR",
    "business-compliance": "BUSINESS_COMPLIANCE",
    "business compliance": "BUSINESS_COMPLIANCE",
    business: "BUSINESS_COMPLIANCE",
    legal: "LEGAL",
    "legal services": "LEGAL"
});

const DEFAULT_CURRENCY = "ZAR";

export default class CostingModelService {
    constructor({ pricing = servicePricing, catalog = servicesCatalog } = {}) {
        this.pricing = pricing;
        this.catalog = catalog;
    }

    /**
     * Detects if an inbound message or intent is asking about pricing or quotes.
     */
    isPricingOrQuoteInquiry(text = "", intent = null, servicePlan = null) {
        const cleanIntent = String(intent || "").toUpperCase();
        if (cleanIntent === "PRICING" || cleanIntent === "QUOTE") return true;

        const body = String(text || "").toLowerCase();
        const pricingKeywords = [
            "how much", "price", "pricing", "cost", "costing", "fee", "fees",
            "quote", "quotation", "rates", "rate", "retainer", "deposit",
            "estimate", "charge", "charges", "zar", "rand", "r1", "r2", "r3", "r4", "r5", "r6"
        ];

        const hasKeyword = pricingKeywords.some(kw => body.includes(kw));
        if (hasKeyword) return true;

        if (servicePlan?.commercial?.quoteRequired && /cost|price|quote|fee/i.test(body)) {
            return true;
        }

        return false;
    }

    /**
     * Resolves domain name to uppercase internal key.
     */
    normaliseDomain(domain) {
        const key = String(domain || "").trim().toLowerCase();
        return DOMAIN_MAP[key] || String(domain || "GENERAL").toUpperCase();
    }

    /**
     * Finds service definition from services catalog.
     */
    findService(serviceId, serviceName, domain) {
        const normDomain = this.normaliseDomain(domain);
        const searchId = String(serviceId || "").toLowerCase();
        const searchName = String(serviceName || "").toLowerCase();

        const departments = this.catalog?.departments || [];
        for (const dept of departments) {
            const deptDomain = this.normaliseDomain(dept.id || dept.name);
            if (normDomain !== "GENERAL" && deptDomain !== normDomain) continue;

            const match = dept.services?.find(s =>
                (searchId && String(s.id).toLowerCase() === searchId) ||
                (searchName && String(s.name).toLowerCase() === searchName)
            );
            if (match) return { ...match, departmentId: dept.id, departmentName: dept.name, domain: deptDomain };
        }

        return null;
    }

    /**
     * Compiles an exact quote based on the costing model.
     */
    compilePriceQuote({ domain = null, serviceId = null, serviceName = null, message = "", facts = {}, clientType = "INDIVIDUAL" } = {}) {
        const normDomain = this.normaliseDomain(domain);
        const resolvedService = this.findService(serviceId, serviceName, normDomain);

        const targetServiceId = resolvedService?.id || String(serviceId || "").toLowerCase();
        const targetServiceName = resolvedService?.name || serviceName || this.inferServiceName(message, normDomain) || "Professional Consultation";
        const effectiveDomain = resolvedService?.domain || normDomain;

        let estimatedTotal = 0;
        let depositPercent = 50;
        let finalBalancePercent = 50;
        let breakdown = [];
        let specialBillingModel = null;
        let termsNote = "50% deposit required prior to file opening; 50% balance due upon file readiness prior to submission. Authority and third-party fees are excluded.";
        let authorityFeesExcluded = true;

        if (effectiveDomain === "IMMIGRATION") {
            const specialBilling = this.pricing?.domains?.immigration?.specialBilling || {};
            const isSpecial = Boolean(specialBilling[targetServiceId]);

            if (isSpecial) {
                specialBillingModel = "HOURLY_PLUS_PER_PAGE_PLUS_SERVICE_FLAT_RATE";
                const baseServiceRate = 4500;
                const estimatedHours = 2;
                const hourlyRate = 650;
                const pageRate = 35;
                const estimatedPages = 20;
                const draftingFee = estimatedHours * hourlyRate; // 1300
                const docFee = estimatedPages * pageRate; // 700
                estimatedTotal = baseServiceRate + draftingFee + docFee; // 6500

                breakdown = [
                    { item: "Flat Professional Service Rate", amount: baseServiceRate },
                    { item: `Legal Drafting & Submissions (${estimatedHours} hrs @ R${hourlyRate}/hr)`, amount: draftingFee },
                    { item: `Document Ingestion & File Compilation (${estimatedPages} pages @ R${pageRate}/pg)`, amount: docFee }
                ];
            } else if (targetServiceId === "permanent-residence") {
                estimatedTotal = 8500;
                breakdown = [{ item: "Permanent Residence Application Professional Fee", amount: 8500 }];
            } else if (targetServiceId === "citizenship-applications") {
                estimatedTotal = 7500;
                breakdown = [{ item: "Citizenship Application Professional Fee", amount: 7500 }];
            } else {
                // Standard visa application (work, critical skills, spousal, study, relative, etc.)
                estimatedTotal = 6500;
                breakdown = [{ item: `${targetServiceName} Professional Service Fee`, amount: 6500 }];
            }

            termsNote = "50% deposit required before file opening. 50% balance payable upon file completion before VFS or DHA submission. Department of Home Affairs and VFS Global statutory fees are strictly excluded.";
        } else if (effectiveDomain === "LEGAL") {
            const legalRates = this.pricing?.domains?.legal?.rates || {};
            const isConsultation = targetServiceId === "legal-advice" || facts.isConsultation || /consultation|advice/i.test(message);

            if (isConsultation && !/contract|draft|opinion|court|dispute/i.test(message)) {
                estimatedTotal = Number(legalRates.paidConsultation || 1250);
                depositPercent = 100;
                finalBalancePercent = 0;
                breakdown = [
                    { item: "Initial 30-min AI Scoping Consultation", amount: 0 },
                    { item: "Comprehensive Formal Legal Consultation", amount: estimatedTotal }
                ];
                termsNote = "100% consultation fee payable upon booking. Includes initial scoping and formal review.";
            } else if (/contract-drafting|commercial-agreements/i.test(targetServiceId)) {
                estimatedTotal = 3500;
                breakdown = [{ item: "Commercial Contract Drafting & Terms Structuring", amount: 3500 }];
            } else if (/contract-vetting/i.test(targetServiceId)) {
                estimatedTotal = 2250;
                breakdown = [{ item: "Contract Review, Vetting & Risk Analysis", amount: 2250 }];
            } else if (/legal-opinions/i.test(targetServiceId)) {
                estimatedTotal = 4500;
                breakdown = [{ item: "Written Legal Opinion & Counsel Research", amount: 4500 }];
            } else if (/affidavits|power-of-attorney/i.test(targetServiceId)) {
                estimatedTotal = 950;
                breakdown = [{ item: "Statutory Drafting & Attestation Preparation", amount: 950 }];
            } else {
                estimatedTotal = 2850;
                breakdown = [{ item: `${targetServiceName} Professional Legal Service`, amount: 2850 }];
            }
        } else if (effectiveDomain === "HR_IR") {
            const hrRates = this.pricing?.domains?.["hr-industrial-relations"]?.rates || {};
            const hearingRate = Number(hrRates.hearingRepresentationHourly || 400);
            const docFee = Number(hrRates.documentSupplied || 150);

            if (/disciplinary|grievance|chairperson/i.test(targetServiceId)) {
                const hours = 4;
                const hearingTotal = hours * hearingRate; // 1600
                estimatedTotal = hearingTotal + docFee; // 1750
                breakdown = [
                    { item: `Hearing Representation (${hours} hrs @ R${hearingRate}/hr)`, amount: hearingTotal },
                    { item: "Formal Hearing Documentation & Notice", amount: docFee }
                ];
            } else if (/ccma|bargaining/i.test(targetServiceId)) {
                const hours = 6;
                const repTotal = hours * hearingRate; // 2400
                const prep = 600;
                estimatedTotal = repTotal + prep; // 3000
                breakdown = [
                    { item: `CCMA / Council Attendance (${hours} hrs @ R${hearingRate}/hr)`, amount: repTotal },
                    { item: "Bundle Preparation & Conciliation Scoping", amount: prep }
                ];
            } else if (/employment-contracts/i.test(targetServiceId)) {
                estimatedTotal = 1500;
                breakdown = [{ item: "Employment Contract Package & Policies", amount: 1500 }];
            } else if (/payroll/i.test(targetServiceId)) {
                estimatedTotal = 1850;
                breakdown = [{ item: "Monthly Payroll Advisory & Compliance Setup", amount: 1850 }];
            } else {
                estimatedTotal = 2500;
                breakdown = [{ item: `${targetServiceName} Advisory Service`, amount: 2500 }];
            }
            termsNote = "50% deposit required prior to representation/drafting; 50% balance due upon completion.";
        } else if (effectiveDomain === "BUSINESS_COMPLIANCE") {
            const retainerMonthly = Number(this.pricing?.domains?.["business-compliance"]?.retainer?.monthlyAmount || 1250);

            if (/retainer/i.test(message) || Number(facts.selectedItemCount || 0) >= 3) {
                estimatedTotal = retainerMonthly;
                depositPercent = 100;
                finalBalancePercent = 0;
                breakdown = [
                    { item: "Monthly Business Compliance Retainer (Includes 3 Standard Items)", amount: retainerMonthly }
                ];
                termsNote = "Retainer billed monthly in advance. Covers up to 3 standard CIPC/SARS compliance filings.";
            } else if (/company-registration/i.test(targetServiceId)) {
                estimatedTotal = 1250;
                breakdown = [
                    { item: "CIPC Company Registration & Name Reservation", amount: 850 },
                    { item: "SARS Tax Registration & Compliance Notice (39% markup applied)", amount: 400 }
                ];
            } else if (/vat-registration/i.test(targetServiceId)) {
                estimatedTotal = 1650;
                breakdown = [{ item: "SARS VAT Registration & Documentation Filing", amount: 1650 }];
            } else if (/annual-returns|tax-clearance/i.test(targetServiceId)) {
                estimatedTotal = 850;
                breakdown = [{ item: "Statutory Compliance Lodgement & Certificate", amount: 850 }];
            } else {
                estimatedTotal = 1250;
                breakdown = [{ item: `${targetServiceName} Compliance Package`, amount: 1250 }];
            }
        } else {
            // General or other services
            estimatedTotal = 2500;
            breakdown = [{ item: `${targetServiceName} Professional Service`, amount: 2500 }];
        }

        const depositAmount = (estimatedTotal * depositPercent) / 100;
        const finalBalanceAmount = (estimatedTotal * finalBalancePercent) / 100;

        const formattedTotal = `R${estimatedTotal.toLocaleString("en-ZA")}.00`;
        const formattedDeposit = `R${depositAmount.toLocaleString("en-ZA")}.00`;
        const formattedBalance = `R${finalBalanceAmount.toLocaleString("en-ZA")}.00`;

        // Client-facing quotation message (sent ONLY after Super Admin approval)
        const clientQuoteText = [
            `📋 *Quotation Estimate from Isaacs & Partners*`,
            ``,
            `*Service:* ${targetServiceName} (${effectiveDomain.replace(/_/g, " ")})`,
            `*Estimated Professional Fee:* ${formattedTotal} (excl. VAT)`,
            breakdown.length > 1 ? `*Breakdown:*\n${breakdown.map(b => `• ${b.item}: R${b.amount.toLocaleString("en-ZA")}.00`).join("\n")}` : null,
            `*Commercial Payment Terms:*`,
            `• *${depositPercent}% Initial Deposit:* ${formattedDeposit} (payable prior to file opening)`,
            finalBalancePercent > 0 ? `• *${finalBalancePercent}% Final Balance:* ${formattedBalance} (payable upon file completion prior to submission)` : null,
            ``,
            authorityFeesExcluded ? `*Note:* Official statutory authority fees (e.g. DHA, VFS Global, or CIPC lodgement fees) are separate and payable directly to the authorities.` : null,
            ``,
            `This estimate has been verified by our executive office. Please let me know if you would like us to open your file and issue the formal payment link.`
        ].filter(Boolean).join("\n");

        // Super Admin alert summary
        const alertSummary = [
            `Service: ${targetServiceName} [${effectiveDomain}]`,
            `Estimated Total: ${formattedTotal} (excl. VAT)`,
            `Deposit (${depositPercent}%): ${formattedDeposit}`,
            finalBalancePercent > 0 ? `Final Balance (${finalBalancePercent}%): ${formattedBalance}` : null,
            `Terms: ${termsNote}`,
            `Authority Fees Excluded: ${authorityFeesExcluded ? "YES" : "NO"}`
        ].filter(Boolean).join("\n");

        return {
            domain: effectiveDomain,
            serviceId: targetServiceId,
            serviceName: targetServiceName,
            currency: DEFAULT_CURRENCY,
            estimatedTotal,
            depositPercent,
            depositAmount,
            finalBalancePercent,
            finalBalanceAmount,
            vatStatus: "EXCLUDED",
            authorityFeesExcluded,
            specialBillingModel,
            breakdown,
            termsNote,
            formattedTotal,
            formattedDeposit,
            formattedBalance,
            clientQuoteText,
            alertSummary,
            actionButtons: [
                { id: "APPROVE_YES", text: "Yes - Approve" },
                { id: "REJECT_NO", text: "No - Reject" }
            ]
        };
    }

    inferServiceName(text = "", domain = "") {
        const t = String(text || "").toLowerCase();
        if (/critical skills/i.test(t)) return "Critical Skills Visas";
        if (/general work/i.test(t)) return "General Work Visas";
        if (/spousal|spouse/i.test(t)) return "Spousal Visas";
        if (/permanent residen/i.test(t)) return "Permanent Residence";
        if (/citizenship/i.test(t)) return "Citizenship Applications";
        if (/section 22/i.test(t)) return "Section 22 Applications";
        if (/section 24/i.test(t)) return "Section 24 Applications";
        if (/appeal/i.test(t)) return "Visa Appeals";
        if (/contract|agreement/i.test(t)) return "Contract Drafting";
        if (/disciplinary|hearing/i.test(t)) return "Disciplinary Hearings";
        if (/ccma|dismiss/i.test(t)) return "CCMA Representation";
        if (/vat/i.test(t)) return "VAT Registration";
        if (/company|cipc|register a business/i.test(t)) return "Company Registration";
        if (/retainer/i.test(t)) return "Business Compliance Retainer";
        return null;
    }
}
