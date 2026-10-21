# Isaacs & Partners — Runtime Verification Report

**Checked:** 2026-10-21  
**Repository:** `maliq273/isaacs-and-partners-website`  
**Branch:** `main`  
**Production Check:** [Run 39610486863](https://github.com/maliq273/isaacs-and-partners-website/actions/runs/39610486863)  
**Pages deployment:** [Run 39610487180](https://github.com/maliq273/isaacs-and-partners-website/actions/runs/39610487180)  
**Implementation PR:** [PR #52 — merged](https://github.com/maliq273/isaacs-and-partners-website/pull/52)

## Verification result

- Static production audit completed successfully: **813 files scanned**, including **501 source files**.
- Findings: **0 P0, 0 P1, 99 P2**. The P2 findings are heuristic warnings for dynamic `innerHTML` assignments in 31 files. They need contextual XSS review; the scanner does not establish that all 99 are exploitable.
- GitHub Pages build and deployment completed successfully.
- Live Supabase database queries succeeded and the payroll/SARS access controls were verified against PostgreSQL catalogs.
- The live HR Payroll and SARS Edge Function source files match the repository source.

## Payroll and SARS runtime

| Component | Live state | Verification / remaining limitation |
|---|---|---|
| Super Admin access | Wired | The Super Admin navigation opens `app/dashboard/payroll-sars-workspace.html`. The page checks for the Super Admin role, waits for both modules to mount and displays a diagnostic if mounting fails. |
| HR Payroll runtime | Active, version 13; JWT required | Deployed source matches the repository. Payroll access/release checks are present. No live payroll profile, employees or payroll runs exist, so a real payroll calculation/release was not performed. |
| SARS Compliance engine | Active, version 4; JWT required | Deployed source matches the repository. The selected-period billing gate now fails closed for missing/unpaid records. No SARS billing periods, compliance runs or exports exist, so a live BRS/EMP export was not performed. |
| SARS billing data | RLS enabled | A scoped read policy exists for the owning business and authorised staff/Super Admin. Client writes remain backend-controlled. |
| Internal service costing | Hardened | `service_costing_summary` uses security-invoker semantics and anonymous SELECT is revoked. Sensitive pricing/payment RPCs are restricted to service-role execution. |

## Payments and communications

| Component | Live state | Verification / remaining limitation |
|---|---|---|
| Paystack payroll function | Active, version 5; custom authentication plus signed webhook handling | Browser verification now checks invoice ownership and binds the verified transaction to its reference, amount and currency. The Payments integration registry is still `NOT_CONFIGURED`, and no `PAYSTACK_SECRET_KEY` is present in Supabase Vault. No real transaction was initiated. Configure the key through Super Admin → Secrets & Integrations before testing payments. |
| OpenWA communication worker | Active, version 50 | The scheduled worker runs every 15 seconds. Recent Supabase HTTP responses returned **200** with an empty queue (`[]`), proving the polling endpoint and worker-token path are responding. This is not proof of a successful outbound WhatsApp delivery. |
| OpenWA Vault lookup | Verified | Case-insensitive secret lookup succeeds for the existing worker token and webhook secret. Vault rotation preserves the legacy lower-case worker-token name used by the cron job. Super Admin now exposes OpenWA API key, base URL, session ID, worker token and webhook secret fields. |
| WhatsApp delivery | Not end-to-end verified | No outbound messages were queued in the recent check window. The last recorded outbound SENT message was 2026-10-12. The integration registry still reports `NOT_CONFIGURED`; do not treat polling success as delivery confirmation. |
| Email, Google, Zoho | Not configured | Their integration registry entries are disabled/`NOT_CONFIGURED`. Successful account authorisation or delivery has not been established. |
| Supabase | Connected | Live database catalog, RLS, function privileges, Vault lookup and Edge Function metadata were queried successfully. |

## Live data inventory

The database currently has one active business and no payroll/SARS operational records:

- Active payroll profiles: **0**
- Employees: **0**
- Payroll runs: **0**
- SARS billing periods: **0**
- SARS compliance runs: **0**
- SARS exports: **0**

No synthetic employee, payroll, invoice or payment records were inserted during this verification.

## Required next steps

1. Configure `PAYSTACK_SECRET_KEY` through the masked Super Admin integration form, then run a controlled test-mode payment and verify the invoice/payment state transition before enabling production payments.
2. Confirm the one active business's payroll pricing and statutory profile, then create a test employee and run a controlled payroll in the intended test environment.
3. Create a SARS billing period through the approved billing workflow and test BRS validation/export with test data. SARS submission itself remains through the official SARS channel.
4. Authorise a controlled WhatsApp test message to a known test recipient; verify provider acknowledgement and a persisted SENT/DELIVERED event before marking WhatsApp connected.
5. Review the 99 P2 dynamic-HTML warnings contextually; the warnings are not confirmed vulnerabilities, but they remain outstanding review work.

**Scope note:** This report combines a repository static audit with live database catalog checks, deployed function/version comparison and scheduled-worker response checks. It is not a credentialed browser end-to-end test of every user journey, a live Paystack payment, or a confirmed WhatsApp delivery.
