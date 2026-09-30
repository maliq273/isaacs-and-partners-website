# HR & Industrial Relations — Customer-Facing Production Module

This folder is the production audit and test contract for the eight customer-facing HR & Industrial Relations services.

## Runtime authority

This folder is **not** a second operational database. Runtime truth remains:

1. Supabase operational records, pricing approvals, payments, matters and permissions.
2. `app/data/services.json` for the public service catalogue.
3. `app/data/service-pricing.json` for firm-level commercial policy.
4. `HR_IR/customer-facing-service-matrix.json` for the customer-facing test contract and service-specific intake/evidence expectations.
5. AI output and Hindsight are non-authoritative.

## Customer lifecycle

Customer message
→ service classification
→ HR service selection
→ qualification
→ evidence/document request
→ indicative estimate or staff-quote request
→ Super Admin/staff pricing approval
→ quote
→ customer acceptance
→ verified payment/deposit gate
→ operational matter/file progression
→ assigned HR/IR staff delivery
→ quality control
→ client update
→ final balance where applicable
→ closure.

A service request may exist before payment, but paid professional work must remain behind the verified commercial gate.

## Human boundary

Anthony performs customer intake, qualification, document/evidence triage, status communication and commercial preparation. He does not autonomously conduct hearings, provide binding legal advice, represent a client, approve a final quote, or release paid work.

## Eight services

- Employment Contracts
- HR Policies
- Disciplinary Hearings
- Chairperson Services
- Grievance Hearings
- Performance Management
- Retrenchment Consulting
- CCMA Representation

## Production test

Use `customer-facing-test-cases.json` to exercise each service through the same lifecycle. A passing test requires the customer request to remain traceable into the service request/estimate, quote approval, payment state, matter/work queue and closure state.
