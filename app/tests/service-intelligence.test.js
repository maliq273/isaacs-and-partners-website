/**
 * PR42 service intelligence smoke tests.
 * Run with a modern Node runtime using ESM support.
 */
import assert from "node:assert/strict";
import ServiceIntelligenceEngine from "../ai/ServiceIntelligenceEngine.js";
import WORKERS from "../ai/ServiceWorkerRegistry.js";

const catalog = {
    departments: [
        { id: "immigration", name: "Immigration Services", services: [{ id: "section-22-applications", name: "Section 22 Applications" }] },
        { id: "legal", name: "Legal Services", services: [{ id: "legal-advice", name: "Legal Advice" }] },
        { id: "hr-industrial-relations", name: "HR & Industrial Relations", services: [{ id: "payroll-advisory", name: "Payroll Advisory" }] },
        { id: "business-compliance", name: "Business Compliance", services: [{ id: "vat-registration", name: "VAT Registration" }] }
    ]
};

const engine = new ServiceIntelligenceEngine({ serviceCatalog: catalog });

const immigration = engine.buildPlan({ domain: "Immigration Services", serviceId: "section-22-applications" });
assert.equal(immigration.pricing.billingModel, "HOURLY_PLUS_PER_PAGE_PLUS_FLAT_SERVICE_RATE");
assert.equal(immigration.pricing.depositPercent, 50);
assert.equal(immigration.pricing.finalBalancePercent, 50);
assert.equal(immigration.pricing.authorityFeesExcluded, true);
assert.ok(immigration.workers.includes("IMMIGRATION_QUALIFICATION"));
assert.ok(immigration.workers.includes("REGULATORY_RESEARCH"));
assert.ok(immigration.workers.includes("DOCUMENT_INGESTION"));
assert.ok(immigration.workers.includes("APPLICATION_PREPARATION"));

const legal = engine.buildPlan({ domain: "Legal Services", serviceId: "legal-advice" });
assert.equal(legal.pricing.paidConsultation, 1250);
assert.equal(legal.pricing.freeAiConsultationMinutes, 30);
assert.equal(legal.humanRequired, true);
assert.ok(legal.workers.includes("LEGAL_SCOPING"));
assert.ok(legal.workers.includes("HUMAN_ESCALATION"));

const hr = engine.buildPlan({ domain: "HR & Industrial Relations", serviceId: "payroll-advisory" });
assert.equal(hr.pricing.payrollOutsourcingPercentOfMonthlySalary, 12.5);
assert.equal(hr.pricing.temporaryStaffingPercentOfHourlyRate, 23.5);
assert.equal(hr.pricing.hearingRepresentationHourly, 400);
assert.equal(hr.pricing.suppliedDocumentFee, 150);
assert.ok(hr.workers.includes("HR_IR_TRIAGE"));

const compliance = engine.buildPlan({ domain: "Business Compliance", serviceId: "vat-registration", facts: { selectedItemCount: 3 } });
assert.equal(compliance.pricing.model, "RETAINER_OR_RECOMMENDED_PACKAGE");
assert.equal(compliance.pricing.monthlyRetainer, 1250);
assert.equal(compliance.pricing.baseIncludedItems, 3);
assert.equal(compliance.pricing.marketMarkupPercent, 39);
assert.ok(compliance.workers.includes("BUSINESS_COMPLIANCE_ESTIMATE"));

assert.ok(WORKERS.CLIENT_INTAKE);
assert.ok(WORKERS.DOCUMENT_UNDERSTANDING);
assert.ok(WORKERS.PAYMENT_GATE);
assert.ok(WORKERS.AUDIT);

console.log("PR42 service intelligence tests passed.");
