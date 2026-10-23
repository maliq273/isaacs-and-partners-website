#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const root=process.cwd();
const required=[
 "app/dashboard/vendor-payables.html",
 "app/dashboard/customer-statements.html",
 "app/dashboard/calendar-control.html",
 "app/dashboard/anthony-memory.html",
 "app/booking/booking.js",
 "app/booking/confirmation.js",
 "supabase/migrations/20261023081939_super_admin_control_centre.sql",
 "supabase/migrations/20261023082104_harden_control_centre_ledgers.sql",
 "supabase/migrations/20261023083003_guard_vendor_payment_overpayment.sql",
 "supabase/functions/anthony-memory-agent/index.ts"
];
const missing=required.filter(p=>!fs.existsSync(path.join(root,p)));
if(missing.length){console.error("Missing Super Admin redesign files:\n"+missing.join("\n"));process.exit(1);}
const migration=fs.readFileSync(path.join(root,required[6]),"utf8");
const hardening=fs.readFileSync(path.join(root,required[7]),"utf8");
for(const token of ["ap_vendors","ap_vendor_invoices","ap_vendor_payments","anthony_memory_entries","anthony_memory_audit","appointment_availability_slots","appointment_booking_requests","customer_statement_lines","security_invoker=true","submit_public_booking_request","admin_decide_booking_request"]){
 if(!migration.includes(token)){console.error("Migration missing required object/boundary: "+token);process.exit(1);}
}
for(const token of ["revoke update,delete on public.ap_vendor_payments","sync_ap_vendor_invoice_status","audit_ap_vendor_change","audit_anthony_memory_change"]){
 if(!hardening.includes(token)){console.error("Ledger hardening migration missing: "+token);process.exit(1);}
}
const paymentGuard=fs.readFileSync(path.join(root,required[8]),"utf8");
if(!paymentGuard.includes("Payment exceeds the outstanding vendor invoice balance")){console.error("Server-side vendor overpayment guard missing.");process.exit(1);}
for(const file of [required[0],required[1],required[2],required[3]]){
 const html=fs.readFileSync(path.join(root,file),"utf8");
 if(!html.includes("SUPER_ADMIN")){console.error("Super Admin authorization guard missing in "+file);process.exit(1);}
 for(const match of html.matchAll(/<script\s+type=["']module["'][^>]*>([\s\S]*?)<\/script>/gi)){
  const result=spawnSync(process.execPath,["--check","--input-type=module"],{input:match[1],encoding:"utf8"});
  if(result.status!==0){console.error("Inline module syntax error in "+file+"\n"+result.stderr);process.exit(1);}
 }
}
for(const file of [required[4],required[5]]){
 const result=spawnSync(process.execPath,["--check",path.join(root,file)],{encoding:"utf8"});
 if(result.status!==0){console.error("JavaScript syntax error in "+file+"\n"+result.stderr);process.exit(1);}
}
const booking=fs.readFileSync(path.join(root,required[4]),"utf8");
for(const token of ["appointment_availability_slots","submit_public_booking_request","slotId"]){
 if(!booking.includes(token)){console.error("Public booking integration missing: "+token);process.exit(1);}
}
const agent=fs.readFileSync(path.join(root,required[9]),"utf8");
for(const token of ["XAI_API_KEY","includeMemory","grok_eligible","SUPER_ADMIN","api.x.ai"]){
 if(!agent.includes(token)){console.error("Grok privacy/authorization boundary missing: "+token);process.exit(1);}
}
console.log("PASS: Super Admin vendor ledger, customer statements, calendar booking, durable memory, Grok privacy boundary and inline JavaScript syntax.");
