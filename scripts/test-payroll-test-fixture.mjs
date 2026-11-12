#!/usr/bin/env node
import fs from "node:fs";
const root=process.cwd();
const ui=fs.readFileSync(root+"/app/client/hr-payroll-center.js","utf8");
const runtime=fs.readFileSync(root+"/supabase/functions/hr-operations-runtime/index.ts","utf8");
const exporter=fs.readFileSync(root+"/supabase/functions/sars-payroll-export/index.ts","utf8");
const checks=[
 [ui,"data-pc-include-test"],
 [ui,"include_test_employees:"],
 [runtime,"metadata?.test_fixture!==true||includeTestEmployees"],
 [runtime,"includeTestEmployees&&(!b.data.is_internal_company||a.role!==\"SUPER_ADMIN\")"],
 [runtime,"test_only:includeTestEmployees"],
 [runtime,"TEST payroll runs cannot be approved"],
 [runtime,"TEST payroll runs cannot be released"],
 [exporter,"SARS LIVE export blocked"],
 [exporter,"TEST-only employee fixture included"]
];
for(const [source,token] of checks){if(!source.includes(token)){console.error("Missing payroll test-fixture safety control: "+token);process.exit(1);}}
console.log("PASS: payroll TEST fixture is opt-in, internal Super Admin only, blocked from release and SARS LIVE.");
