export default class SalesService {
    buildState({ servicePlan = null, lead = null, invoice = null, payment = null } = {}) {
        const state = {
            stage: lead?.readyForStaff ? "SERVICE_IDENTIFIED" : "QUALIFICATION",
            service: servicePlan?.service || null,
            quoteRequired: Boolean(servicePlan?.pricing?.bindingRateSource === "SERVICE_INVENTORY" || servicePlan?.humanRequired),
            invoiceId: invoice?.id || null,
            paymentId: payment?.id || null,
            paymentVerified: payment?.status === "COMPLETED",
            nextAction: "STAFF_REVIEW"
        };
        if (invoice && !state.paymentVerified) state.stage = "INVOICE_ISSUED";
        if (state.paymentVerified) {
            state.stage = "PAYMENT_CONFIRMED";
            state.nextAction = "MATTER_CREATION_OR_ACTIVATION";
        }
        return state;
    }

    canClaimPayment(payment) {
        return payment?.status === "COMPLETED";
    }

    buildPaymentResponse(payment) {
        if (this.canClaimPayment(payment)) return "Your payment has been confirmed. Our team will now proceed with the next stage of your matter.";
        return "I can help with the payment process. I cannot confirm receipt of payment until our system records the payment as completed.";
    }
}
