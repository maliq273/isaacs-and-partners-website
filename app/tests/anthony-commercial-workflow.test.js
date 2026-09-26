import assert from "node:assert/strict";
import AnthonyCommercialWorkflow, { ANTHONY_STATES } from "../ai/AnthonyCommercialWorkflow.js";

const workflow = new AnthonyCommercialWorkflow();

assert.equal(
  workflow.getPricingDecision({ costing: null }).status,
  "PRICING_REQUIRED"
);
assert.equal(
  workflow.getPricingDecision({ costing: { approved: false, fixedPrice: 6500 } }).requiresSuperAdmin,
  true
);
assert.equal(
  workflow.getPricingDecision({ costing: { approved: true, fixedPrice: 6500 } }).status,
  "PRICE_AVAILABLE"
);

assert.deepEqual(
  workflow.requiredQuestions({
    requiredFields: ["passport_number", "nationality", "date_of_birth"],
    knownFacts: { passport_number: "P123", nationality: "ZA" }
  }),
  ["date_of_birth"]
);

assert.equal(
  workflow.paymentState({ invoiceTotal: 10000, verifiedPaid: 5000 }),
  "DEPOSIT_VERIFIED"
);
assert.equal(
  workflow.paymentState({ invoiceTotal: 10000, verifiedPaid: 10000 }),
  "FULLY_PAID"
);
assert.equal(
  workflow.canOpenMatter({ quoteAccepted: true, invoiceTotal: 10000, verifiedPaid: 5000 }),
  true
);
assert.equal(
  workflow.canSubmit({ invoiceTotal: 10000, verifiedPaid: 9999 }),
  false
);
assert.equal(
  workflow.canSubmit({ invoiceTotal: 10000, verifiedPaid: 10000 }),
  true
);

assert.equal(
  workflow.nextState({
    state: ANTHONY_STATES.QUOTE_ISSUED,
    quoteAccepted: false,
    invoiceTotal: 10000,
    verifiedPaid: 0
  }),
  ANTHONY_STATES.TERMS_ACCEPTANCE_PENDING
);

console.log("Anthony commercial workflow tests passed.");
