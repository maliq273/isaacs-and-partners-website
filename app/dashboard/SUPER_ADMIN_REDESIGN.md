# Super Admin Control Centre Redesign

## Objective
Rebuild the Super Admin experience as an operational workspace for Isaacs & Partners. Preserve existing authentication, RLS, audited server-side actions, payroll/SARS modules, Paystack verification, service entitlements, and existing repository structure. Do not replace production modules with mock screens.

## Navigation and workspaces

1. **Overview** — action queue, unpaid invoices, customer access requests, payroll runs awaiting review, SARS periods requiring attention, upcoming hearings/site visits, and integration health. Metrics must come from live backend queries and show an explicit unavailable state on errors.
2. **Payroll Operations** — Super Admin can enter the existing restricted payroll/SARS workspace and perform the complete internal workflow: import, validate, calculate, month-on-month reconciliation, review, invoice/payment verification where applicable, preview, authorised release, archive, and SARS handoff. Super Admin authority must be enforced server-side; no client-only role checks.
3. **SARS Compliance** — direct Super Admin access to the existing SARS workspace, with period status, billing gates, validation, BRS/EMP processing and export history. Keep customer access and retainer/payment gates separate from Super Admin authority.
4. **Services & Pricing** — replace the old Financials landing experience with an editable service catalogue: service name/code, description, unit (fixed fee/hour/page/employee/month), price in ZAR, VAT treatment, active state, effective dates and optional notes. Save through an authenticated, audited backend action. Generate invoices from the saved price version; never trust browser-submitted totals. Keep third-party charges distinct.
5. **Accounts Receivable** — customer invoices, payments, credit notes/adjustments where authorised, outstanding balance, ageing, and per-customer statement of account. Invoice/payment status must reconcile with verified Paystack events and the existing invoice ledger.
6. **Vendor Payables** — capture vendor profile, invoice number, invoice date, due date, line items, tax/VAT details, supporting invoice file, amount paid, amount outstanding, status, payment reference and audit history. Produce vendor statements/account ledger and a statement showing amounts owed by Isaacs & Partners. Do not imply bank payment execution unless a supported integration is connected.
7. **Staff & Permissions** — staff directory, roles, per-module permissions, active/suspended status and access audit. Enforce least privilege with server-side role checks and RLS; never rely on hidden UI controls alone.
8. **Customers & Software Access** — customer/business directory, approved service entitlements, module-level permissions, activation/suspension, payment/retainer gates and an auditable change history.
9. **Client Calendar** — shared availability for hearings, site visits, consultations and other appointments. Show customers only bookable slots and appropriate details; staff can manage availability and assignments. Prevent double booking and protect confidential matter information. Respect timezone and appointment status.
10. **Anthony Executive Assistant** — professional tone, clear task status, matter/customer relationship context, durable and auditable memory, approval boundaries, and visible source/last-updated information. Do not claim to remember information unless it has actually been persisted.
11. **Integrations & Secrets** — connection health and safe server-side secret management. Never commit credentials, merchant secrets, service-role keys or tokens to source control.

## Paystack merchant configuration
The user reports that a merchant number has now been issued, but the actual identifier was not included in the request. Request the exact merchant number before recording it in configuration. Treat the merchant number as an identifier, not as a substitute for the Paystack secret key or verified webhook setup. Keep secrets in Supabase Vault/project secrets. Do not mark the merchant approved or payments live based only on the presence of a merchant number. Preserve server-side transaction verification of reference, amount, currency, invoice ownership and payment status.

## Grok as an optional memory agent
Add Grok as a selectable, optional provider behind a provider-neutral memory-agent interface. Keep Anthony as the primary executive assistant. Store provider credentials server-side only. Define scoped memory read/write permissions, user/customer separation, retention and deletion controls, source provenance, audit events, and explicit approval for consequential actions. Do not send confidential client, immigration, HR, payroll, legal or SARS data to Grok by default; require an explicit configuration and data-governance decision first. Never use provider memory as the sole authoritative record for matters, payments, permissions or compliance.

## Delivery and verification gates
- Inspect existing pages, APIs, SQL migrations, RLS policies, Edge Functions and tests before replacing any implementation.
- Reuse existing production services and avoid duplicate abstractions.
- Add forward-only migrations; repair migration ordering before deploying.
- Enforce authorization on the server and database, including tenant scoping.
- Audit pricing changes, invoice creation, vendor invoice edits, permission changes, payroll releases and memory operations.
- Add tests for unauthorized access, cross-customer data leakage, payment verification, unpaid service gates, duplicate bookings, pricing versioning and vendor balance calculations.
- Run production checks and relevant tests; verify deployed Supabase functions and database migrations before calling any workflow production-ready.
- Do not claim real payroll/SARS processing has been verified until a controlled end-to-end run with real configured records succeeds.
