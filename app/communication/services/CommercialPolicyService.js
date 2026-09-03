/**
 * Isaacs & Partners — Commercial Policy Service
 *
 * Central source for quote and payment gates used by the AI workflow.
 * Consultation is the only service interaction that does not itself require
 * a matter quote. All substantive Immigration, HR, Business Compliance and
 * Legal matters require a quote and a 50% professional-fee deposit before
 * the matter/file may be opened. The remaining 50% is due at file closure
 * before submission where applicable. Third-party fees remain excluded.
 */

export const COMMERCIAL_RULES = Object.freeze({
    consultation: Object.freeze({
        quoteRequired: false,
        depositRequired: true,
        depositPercent: 100,
        finalBalancePercent: 0
    }),
    IMMIGRATION: Object.freeze({
        quoteRequired: true,
        depositRequired: true,
        depositPercent: 50,
        finalBalancePercent: 50,
        finalBalanceTrigger: "FILE_CLOSURE_BEFORE_SUBMISSION",
        thirdPartyFeesExcluded: true
    }),
    HR_IR: Object.freeze({
        quoteRequired: true,
        depositRequired: true,
        depositPercent: 50,
        finalBalancePercent: 50,
        finalBalanceTrigger: "FILE_CLOSURE_BEFORE_SUBMISSION",
        thirdPartyFeesExcluded: true
    }),
    BUSINESS_COMPLIANCE: Object.freeze({
        quoteRequired: true,
        depositRequired: true,
        depositPercent: 50,
        finalBalancePercent: 50,
        finalBalanceTrigger: "FILE_CLOSURE_BEFORE_SUBMISSION",
        thirdPartyFeesExcluded: true
    }),
    LEGAL: Object.freeze({
        quoteRequired: true,
        depositRequired: true,
        depositPercent: 50,
        finalBalancePercent: 50,
        finalBalanceTrigger: "FILE_CLOSURE_BEFORE_SUBMISSION",
        thirdPartyFeesExcluded: true
    })
});

export default class CommercialPolicyService {
    getRule(domain, { isConsultation = false } = {}) {
        if (isConsultation) return { ...COMMERCIAL_RULES.consultation };
        return {
            ...(COMMERCIAL_RULES[String(domain || "").toUpperCase()] || {
                quoteRequired: true,
                depositRequired: true,
                depositPercent: 50,
                finalBalancePercent: 50,
                finalBalanceTrigger: "FILE_CLOSURE_BEFORE_SUBMISSION",
                thirdPartyFeesExcluded: true
            })
        };
    }

    requiresQuote(domain, options = {}) {
        return this.getRule(domain, options).quoteRequired;
    }

    canOpenMatter({ domain, isConsultation = false, quoteAccepted = false, depositPaid = false } = {}) {
        const rule = this.getRule(domain, { isConsultation });
        if (isConsultation) return Boolean(depositPaid);
        return Boolean(rule.quoteRequired && quoteAccepted && depositPaid);
    }

    canSubmit({ domain, finalBalancePaid = false } = {}) {
        const rule = this.getRule(domain);
        return !rule.finalBalancePercent || Boolean(finalBalancePaid);
    }

    getClientPaymentInstruction(domain, { isConsultation = false } = {}) {
        const rule = this.getRule(domain, { isConsultation });
        if (isConsultation) {
            return "Please check your client dashboard for the consultation payment instructions. The consultation can proceed once the required payment reflects.";
        }
        return `Please check your client dashboard for your quotation. Once the quotation is accepted, a ${rule.depositPercent}% deposit of the quoted professional fee must reflect before your matter/file can be opened and work can commence. The remaining ${rule.finalBalancePercent}% is payable on file closure before submission, where applicable. Third-party fees are excluded from our professional fees.`;
    }
}
