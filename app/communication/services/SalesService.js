export default class SalesService {
    buildState({ servicePlan = null, lead = null, invoice = null, payment = null, quote = null } = {}) {
        const commercial = servicePlan?.commercial || {};
        const isConsultation = Boolean(commercial.consultationOnly);
        const quoteRequired = !isConsultation && commercial.quoteRequired !== false;
        const quoteAccepted = quote?.status === "ACCEPTED";
        const paymentVerified = payment?.status === "COMPLETED";

        const state = {
            stage: lead?.readyForStaff ? "SERVICE_IDENTIFIED" : "QUALIFICATION",
            service: servicePlan?.service || null,
            quoteRequired,
            quoteId: quote?.id || null,
            quoteAccepted,
            invoiceId: invoice?.id || null,
            paymentId: payment?.id || null,
            paymentVerified,
            depositPercent: quoteRequired ? Number(commercial.depositPercent || 50) : 100,
            finalBalancePercent: quoteRequired ? Number(commercial.finalBalancePercent || 50) : 0,
            thirdPartyFeesExcluded: commercial.thirdPartyFeesExcluded !== false,
            nextAction: isConsultation ? "CONSULTATION_PAYMENT_VERIFICATION" : "STAFF_REVIEW"
        };

        if (isConsultation) {
            state.stage = paymentVerified ? "CONSULTATION_PAYMENT_CONFIRMED" : "CONSULTATION_PAYMENT_PENDING";
            state.nextAction = paymentVerified ? "CONSULTATION" : "PAYMENT_REQUIRED";
            return state;
        }

        if (!quote) {
            state.stage = "QUOTE_REQUIRED";
            state.nextAction = "STAFF_PRICING_AND_QUOTE";
        } else if (!quoteAccepted) {
            state.stage = "QUOTE_ISSUED";
            state.nextAction = "CLIENT_QUOTE_ACCEPTANCE";
        } else if (!paymentVerified) {
            state.stage = "DEPOSIT_PENDING";
            state.nextAction = "50_PERCENT_DEPOSIT_PAYMENT";
        } else if (invoice && paymentVerified) {
            state.stage = "DEPOSIT_CONFIRMED";
            state.nextAction = "MATTER_CREATION_OR_ACTIVATION";
        }

        return state;
    }

    canClaimPayment(payment) {
        return payment?.status === "COMPLETED";
    }

    canOpenMatter({ quoteAccepted = false, depositPayment = null } = {}) {
        return Boolean(quoteAccepted && this.canClaimPayment(depositPayment));
    }

    canSubmit({ finalBalancePayment = null } = {}) {
        return this.canClaimPayment(finalBalancePayment);
    }

    buildPaymentResponse(payment) {
        if (this.canClaimPayment(payment)) return "Your payment has been confirmed. Our team will now proceed with the next stage of your matter.";
        return "I can help with the payment process. I cannot confirm receipt of payment until our system records the payment as completed.";
    }

    buildQuoteInstruction() {
        return "Please check your client dashboard for your quotation. Once the quotation is accepted, the required 50% deposit must reflect before the matter/file can be opened and work can commence. The remaining 50% is payable on file closure before submission, where applicable. Third-party fees are excluded from our professional fees.";
    }
}
