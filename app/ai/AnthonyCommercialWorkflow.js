/**
 * Anthony Isaacs — controlled client-service and commercial workflow.
 *
 * Pure workflow rules. Financial truth remains Supabase; this class never
 * invents prices or treats a client payment claim as verified.
 */
export const ANTHONY_STATES = Object.freeze({
  QUALIFICATION: "QUALIFICATION",
  PRICING_REQUIRED: "PRICING_REQUIRED",
  PRICING_AWAITING_SUPER_ADMIN: "PRICING_AWAITING_SUPER_ADMIN",
  QUOTE_PENDING_APPROVAL: "QUOTE_PENDING_APPROVAL",
  QUOTE_ISSUED: "QUOTE_ISSUED",
  TERMS_ACCEPTANCE_PENDING: "TERMS_ACCEPTANCE_PENDING",
  DEPOSIT_PAYMENT_PENDING: "DEPOSIT_PAYMENT_PENDING",
  DEPOSIT_VERIFIED: "DEPOSIT_VERIFIED",
  APPLICATION_PREPARATION: "APPLICATION_PREPARATION",
  APPLICATION_BLOCKED: "APPLICATION_BLOCKED",
  APPLICATION_COMPLETE: "APPLICATION_COMPLETE",
  FINAL_PAYMENT_PENDING: "FINAL_PAYMENT_PENDING",
  FINAL_PAYMENT_VERIFIED: "FINAL_PAYMENT_VERIFIED",
  SUBMISSION_RELEASED: "SUBMISSION_RELEASED",
  SUBMITTED: "SUBMITTED"
});

export const ANTHONY_GATES = Object.freeze({
  OPEN_MATTER: "OPEN_MATTER",
  START_PREPARATION: "START_PREPARATION",
  RELEASE_SUBMISSION: "RELEASE_SUBMISSION"
});

export default class AnthonyCommercialWorkflow {
  getPricingDecision({ costing = null } = {}) {
    const total = Number(costing?.approvedTotal ?? costing?.fixedPrice ?? costing?.total);
    if (!costing || !Number.isFinite(total) || total <= 0) {
      return {
        status: "PRICING_REQUIRED",
        state: ANTHONY_STATES.PRICING_REQUIRED,
        requiresSuperAdmin: true,
        reason: "No approved price exists in the costing centre."
      };
    }
    return {
      status: "PRICE_AVAILABLE",
      state: ANTHONY_STATES.QUOTE_PENDING_APPROVAL,
      requiresSuperAdmin: costing.approved !== true,
      total,
      currency: costing.currency || "ZAR"
    };
  }

  requiredQuestions({ requiredFields = [], knownFacts = {} } = {}) {
    const known = new Set(Object.keys(knownFacts).filter((key) => {
      const value = knownFacts[key];
      return value !== null && value !== undefined && String(value).trim() !== "";
    }));
    return requiredFields.filter((field) => {
      const key = typeof field === "string" ? field : field.key;
      return key && !known.has(key);
    });
  }

  paymentState({ invoiceTotal = 0, verifiedPaid = 0 } = {}) {
    const total = Number(invoiceTotal);
    const paid = Number(verifiedPaid);
    if (!Number.isFinite(total) || total <= 0) return "INVALID_INVOICE";
    if (!Number.isFinite(paid) || paid < 0) return "UNPAID";
    if (paid >= total) return "FULLY_PAID";
    if (paid >= total * 0.5) return "DEPOSIT_VERIFIED";
    if (paid > 0) return "PARTIALLY_PAID";
    return "UNPAID";
  }

  canOpenMatter({ quoteAccepted = false, verifiedPaid = 0, invoiceTotal = 0 } = {}) {
    return Boolean(quoteAccepted && this.paymentState({ invoiceTotal, verifiedPaid }) !== "UNPAID" &&
      this.paymentState({ invoiceTotal, verifiedPaid }) !== "PARTIALLY_PAID" &&
      this.paymentState({ invoiceTotal, verifiedPaid }) !== "INVALID_INVOICE");
  }

  canSubmit({ verifiedPaid = 0, invoiceTotal = 0 } = {}) {
    return this.paymentState({ invoiceTotal, verifiedPaid }) === "FULLY_PAID";
  }

  nextState({ state, quoteAccepted = false, verifiedPaid = 0, invoiceTotal = 0, applicationComplete = false } = {}) {
    const payment = this.paymentState({ invoiceTotal, verifiedPaid });
    if (state === ANTHONY_STATES.PRICING_REQUIRED) return ANTHONY_STATES.PRICING_AWAITING_SUPER_ADMIN;
    if (state === ANTHONY_STATES.QUOTE_ISSUED && !quoteAccepted) return ANTHONY_STATES.TERMS_ACCEPTANCE_PENDING;
    if (state === ANTHONY_STATES.TERMS_ACCEPTANCE_PENDING && !quoteAccepted) return state;
    if (quoteAccepted && payment === "DEPOSIT_VERIFIED" && !applicationComplete) return ANTHONY_STATES.APPLICATION_PREPARATION;
    if (applicationComplete && payment !== "FULLY_PAID") return ANTHONY_STATES.FINAL_PAYMENT_PENDING;
    if (applicationComplete && payment === "FULLY_PAID") return ANTHONY_STATES.SUBMISSION_RELEASED;
    return state;
  }

  clientPaymentMessage(stage) {
    if (stage === "DEPOSIT") {
      return "Your 50% initial payment has been received and verified. Your matter can now proceed to application preparation.";
    }
    if (stage === "FINAL") {
      return "Your final 50% payment has been received and verified. Your completed dossier is now authorised for submission to DHA/VFS, subject to the applicable submission checks.";
    }
    return "Your payment status will be confirmed once our accounts reconciliation system records it as completed.";
  }

  finalPaymentMessage({ completedAt = null } = {}) {
    const target = completedAt ? new Date(completedAt).toLocaleDateString("en-ZA") : "the completion date";
    return `Your application dossier reached the completion stage on ${target}. The remaining 50% must be received and verified before we can release the dossier for DHA/VFS submission.`;
  }
}
