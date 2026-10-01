-- Versioned BRS 25.3.0 source-code/rule dictionary seed.
-- The authoritative source is SARS_PAYE_BRS-PAYE-Employer-Reconciliation_V25.3.0 (Jun-26).
-- The live database is seeded by the production hardening pass; unknown numeric source codes are fail-closed by sars-compliance-engine.
-- This migration records the dictionary/rule schema boundary and should be extended whenever SARS publishes a replacement BRS.

-- Key source-code families covered in the initial production dictionary:
-- employer 2010-2082; employee identity/demographics 3010-3246; income 3601-3699;
-- allowances 3701-3773; fringe benefits 3801-3885; lump sums 3901-3957;
-- deductions 4001-4099; tax/ETI/reason codes 4101-4150; later codes 4582-4589;
-- ETI 7002-7009; trailer 6010/6020/6030/9999.

-- SARS V25.3.0 remains the source of truth for exact conditional rules and effective-year changes.
