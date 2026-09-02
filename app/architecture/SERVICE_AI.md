# Service AI Operating Matrix

The service catalogue in `app/data/services.json` now has a governed AI worker path for all four client-facing departments.

## Customer lifecycle

1. Registration/sign-in creates the customer record and a blank dashboard.
2. `CLIENT_WORKSPACE_ACTIVATION` keeps the full AI workspace disabled until Super Admin or authorised staff activates it.
3. `CLIENT_INTAKE` identifies Individual vs Business and routes the requested service.
4. `CONSULTATION` provides the free 30-minute AI consultation where applicable.
5. Domain workers perform qualification, research, document collection and/or triage.
6. `PRICING` applies deterministic commercial rules; market estimates remain explicitly non-binding.
7. `HUMAN_ESCALATION` and `QUOTE` create the required human approval boundary.
8. `PAYMENT_GATE` controls work that depends on payment.
9. `CLIENT_COMMUNICATION` keeps the customer informed.
10. `AUDIT` records worker execution, research sources, pricing inputs and human decisions.

## Domain coverage

### Immigration
All listed immigration services route through qualification, current regulatory research, private document ingestion/understanding, requirements, preliminary estimate, staff quote, payment, application preparation, QC, submission readiness and tracking as applicable. Section 22, Section 24 and Visa Appeals use the special hourly + per-page + flat service-rate model.

### HR & Industrial Relations
AI performs intake and triage but does not autonomously provide human representation. Staff assignment and human service delivery are mandatory. Commercial rules include payroll outsourcing at 12.5% of monthly employee salary, temporary staffing at 23.5% of employee hourly rate, hearing representation at R400/hour and R150 per supplied document.

### Business Compliance
AI selects services, researches a current market reference, applies the 39% markup and analyses the R1,250/month retainer for a three-item base package. More than three selected items trigger a price recommendation to staff rather than automatic client pricing.

### Legal
AI handles intake, the free 30-minute consultation and scoping. Paid consultation is R1,250 excluding VAT. Hourly and per-document rates come from the Service Inventory. Legal advice and substantive drafting remain behind a human professional review gate.

## Important implementation boundary

The worker matrix is an orchestration contract. It does not fabricate regulatory results, market prices or professional advice. Live web research and privileged document processing belong on trusted server-side workers; browser code uses normal authenticated Supabase access and RLS.
