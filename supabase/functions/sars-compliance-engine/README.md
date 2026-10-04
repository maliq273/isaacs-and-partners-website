# SARS BRS 25.3.0 Compliance Engine

Production Edge Function: `sars-compliance-engine`  
Supabase project: `aglobzjtstbfwcsdhvmp`  
Current deployed version: **1**  
JWT: **required**

## Actions

- `EXPORT_BRS_25_3_0` — TEST/LIVE BRS import file generation for IRP5, IT3(a), and separate ITREG streams.
- `VALIDATE_BRS_25_3_0` — fail-closed validation report.
- `SARS_REJECTION_SIMULATOR` — TEST-only pre-import validation path.
- `UPSERT_EMP201` — monthly EMP201 reconciliation data.
- `BUILD_EMP501` — EMP501 reconciliation pack comparing declarations, payments and certificate totals.
- `CREATE_EMP601` — certificate cancellation/replacement event.
- EMP701 is intentionally represented as a legacy-only pathway: SARS BRS 25.3.0 states it applies only to transaction years 1999–2008 and is not applicable from 2009 onward.

## Compliance controls

The engine enforces the BRS 25.3.0 separation of ITREG from IRP5/IT3(a), strict certificate-type rules, tax-number checks, certificate-number non-reuse, directive constraints, source-code family limits, full-period ETI 7002–7009 data, TEST/LIVE separation, and immutable hash-linked submission audit records.

The source-code payload model uses `hr_payroll_entries.brs_source_codes` / `source_codes` so normal income, allowances, fringe benefits, lump sums, gross remuneration, deductions, medical credits, retirement values and other BRS source codes are retained without inventing SARS codes.

SARS e@syFile remains the official SARS submission application. This service generates and validates the compatible import/reconciliation data; it does not clone, redistribute or impersonate SARS e@syFile and does not submit directly to SARS.

The implementation is based on SARS PAYE Employer Reconciliation BRS V25.3.0 (June 2026).