import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const URL=Deno.env.get("SUPABASE_URL")!,KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db=createClient(URL,KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type"};
const json=(x:any,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{"content-type":"application/json",...cors}});
const clean=(v:any,n=500)=>String(v??"").trim().slice(0,n);
const date8=(v:any)=>String(v||"").replace(/-/g,"").slice(0,8);
const noPunct=(v:any)=>String(v??"").replace(/[,|]/g," ").trim();
const q=(code:string,value:any)=>value===undefined||value===null||String(value)===""?null:`${code},${typeof value==="string"&&!/^[-]?\d+(\.\d+)?$/.test(value)?'"'+noPunct(value)+'"':value}`;
const qa=(code:string,value:any)=>value===undefined||value===null||String(value)===""?null:`${code},"${noPunct(value)}"`;
function mod10Tax(s:string){const x=s.replace(/\D/g,"");if(x.length!==10||/^0+$/.test(x))return false;let total=0;for(let i=0;i<9;i++){let n=Number(x[i])*(i%2===0?2:1);total+=n>9?Math.floor(n/10)+(n%10):n;}return ((10-(total%10))%10)===Number(x[9]);}
function mod10Ref(s:string){const x=s.replace(/\D/g,"");if(x.length!==10||/^0+$/.test(x))return false;let total=0;for(let i=0;i<9;i++){let n=Number(i===0?4:x[i])*(i%2===0?2:1);total+=n>9?Math.floor(n/10)+(n%10):n;}return ((10-(total%10))%10)===Number(x[9]);}
function mod13Id(s:string){const x=s.replace(/\D/g,"");if(x.length!==13)return false;let total=0;for(let i=0;i<12;i++){let n=Number(x[i]);if(i%2===0){n*=2;if(n>9)n=n-9;}total+=n;}const check=(10-(total%10))%10;return check===Number(x[12]);}
function xmlSafe(v:any){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function amount(v:any,cents=true){const n=Math.max(0,Number(v)||0);return cents?n.toFixed(2):Math.floor(n).toString();}
function initials(first:string,last:string){return (String(first).trim().slice(0,1)+String(last).trim().slice(0,1)).replace(/[^A-Za-z]/g,"").toUpperCase();}
function certificateNo(paye:string,year:number,period:string,unique:string){return (paye||"").padStart(10,"0").slice(0,10)+String(year)+period+String(unique).replace(/[^A-Z0-9]/gi,"").padStart(14,"0").slice(-14);}
async function auth(req:Request){const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");if(!token)throw new Error("Authentication required.");const u=await db.auth.getUser(token);if(u.error||!u.data.user)throw new Error("Authentication required.");const p=await db.from("profiles").select("role,is_active").eq("id",u.data.user.id).maybeSingle();if(p.error||!p.data?.is_active||!["BUSINESS","STAFF","SUPER_ADMIN"].includes(p.data.role))throw new Error("Authorised payroll access required.");return {userId:u.data.user.id,role:p.data.role};}
async function exportRun(body:any,actor:any){
 const businessId=clean(body.business_id,100),runId=clean(body.payroll_run_id,100),period=clean(body.reconciliation_period,6)||"202608",year=Number(body.transaction_year||2027),environment=(clean(body.environment,4)||"TEST").toUpperCase(),certificateType=(clean(body.certificate_type,6)||"IRP5").toUpperCase();
 if(!businessId||!runId)throw new Error("business_id and payroll_run_id are required.");
 if(!/^20\d{2}(02|08)$/.test(period))throw new Error("reconciliation_period must be CCYY02 or CCYY08, e.g. 202608.");
 if(year!==2027)throw new Error("This BRS exporter is currently locked to transaction year 2027 / BRS 25.3.0.");
 if(!["TEST","LIVE"].includes(environment))throw new Error("environment must be TEST or LIVE.");
 if(!["IRP5","IT3(a)","ITREG"].includes(certificateType))throw new Error("Unsupported certificate type.");
 if(certificateType==="ITREG"&&environment!=="LIVE")throw new Error("SARS BRS requires ITREG employer files to use LIVE.");
 const bq=await db.from("businesses").select("*").eq("id",businessId).maybeSingle();if(bq.error||!bq.data)throw new Error("Business not found.");const b=bq.data;
 if(actor.role==="BUSINESS"&&b.owner_user_id!==actor.userId)throw new Error("Business is outside your access scope.");
 const rq=await db.from("hr_payroll_runs").select("*").eq("id",runId).eq("business_id",businessId).maybeSingle();if(rq.error||!rq.data)throw new Error("Payroll run not found.");const run=rq.data;
 const eq=await db.from("hr_payroll_entries").select("*,hr_employees(*)").eq("payroll_run_id",runId);if(eq.error)throw eq.error;const entries=eq.data||[];if(!entries.length)throw new Error("Payroll run has no employees.");
 const profileQ=await db.from("client_legal_profiles").select("*").eq("user_id",b.owner_user_id).maybeSingle();const cp=profileQ.data||{};
 const employer:any={...cp,...b,...(b.sars_profile||{})};
 const errors:string[]=[],warnings:string[]=[];
 const requireE=(cond:boolean,msg:string)=>{if(!cond)errors.push(msg)};
 const paye=String(employer.paye_reference||"").replace(/\D/g,""),sdl=String(employer.sdl_reference||""),uif=String(employer.uif_reference||"");
 requireE((employer.legal_name||employer.trading_name)&&String(employer.legal_name||employer.trading_name).length<=90,"2010 trading/legal name is required and must be <= 90 characters.");
 requireE(/^\d{10}$/.test(paye)&&mod10Ref(paye),"2020 valid 10-digit PAYE reference is required.");
 requireE(!sdl||(/^L\d{9}$/.test(sdl)&&mod10Ref(sdl.slice(1))),"2022 SDL reference must be L + 9 digits and pass modulus 10.");
 requireE(!uif||(/^U\d{9}$/.test(uif)&&mod10Ref(uif.slice(1))),"2024 UIF reference must be U + 9 digits and pass modulus 10.");
 requireE(employer.contact_first_name||employer.responsible_person_name,"2025 employer contact first name is required.");
 requireE(employer.contact_surname||employer.responsible_person_name,"2036 employer contact surname is required.");
 requireE(employer.billing_email||employer.email,"2027 employer contact email is required.");
 requireE(employer.physical_street||employer.physical_address,"2064 employer physical street/name is required.");
 requireE(employer.physical_suburb||employer.physical_city,"2065/2066 employer suburb or city is required.");
 requireE(/^\d{4}$/.test(String(employer.physical_postal_code||employer.postal_code||"")),"2080 employer physical postal code must be four digits.");
 const employerCodes=[q("2010",employer.legal_name||employer.trading_name),q("2015",environment),q("2020",paye),sdl?q("2022",sdl):null,uif?q("2024",uif):null,q("2025",employer.contact_first_name||String(employer.responsible_person_name||"").split(/\s+/)[0]),q("2036",employer.contact_surname||String(employer.responsible_person_name||"").split(/\s+/).slice(1).join(" ")||employer.responsible_person_name),q("2038",employer.contact_position),q("2026",String(employer.contact_business_phone||employer.phone||"").replace(/\D/g,"")),q("2040",String(employer.contact_cell||employer.whatsapp||"").replace(/\D/g,"")),q("2027",employer.billing_email||employer.email),q("2064",employer.physical_street||employer.physical_address),q("2065",employer.physical_suburb),q("2066",employer.physical_city),q("2080",String(employer.physical_postal_code||employer.postal_code||"")),q("2081",employer.physical_country_code||"ZA"),q("2037",employer.diplomatic_indemnity_indicator||"N"),q("2082",employer.sic7),q("2030",year),q("2031",period),"9999"].filter(Boolean).join(",");
 const employeeRecords:string[]=[];
 for(const row of entries){const e=row.hr_employees||{};const s=e.sars_profile||{};const first=String(e.first_name||"").trim(),last=String(e.last_name||"").trim(),nature=s.nature_of_person||"A",ct=row.certificate_type||certificateType,tax=String(e.tax_number||s.tax_reference_number||"").replace(/\D/g,""),id=String(e.id_number||s.id_number||"").replace(/\D/g,""),passport=String(e.passport_number||s.passport_number||"").trim(),gross=Number(row.gross_pay)||0,payee=Number(row.paye)||0,uifc=Number(row.uif_employee)||0,sdle=Number(row.sdl)||0;
  const errPrefix=`Employee ${e.employee_number||e.id}: `;
  requireE(first&&last,errPrefix+"first two names and surname are required.");
  requireE(["A","B","C","M","N","R"].includes(nature),errPrefix+"nature of person must be A/B/C/M/N/R for current employee export.");
  requireE(certificateType!=="ITREG" ? ct==="IRP5" : ct==="ITREG",errPrefix+"certificate type does not match export stream.");
  requireE(id?mod13Id(id):!!passport,errPrefix+"valid SA ID or passport is required.");
  if(id)requireE(id.length===13&&mod13Id(id),errPrefix+"ID number failed modulus 13 validation.");
  requireE(tax&&mod10Tax(tax),errPrefix+"valid Income Tax reference number is required by current SARS rules where applicable.");
  requireE(String(e.sars_profile?.work_street||"").trim(),errPrefix+"employee work street is required.");
  requireE(String(e.sars_profile?.work_country_code||"ZA").length===2,errPrefix+"employee work country code is required.");
  requireE(String(e.sars_profile?.residential_street||"").trim(),errPrefix+"employee residential street is required.");
  requireE(String(e.sars_profile?.residential_country_code||"ZA").length===2,errPrefix+"employee residential country code is required.");
  requireE(gross>0,errPrefix+"gross income must be greater than zero.");
  const eti=String(s.eti_indicator||"N").toUpperCase(); if(eti==="Y"&&!s.eti_months)errors.push(errPrefix+"ETI indicator is Y but six monthly ETI values are missing.");
  const unique=e.employee_number||e.id.replace(/-/g,"").slice(0,14),cert=certificateNo(paye,year,period,unique);
  const codes=[certificateType==="ITREG"?null:qa("3010",cert),qa("3015",certificateType),,q("3020",nature),q("3025",year),q("3026",eti),q("3030",last),q("3040",first),q("3050",initials(first,last)),id?q("3060",id):null,passport?q("3070",passport):null,passport?q("3075",s.passport_country_code||"ZAF"):null,q("3100",tax),e.metadata?.email?q("3125",e.metadata.email):null,e.metadata?.phone?q("3136",String(e.metadata.phone).replace(/\D/g,"")):null,qa("3147",s.work_street),qa("3148",s.work_suburb),qa("3149",s.work_city),q("3150",s.work_postal_code),q("3151",s.work_country_code||"ZA"),qa("3160",e.employee_number),q("3170",date8(run.period_start)),q("3180",date8(run.period_end)),q("3190",date8(e.start_date)),q("3195",s.voluntary_over_deduction_indicator||"N"),q("3200",e.pay_frequency==="WEEKLY"?"52.0000":e.pay_frequency==="FORTNIGHTLY"?"26.0000":"12.0000"),q("3210",e.pay_frequency==="WEEKLY"?"52.0000":e.pay_frequency==="FORTNIGHTLY"?"26.0000":"12.0000"),qa("3214",s.residential_street),q("3215",s.residential_suburb),q("3216",s.residential_city),q("3217",s.residential_postal_code),q("3285",s.residential_country_code||"ZA"),q("3601",amount(gross,false)),q("3699",amount(gross,false)),q("4102",amount(payee,true)),q("4141",amount(uifc,true)),q("4142",amount(sdle,true)),q("4149",amount(payee+uifc+sdle,true)),"9999"].filter(Boolean).join(",");
  employeeRecords.push(codes);
 }
 const trailerAmounts=entries.reduce((sum:any,r:any)=>sum+(Number(r.gross_pay)||0)+(Number(r.paye)||0)+(Number(r.uif_employee)||0)+(Number(r.sdl)||0),0);
 const trailer=[q("6010",entries.length+1),q("6030",amount(trailerAmounts,true)),"9999"].filter(Boolean).join(",");
 const content=employerCodes+"\r\n"+employeeRecords.join("\r\n")+"\r\n"+trailer+"\r\n";
 const runInsert=await db.from("sars_payroll_export_runs").insert({business_id:businessId,payroll_run_id:runId,brs_version:"25.3.0",certificate_type:certificateType,reconciliation_period:period,transaction_year:year,environment,status:errors.length?"VALIDATION_FAILED":"READY_FOR_EASYFILE_IMPORT",validation_errors:errors,validation_warnings:warnings,employee_count:entries.length,source_snapshot:{brs:"SARS_PAYE_BRS-PAYE-Employer-Reconciliation_V25_3_0",generated_at:new Date().toISOString(),submission_window:"2026-09-21 to 2026-10-31",reconciliation_window:"2026-03-01 to 2026-08-31"}}).select("id").single();if(runInsert.error)throw runInsert.error;
 if(errors.length)return {ok:false,status:"VALIDATION_FAILED",export_run_id:runInsert.data.id,brs_version:"25.3.0",errors,warnings,employee_count:entries.length};
 const path=`${businessId}/sars/BRS-25.3.0/${period}/${certificateType}-${environment}-${crypto.randomUUID()}.txt`;
 const up=await db.storage.from("hr-generated").upload(path,new TextEncoder().encode(content),{contentType:"text/plain; charset=ISO-8859-1",upsert:false});if(up.error)throw up.error;
 await db.from("sars_payroll_export_runs").update({status:"READY_FOR_EASYFILE_IMPORT",export_path:path}).eq("id",runInsert.data.id);
 const signed=await db.storage.from("hr-generated").createSignedUrl(path,86400);
 return {ok:true,status:"READY_FOR_EASYFILE_IMPORT",export_run_id:runInsert.data.id,brs_version:"25.3.0",certificate_type:certificateType,reconciliation_period:period,transaction_year:year,employee_count:entries.length,easyfile_import_file_url:signed.data?.signedUrl,notice:"This is a SARS BRS-compatible tax certificate import file for import into the official SARS e@syFile™ Employer/eFiling channel. It does not clone or replace SARS e@syFile™ and does not submit to SARS."};
}
Deno.serve(async req=>{if(req.method==="OPTIONS")return new Response("ok",{headers:cors});try{const actor=await auth(req),body=await req.json();if(String(body.action||"").toUpperCase()!=="EXPORT_BRS_25_3_0")return json({error:"Unsupported action."},400);return json(await exportRun(body,actor));}catch(e){return json({error:e instanceof Error?e.message:"SARS export failed."},400);}});