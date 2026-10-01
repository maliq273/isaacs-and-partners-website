import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, ImageRun } from "npm:docx@9.5.1";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INTERNAL=Deno.env.get("OPENWA_WORKER_TOKEN")||"";
const admin=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-ai-internal-worker-token"};
const json=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json",...cors}});
const clean=(v:any,n=5000)=>String(v??"").trim().slice(0,n);
const money=(v:any)=>new Intl.NumberFormat("en-ZA",{style:"currency",currency:"ZAR"}).format(Number(v)||0);

async function auth(req:Request,body:any){
 const internal=req.headers.get("X-AI-Internal-Worker-Token");
 if(internal&&INTERNAL&&internal===INTERNAL)return {userId:null,internal:true,role:"SUPER_ADMIN"};
 const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
 if(!token)throw new Error("Authentication required.");
 const u=await admin.auth.getUser(token); if(u.error||!u.data.user)throw new Error("Authentication required.");
 const p=await admin.from("profiles").select("role,is_active").eq("id",u.data.user.id).maybeSingle();
 if(p.error||!p.data?.is_active)throw new Error("Account is not active.");
 return {userId:u.data.user.id,internal:false,role:p.data.role};
}
async function getMatter(id:string,userId:string|null,internal:boolean){
 const q=await admin.from("matters").select("*").eq("id",id).maybeSingle(); if(q.error||!q.data)throw new Error("Matter not found.");
 const m=q.data;
 if(!internal && !["STAFF","SUPER_ADMIN"].includes(await roleFor(userId)) && m.individual_user_id!==userId)throw new Error("Matter is outside your access scope.");
 return m;
}
async function roleFor(userId:string|null){if(!userId)return "SUPER_ADMIN";const q=await admin.from("profiles").select("role").eq("id",userId).maybeSingle();return q.data?.role||"";}
async function latestAnswers(matter:any){
 const q=await admin.from("client_estimates").select("qualifying_answers,service_code,service_name,created_at").eq("request_data->>matter_id",String(matter.id)).order("created_at",{ascending:false}).limit(1);
 if(q.error)throw q.error; return q.data?.[0]||{qualifying_answers:{},service_code:matter.service_type,service_name:matter.title};
}
async function profile(userId:string|null,businessId:string|null){
 if(userId){const q=await admin.from("client_legal_profiles").select("*").eq("user_id",userId).maybeSingle();if(q.data)return q.data;}
 if(businessId){const q=await admin.from("businesses").select("*").eq("id",businessId).maybeSingle();if(q.data)return {...q.data,legal_name:q.data.legal_name,trading_name:q.data.trading_name,email:q.data.email,phone:q.data.phone};}
 return {};
}
function requiredFor(template:any,a:any){
 const missing=(template.required_answers||[]).filter((k:string)=>a[k]===undefined||a[k]===null||String(a[k]).trim()==="");
 return missing;
}
function contractTemplate(a:any){
 const t=String(a.employment_type||"").toUpperCase().replace(/[ -]+/g,"_");
 if(t.includes("TEMP"))return "HR-CONTRACT-TEMPORARY";
 if(t.includes("PROJECT"))return "HR-CONTRACT-PROJECT";
 if(t.includes("FIXED"))return "HR-CONTRACT-FULLTIME-FIXEDTERM";
 return "HR-CONTRACT-FULLTIME-PERMANENT";
}
function disciplineTemplate(a:any,requested?:string){
 if(requested)return requested;
 const x=String(a.disciplinary_document||a.document_type||"").toUpperCase();
 if(x.includes("FINAL"))return "HR-DISCIPLINARY-FINAL-WARNING";
 if(x.includes("NOTICE"))return "HR-DISCIPLINARY-NOTICE";
 return "HR-DISCIPLINARY-WARNING";
}
function lines(title:string,a:any,p:any){
 const employer=p.legal_name||p.trading_name||"Isaacs & Partners Client";
 const employee=a.employee_full_name||"Employee";
 return [
  title,
  "",
  "Prepared by Anthony Isaacs — Isaacs & Partners HR & Industrial Relations.",
  "Employer / Client: "+employer,
  "Employee: "+employee,
  a.employee_id_or_passport?"Employee ID / Passport: "+a.employee_id_or_passport:"",
  "",
  "1. Purpose",
  "This document records the employment/disciplinary information supplied through the authenticated Isaacs & Partners client workflow. It remains subject to professional review before issue as a final legal/HR instrument.",
  "2. Particulars",
  "Role / category: "+(a.role_or_category||"Not supplied"),
  "Employment relationship: "+(a.employment_relationship||"Not supplied"),
  "Remuneration: "+(a.remuneration||"Not supplied"),
  "Working hours: "+(a.working_hours||"Not supplied"),
  "Start date: "+(a.start_date||"Not supplied"),
  "End date: "+(a.end_date||"Not applicable"),
  "Duties: "+(a.job_duties||"Not supplied"),
  "Project scope: "+(a.project_scope||"Not applicable"),
  "Probation: "+(a.probation_period||"Not specified"),
  "Notice: "+(a.notice_period||"Not specified"),
  "Leave: "+(a.leave_entitlement||"Not specified"),
  "",
  "3. HR / disciplinary particulars",
  "Allegation / issue: "+(a.allegation_or_issue||"Not supplied"),
  "Incident date: "+(a.incident_date||"Not supplied"),
  "Facts: "+(a.facts||"Not supplied"),
  "Policy / rule allegedly breached: "+(a.policy_breached||"Not supplied"),
  "Employee response: "+(a.employee_response||"Not yet supplied"),
  "Prior warnings: "+(a.prior_warnings||"None stated"),
  "Corrective action / expected improvement: "+(a.corrective_action||"Not specified"),
  "Hearing date: "+(a.hearing_date||"Not specified"),
  "Hearing time: "+(a.hearing_time||"Not specified"),
  "Hearing location: "+(a.hearing_location||"Not specified"),
  "Charges: "+(a.charges||"Not specified"),
  "Employee rights / representation: "+(a.employee_rights||"To be confirmed by HR professional"),
  "",
  "4. Acknowledgement",
  "The parties acknowledge receipt of this document. Signature does not necessarily constitute agreement with every statement recorded above.",
  "",
  "Employee signature: ______________________________    Date: ______________",
  "Employer / representative: _________________________    Date: ______________",
  "",
  "ISAACS & PARTNERS — CONFIDENTIAL HR/IR DOCUMENT — HUMAN REVIEW REQUIRED"
 ].filter(Boolean);
}
async function brandLogo(){
 const org=await admin.from("organisation_profiles").select("logo_url").eq("is_active",true).order("created_at",{ascending:false}).limit(1).maybeSingle();
 const url=org.data?.logo_url||"https://www.isaacsandpartners.online/assets/logo.png";
 try{const r=await fetch(url);if(r.ok)return new Uint8Array(await r.arrayBuffer());}catch(_){}
 return null;
}
async function makePdf(title:string,body:string[]){
 const d=await PDFDocument.create(),p=d.addPage([595.28,841.89]);
 const regular=await d.embedFont(StandardFonts.Helvetica),bold=await d.embedFont(StandardFonts.HelveticaBold);
 const ink=rgb(.08,.08,.1),gold=rgb(.788,.635,.153),muted=rgb(.38,.4,.45);
 let y=790;
 p.drawText("ISAACS & PARTNERS",{x:42,y,size:18,font:bold,color:ink});
 p.drawText("HR & INDUSTRIAL RELATIONS",{x:42,y:y-18,size:8,font:bold,color:gold});
 y-=42;
 for(const line of body){const size=line===title?15:9;const font=line===title?bold:regular;const max=95;const chunks=String(line).match(new RegExp(".{1,"+max+"}(?:\\s|$)","g"))||[String(line)];for(const c of chunks){if(y<45){p.addPage([595.28,841.89]);y=790;}p.drawText(c.trim(),{x:42,y,size,font,color:line.includes("CONFIDENTIAL")?muted:ink});y-=line===title?20:14;}if(line==="")y-=6;}
 return d.save();
}
async function makeDocx(title:string,body:string[],logo?:Uint8Array|null){
 const children:any[]=[];
 if(logo){try{children.push(new Paragraph({children:[new ImageRun({data:logo,transformation:{width:170,height:48},type:"png"})],alignment:AlignmentType.LEFT}));}catch(_){}}
 children.push(new Paragraph({text:"ISAACS & PARTNERS",heading:HeadingLevel.TITLE}),new Paragraph({text:"HR & INDUSTRIAL RELATIONS",alignment:AlignmentType.LEFT}));
 for(const line of body){children.push(new Paragraph({children:[new TextRun({text:line,bold:line===title||line.startsWith("ISAACS & PARTNERS")})]}));}
 return Packer.toBuffer(new Document({sections:[{properties:{},children}]}));
}
async function generateDocument(req:Request,body:any,a:any){
 const matter=await getMatter(clean(body.matter_id,100),a.userId,a.internal);
 if(!["OPEN","IN_PROGRESS","AWAITING_CLIENT"].includes(String(matter.status)))throw new Error("HR document generation requires an operational matter after the commercial gate.");
 const ans=(await latestAnswers(matter)).qualifying_answers||{};
 const requested=clean(body.template_code,100);
 const code=requested|| (matter.service_type==="HR-EMPLOYMENT-CONTRACTS"?contractTemplate(ans):disciplineTemplate(ans));
 const tq=await admin.from("hr_document_templates").select("*").eq("template_code",code).eq("active",true).maybeSingle();if(tq.error||!tq.data)throw new Error("HR document template is not registered.");
 const missing=requiredFor(tq.data,ans);if(missing.length)throw new Error("Anthony cannot complete this document yet. Missing questionnaire answers: "+missing.join(", "));
 const p=await profile(matter.individual_user_id,matter.business_id);
 const title=tq.data.name;
 const bodyLines=lines(title,ans,p);
 const [pdf,logo]=await Promise.all([makePdf(title,bodyLines),brandLogo()]);
 const docx=await makeDocx(title,bodyLines,logo);
 const base=(matter.reference_number||matter.id)+"/"+code+"-"+crypto.randomUUID();
 const pu=await admin.storage.from("hr-generated").upload(base+".pdf",pdf,{contentType:"application/pdf",upsert:false});
 if(pu.error)throw pu.error;
 const du=await admin.storage.from("hr-generated").upload(base+".docx",docx,{contentType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",upsert:false});
 if(du.error)throw du.error;
 const ins=await admin.from("hr_generated_documents").insert({matter_id:matter.id,client_user_id:matter.individual_user_id,business_id:matter.business_id,template_code:code,document_type:"HR_GENERATED",title,version:tq.data.version,status:"NEEDS_HUMAN_REVIEW",docx_path:base+".docx",pdf_path:base+".pdf",source_answers:ans,provenance:{assistant:"Anthony Isaacs",brand:"Isaacs & Partners",template_version:tq.data.version,generated_at:new Date().toISOString() },created_by:a.userId}).select("id").single();
 if(ins.error)throw ins.error;
 const [ps,ds]=await Promise.all([admin.storage.from("hr-generated").createSignedUrl(base+".pdf",86400),admin.storage.from("hr-generated").createSignedUrl(base+".docx",86400)]);
 return {ok:true,document_id:ins.data.id,template_code:code,title,status:"NEEDS_HUMAN_REVIEW",pdf_url:ps.data?.signedUrl,docx_url:ds.data?.signedUrl,missing:[]};
}
const brackets=[
 [245100,.18,0],[383100,.26,44118],[530200,.31,79998],[695800,.36,125599],[887000,.39,185215],[1878600,.41,259783],[Infinity,.45,666339]
];
function annualTax(taxable:number){for(const [upper,rate,base] of brackets){const lower=upper===Infinity?1878600:brackets.findIndex(x=>x[0]===upper)===0?0:brackets[brackets.findIndex(x=>x[0]===upper)-1][0] as number;if(taxable<=upper)return Math.max(0,base+(taxable-lower)*rate);}return 0;}
function calcPayrollEmployee(e:any){
 const gross=Math.max(Number(e.basic_salary)||0,0);
 const age=Number(e.age)||0;
 const annual=gross*12;
 const rebate=age>=75?17820+9765+3249:age>=65?17820+9765:17820;
 const paye=Math.max(0,(annualTax(annual)-rebate)/12);
 const uif=Math.min(gross,17712)*.01;
 const sdl=gross*.01;
 return {gross_pay:gross,taxable_income:gross,paye:Math.round(paye*100)/100,uif_employee:Math.round(uif*100)/100,uif_employer:Math.round(uif*100)/100,sdl:Math.round(sdl*100)/100,net_pay:Math.round((gross-paye-uif)*100)/100,source_codes:{PAYE:"4102",UIF:"4141",SDL:"4142"},calculation_status:"CORE_SALARY_ONLY"};
}
async function payroll(body:any,a:any){
 if(!a.internal&&!["BUSINESS","STAFF","SUPER_ADMIN"].includes(a.role))throw new Error("Payroll Centre is available to business customers and authorised staff.");
 const businessId=clean(body.business_id,100);if(!businessId)throw new Error("business_id is required.");
 const b=await admin.from("businesses").select("*").eq("id",businessId).maybeSingle();if(b.error||!b.data)throw new Error("Business not found.");
 if(!a.internal&&a.role==="BUSINESS"&&b.data.owner_user_id!==a.userId)throw new Error("Business is outside your access scope.");
 let emps:any[]=body.employees||[];if(!emps.length){const q=await admin.from("hr_employees").select("*").eq("business_id",businessId).eq("employment_status","ACTIVE");if(q.error)throw q.error;emps=q.data||[];}
 if(!emps.length)throw new Error("No active employees found.");
 const periodStart=clean(body.period_start,20),periodEnd=clean(body.period_end,20);
 const rows=emps.map(calcPayrollEmployee);
 const run=await admin.from("hr_payroll_runs").insert({business_id:businessId,period_start:periodStart,period_end:periodEnd,pay_date:clean(body.pay_date,20)||null,tax_year:2027,status:"CALCULATED",rules_version:"SARS-2027",total_gross:rows.reduce((s,x)=>s+x.gross_pay,0),total_paye:rows.reduce((s,x)=>s+x.paye,0),total_uif_employee:rows.reduce((s,x)=>s+x.uif_employee,0),total_uif_employer:rows.reduce((s,x)=>s+x.uif_employer,0),total_sdl:rows.reduce((s,x)=>s+x.sdl,0),metadata:{engine:"Isaacs & Partners HR Payroll Centre",calculation_scope:"CORE_SALARY_ONLY",source:"SARS 2027 employer guide"}}).select("id").single();
 if(run.error)throw run.error;
 for(let i=0;i<emps.length;i++){const x=rows[i];const ins=await admin.from("hr_payroll_entries").insert({payroll_run_id:run.data.id,employee_id:emps[i].id,gross_pay:x.gross_pay,taxable_income:x.taxable_income,paye:x.paye,uif_employee:x.uif_employee,uif_employer:x.uif_employer,sdl:x.sdl,net_pay:x.net_pay,source_codes:x.source_codes,earnings:{basic_salary:x.gross_pay},deductions:{paye:x.paye,uif:x.uif_employee}});if(ins.error)throw ins.error;}
 return {ok:true,payroll_run_id:run.data.id,rules_version:"SARS-2027",status:"CALCULATED",employee_count:emps.length,totals:{gross:rows.reduce((s,x)=>s+x.gross_pay,0),paye:rows.reduce((s,x)=>s+x.paye,0),uif_employee:rows.reduce((s,x)=>s+x.uif_employee,0),uif_employer:rows.reduce((s,x)=>s+x.uif_employer,0),sdl:rows.reduce((s,x)=>s+x.sdl,0)},notice:"Core-salary calculation only. Variable remuneration, benefits, directives, ETI and full BRS validation must be completed before a SARS submission is treated as final."};
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const body=req.method==="POST"?await req.json():Object.fromEntries(new URL(req.url).searchParams.entries());
  const a=await auth(req,body);
  const action=clean(body.action,80).toUpperCase();
  if(action==="TEMPLATES"){const q=await admin.from("hr_document_templates").select("template_code,service_code,name,description,version,required_answers").eq("active",true).order("service_code").order("name");return json({ok:true,templates:q.data||[]});}
  if(action==="GENERATE_DOCUMENT")return json(await generateDocument(req,body,a));
  if(action==="CALCULATE_PAYROLL")return json(await payroll(body,a));
  if(action==="PAYROLL_RUNS"){if(!["BUSINESS","STAFF","SUPER_ADMIN"].includes(a.role)&&!a.internal)throw new Error("Payroll access denied.");const q=await admin.from("hr_payroll_runs").select("*").eq("business_id",clean(body.business_id,100)).order("created_at",{ascending:false}).limit(20);return json({ok:true,runs:q.data||[]});}
  return json({error:"Unsupported action."},400);
 }catch(e){return json({error:e instanceof Error?e.message:"HR operations request failed."},400);}
});