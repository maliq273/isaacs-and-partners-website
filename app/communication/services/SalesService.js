export default class SalesService {
    buildState({ servicePlan = null, lead = null, invoice = null, payment = null, quote = null, applicationComplete = false } = {}) {
        const commercial = servicePlan?.commercial || {};
        const isConsultation = Boolean(commercial.consultationOnly);
        const quoteRequired = !isConsultation && commercial.quoteRequired !== false;
        const quoteAccepted = quote?.status === "ACCEPTED" || quote?.customer_decision === "ACCEPTED";
        const verifiedPaid = Number(payment?.verifiedPaid ?? payment?.amountPaid ?? 0);
        const invoiceTotal = Number(invoice?.total ?? invoice?.amount ?? 0);
        const depositVerified = quoteAccepted && invoiceTotal > 0 && verifiedPaid >= invoiceTotal * 0.5;
        const finalVerified = invoiceTotal > 0 && verifiedPaid >= invoiceTotal;

        const state = {
            stage: lead?.readyForStaff ? "SERVICE_IDENTIFIED" : "QUALIFICATION",
            service: servicePlan?.service || null,
            quoteRequired,
            quoteId: quote?.id || null,
            quoteAccepted,
            invoiceId: invoice?.id || null,
            paymentId: payment?.id || null,
            paymentVerified: depositVerified,
            verifiedPaid,
            invoiceTotal,
            depositPercent: quoteRequired ? Number(commercial.depositPercent ?? 50) : 100,
            finalBalancePercent: quoteRequired ? Number(commercial.finalBalancePercent ?? 50) : 0,
            thirdPartyFeesExcluded: commercial.thirdPartyFeesExcluded !== false,
            applicationComplete: Boolean(applicationComplete),
            submissionReleased: finalVerified,
            nextAction: isConsultation ? "CONSULTATION_PAYMENT_VERIFICATION" : "STAFF_REVIEW"
        };

        if (isConsultation) {
            state.stage = finalVerified ? "CONSULTATION_PAYMENT_CONFIRMED" : "CONSULTATION_PAYMENT_PENDING";
            state.nextAction = finalVerified ? "CONSULTATION" : "PAYMENT_REQUIRED";
            return state;
        }

        if (!quote) {
            state.stage = "QUOTE_REQUIRED";
            state.nextAction = "STAFF_PRICING_AND_QUOTE";
        } else if (!quoteAccepted) {
            state.stage = "QUOTE_ISSUED";
            state.nextAction = "CLIENT_TERMS_AND_QUOTE_ACCEPTANCE";
        } else if (!depositVerified) {
            state.stage = "DEPOSIT_PENDING";
            state.nextAction = "50_PERCENT_DEPOSIT_PAYMENT";
        } else if (!applicationComplete) {
            state.stage = "APPLICATION_PREPARATION";
            state.nextAction = "COLLECT_ONLY_REQUIRED_INFORMATION_AND_DOCUMENTS";
        } else if (!finalVerified) {
            state.stage = "FINAL_50_PERCENT_PENDING";
            state.nextAction = "FINAL_50_PERCENT_PAYMENT_BEFORE_SUBMISSION";
        } else {
            state.stage = "SUBMISSION_RELEASED";
            state.nextAction = "DHA_OR_VFS_SUBMISSION";
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
        if (this.canClaimPayment(payment)) return "Your payment has been confirmed. Our accounts system has verified receipt and the matter will move to the next authorised stage.";
        return "I can help with the payment process. I cannot confirm receipt until our reconciliation system records the payment as completed.";
    }

    buildQuoteInstruction() {
        return "Please check your client dashboard for your quotation. Once the quotation is accepted, the required 50% deposit must reflect and be verified before the matter/file can be opened and work can commence. The remaining 50% is payable when the application dossier is complete and before DHA/VFS submission. Third-party and statutory fees are excluded unless expressly included in the approved quote.";
    }
}
