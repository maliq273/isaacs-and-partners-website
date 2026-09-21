# PR42 — Service AI Worker Matrix

## Objective

Ensure every client service is backed by a governed AI/service-worker path while preserving human approval where professional judgement, representation or a binding commercial decision is required.

## Worker coverage

- Client Intake — individual/business detection, blank dashboard creation and service routing.
- Consultation — free 30-minute AI consultation and structured facts capture.
- Immigration Qualification — qualifying questions and route identification.
- Regulatory Research — current-source research with source/date provenance.
- Document Ingestion — uses the existing trusted private-document worker boundary.
- Document Requirements — dynamic checklists, missing/expired document detection and document matching.
- Document Understanding — confidence handling and client clarification loop.
- Immigration Estimate — non-binding preliminary professional-fee estimate; DHA/VFS fees remain separate.
- Legal Scoping — hourly/document pricing and paid consultation handling.
- HR/IR Triage — AI triage followed by human assignment.
- Business Compliance Estimate — market research, 39% markup, R1,250 retainer analysis and staff price recommendation.
- Pricing — deterministic application of configured commercial rules.
- Human Escalation — staff assignment and decision capture.
- Quote — quote draft and staff approval before client delivery.
- Payment Gate — 50/50 immigration payment enforcement and other configured payment rules.
- Application Preparation — forms, bundles, index, cover sheet and readiness checks.
- Client Communication — status, missing-document, clarification and quote notifications.
- Audit — worker execution, sources, pricing inputs and human decisions.

## Commercial rules encoded

### Legal
- Free AI consultation: 30 minutes.
- Paid consultation: R1,250 excluding VAT.
- Professional work: hourly and per-document rates from the Service Inventory source of truth.
- Binding legal advice/drafting remains subject to human professional review.

### Immigration
- AI asks qualifying questions.
- AI performs current regulatory/market research through the trusted server-side research layer.
- AI provides only a preliminary estimate.
- Staff sends the binding quote to the customer inbox.
- Terms: 50% on acceptance and 50% when the file is ready for VFS/DHA submission.
- DHA/VFS authority fees are excluded.
- Section 22, Section 24 and Visa Appeals use hourly + per-page + configured flat service-rate billing.

### HR & Industrial Relations
- Human assistance is mandatory for service delivery.
- Payroll outsourcing: 12.5% of employees' monthly salary.
- Temporary staffing: 23.5% of employee hourly rate.
- Hearing representation: R400/hour.
- Supplied document: R150/document.

### Business Compliance
- AI performs live market research for a preliminary estimate.
- 39% markup is applied to the researched service reference price.
- R1,250/month retainer starts with a 3-item package.
- For more than 3 selected items, AI recommends pricing to staff; staff remains the approval gate.

## Security

- No service-role or provider secret is exposed to browser code.
- Private documents continue through the trusted document worker.
- AI estimates never become binding quotes automatically.
- Human decisions and pricing overrides are auditable.

## Next wiring step

Connect `ServiceIntelligenceEngine` to the existing consultation/matter workflow and the Service Inventory dashboard, then connect the trusted server-side research provider and quote/payment services. No duplicate document worker is introduced.
