import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";
import { resolveUserDashboardRole } from "../dashboard/DashboardAccess.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=v=>new Intl.NumberFormat("en-ZA",{style:"currency",currency:"ZAR"}).format(Number(v)||0);
const api=()=>authConfig.supabase.url+"/functions/v1/hr-operations-runtime";
let sb=null,user=null,role=null,businesses=[],matters=[],profile=null;

async function init(){
 await auth.initialise();
 if(!auth.isAuthenticated())return;
 user=auth.getCurrentUser();
 role=await resolveUserDashboardRole(user);
 if(!["INDIVIDUAL","BUSINESS"].includes(role))return;
 sb=createClient(authConfig.supabase.url,authConfig.supabase.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const s=await sb.auth.setSession({access_token:auth.getToken(),refresh_token:auth.getRefreshToken()});
 if(s.error)throw s.error;
 const [p,b,m]=await Promise.all([
  sb.from("client_legal_profiles").select("*").eq("user_id",user.id).maybeSingle(),
  sb.from("businesses").select("*").eq("owner_user_id",user.id).eq("is_active",true).order("legal_name"),
  sb.from("matters").select("id,reference_number,title,status,service_type,business_id,individual_user_id,portal_metadata,created_at").order("created_at",{ascending:false}).limit(100)
 ]);
 profile=p.data||{};
 businesses=b.data||[];
 matters=(m.data||[]).filter(x=>x.individual_user_id===user.id||(x.business_id&&businesses.some(y=>y.id===x.business_id)));
 mount();
}

function mount(){
 const nav=document.querySelector(".cp-nav"),main=document.querySelector(".cp-main");if(!nav||!main)return;
 if(!nav.querySelector('[data-section="hr-operations"]')){
  const b=document.createElement("button");b.dataset.section="hr-operations";b.textContent="▦ HR Operations";nav.appendChild(b);
 }
 if(!document.querySelector('[data-panel="hr-operations"]')){
  const s=document.createElement("section");s.className="cp-section";s.dataset.panel="hr-operations";s.innerHTML=panel();main.appendChild(s);
 }
 bind();render();
}
function panel(){
 return '<div class="cp-section-head"><div><span class="cp-eyebrow">Isaacs & Partners HR Platform</span><h2>HR Operations Centre</h2><p>Client profile, HR document factory, payroll and statutory records in one authenticated workspace.</p></div></div>'+
 '<div class="cp-grid cp-grid-2">'+
 '<article class="cp-card"><header><div><span class="cp-eyebrow">Client & Legal Profile</span><h2>Billing & recovery identity</h2></div></header><div class="cp-card-body cp-form" data-hr-profile-form></div></article>'+
 '<article class="cp-card"><header><div><span class="cp-eyebrow">Document Centre</span><h2>Agreements & generated documents</h2></div></header><div class="cp-card-body" data-hr-documents></div></article>'+
 '</div>'+
 '<article class="cp-card"><header><div><span class="cp-eyebrow">Anthony Document Factory</span><h2>Generate HR documents</h2><p>Anthony uses the stored qualification answers and client profile. Human review remains required before final issue.</p></div></header><div class="cp-card-body" data-hr-generator></div></article>'+
 (role==="BUSINESS"?'<article class="cp-card"><header><div><span class="cp-eyebrow">Payroll & SARS Centre</span><h2>Payroll, payslips and employer records</h2><p>Designed as the Isaacs & Partners payroll workspace. Current engine is anchored to the SARS 2027 tax year and records its rules version on each run.</p></div></header><div class="cp-card-body" data-payroll-centre></div></article>':"");
}
function bind(){
 const p=document.querySelector("[data-hr-profile-form]"); if(p)p.addEventListener("submit",saveProfile);
 const g=document.querySelector("[data-hr-generator]"); if(g)g.addEventListener("click",e=>{const b=e.target.closest("[data-generate-hr]");if(b)generate(b.dataset.generateHr,b.dataset.template)});
 const pc=document.querySelector("[data-payroll-centre]");if(pc)pc.addEventListener("click",e=>{const a=e.target.closest("[data-payroll-action]");if(a)payrollAction(a.dataset.payrollAction)});
}
function render(){
 const p=document.querySelector("[data-hr-profile-form]");
 if(p)p.innerHTML='<div class="cp-form"><label>Client type<select name="client_type"><option value="INDIVIDUAL">Individual</option><option value="BUSINESS">Business</option></select></label><label>Legal name<input name="legal_name" value="'+esc(profile.legal_name||[profile.first_name,profile.last_name].filter(Boolean).join(" "))+'"></label><label>Trading name<input name="trading_name" value="'+esc(profile.trading_name||"")+'"></label><label>Company registration number<input name="company_registration_number" value="'+esc(profile.company_registration_number||"")+'"></label><label>ID / Passport number<input name="id_number" value="'+esc(profile.id_number||profile.passport_number||"")+'"></label><label>Tax number<input name="tax_number" value="'+esc(profile.tax_number||"")+'"></label><label>VAT number<input name="vat_number" value="'+esc(profile.vat_number||"")+'"></label><label>Responsible person<input name="responsible_person_name" value="'+esc(profile.responsible_person_name||"")+'"></label><label>Billing email<input type="email" name="billing_email" value="'+esc(profile.billing_email||profile.email||"")+'"></label><label>Billing contact phone<input name="billing_contact_phone" value="'+esc(profile.billing_contact_phone||profile.phone||"")+'"></label><label>Physical address<textarea name="physical_address" rows="2">'+esc(profile.physical_address||"")+'</textarea></label><label>Legal recovery address<textarea name="legal_recovery_address" rows="2">'+esc(profile.legal_recovery_address||profile.physical_address||"")+'</textarea></label><label>Legal recovery email<input type="email" name="legal_recovery_email" value="'+esc(profile.legal_recovery_email||profile.billing_email||profile.email||"")+'"></label><label>Payment terms<input name="payment_terms" value="'+esc(profile.payment_terms||"50% deposit before work starts; balance before final delivery")+'"></label><label class="cp-check"><input type="checkbox" name="popia_consent" '+(profile.popia_consent?"checked":"")+'> I consent to Isaacs & Partners storing and using this profile for service delivery, billing and lawful recovery.</label><button class="cp-btn cp-btn-gold" type="submit">Save client profile</button></div>';
 const d=document.querySelector("[data-hr-documents]");
 if(d){
  d.innerHTML='<div class="cp-grid cp-grid-2"><div><strong>Client document centre</strong><ul><li>Service Level Agreements</li><li>Retainer agreements</li><li>Temporary placement contracts</li><li>Permanent placement contracts</li><li>Quotes, invoices and receipts</li><li>HR-generated contracts and disciplinary documents</li></ul></div><div data-hr-generated-list>Loading generated documents…</div></div>';
  loadGenerated();
 }
 renderGenerator(); if(role==="BUSINESS")renderPayroll();
}
function renderGenerator(){
 const g=document.querySelector("[data-hr-generator]");if(!g)return;
 const hr=matters.filter(m=>/^HR-/i.test(m.service_type||""));
 if(!hr.length){g.innerHTML='<p>No HR matters are currently linked to this account. Start an HR service request and Anthony will retain the questionnaire answers for document generation.</p>';return;}
 g.innerHTML=hr.slice(0,12).map(m=>'<div class="cp-card" style="margin-bottom:12px;padding:14px"><strong>'+esc(m.title||m.service_type)+'</strong><span style="display:block">Status: '+esc(m.status)+' · '+esc(m.reference_number||m.id)+'</span>'+(/^HR-EMPLOYMENT-CONTRACTS$/i.test(m.service_type)?'<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap"><button class="cp-btn cp-btn-light" data-generate-hr="'+m.id+'" data-template="HR-CONTRACT-FULLTIME-PERMANENT">Permanent</button><button class="cp-btn cp-btn-light" data-generate-hr="'+m.id+'" data-template="HR-CONTRACT-FULLTIME-FIXEDTERM">Fixed-term</button><button class="cp-btn cp-btn-light" data-generate-hr="'+m.id+'" data-template="HR-CONTRACT-TEMPORARY">Temporary</button><button class="cp-btn cp-btn-light" data-generate-hr="'+m.id+'" data-template="HR-CONTRACT-PROJECT">Project</button></div>':"")+(/^HR-DISCIPLINARY-HEARINGS$/i.test(m.service_type)?'<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap"><button class="cp-btn cp-btn-light" data-generate-hr="'+m.id+'" data-template="HR-DISCIPLINARY-WARNING">Written warning</button><button class="cp-btn cp-btn-light" data-generate-hr="'+m.id+'" data-template="HR-DISCIPLINARY-FINAL-WARNING">Final warning</button><button class="cp-btn cp-btn-light" data-generate-hr="'+m.id+'" data-template="HR-DISCIPLINARY-NOTICE">Notice to attend</button></div>':"")+'</div>').join("");
}
async function saveProfile(e){
 e.preventDefault();const fd=new FormData(e.currentTarget),x=Object.fromEntries(fd.entries());x.user_id=user.id;x.popia_consent=fd.get("popia_consent")==="on";x.profile_status=x.legal_name&&x.billing_email&&x.legal_recovery_address?"COMPLETE":"INCOMPLETE";x.profile_completeness=Math.round(["legal_name","billing_email","legal_recovery_address","payment_terms"].filter(k=>x[k]).length/4*100);
 const r=await sb.from("client_legal_profiles").upsert(x,{onConflict:"user_id"});if(r.error){alert(r.error.message);return}profile={...profile,...x};alert("Client profile saved. It is now available to Anthony for billing, document population and lawful recovery records.");}
async function generate(matterId,template){
 const r=await fetch(api(),{method:"POST",headers:{Authorization:"Bearer "+auth.getToken(),apikey:authConfig.supabase.publishableKey,"Content-Type":"application/json"},body:JSON.stringify({action:"GENERATE_DOCUMENT",matter_id:matterId,template_code:template})});
 const b=await r.json();if(!r.ok)throw new Error(b.error||"Document generation failed.");window.open(b.pdf_url,"_blank","noopener");if(b.docx_url)window.open(b.docx_url,"_blank","noopener");loadGenerated();
}
async function loadGenerated(){
 const el=document.querySelector("[data-hr-generated-list]");if(!el)return;
 const r=await sb.from("hr_generated_documents").select("id,title,status,template_code,created_at,pdf_path,docx_path").order("created_at",{ascending:false}).limit(20);
 if(r.error){el.textContent=r.error.message;return}
 el.innerHTML=(r.data||[]).length?(r.data||[]).map(x=>'<div style="padding:8px 0;border-bottom:1px solid #ddd"><strong>'+esc(x.title)+'</strong><small style="display:block">'+esc(x.status)+' · '+esc(new Date(x.created_at).toLocaleString("en-ZA"))+'</small></div>').join(""):"No generated HR documents yet.";
}
function renderPayroll(){
 const p=document.querySelector("[data-payroll-centre]");if(!p)return;const b=businesses[0];
 p.innerHTML='<div class="cp-grid cp-grid-2"><div class="cp-form"><label>Business<select data-payroll-business>'+businesses.map(x=>'<option value="'+x.id+'">'+esc(x.legal_name||x.trading_name)+'</option>').join("")+'</select></label><label>Period start<input type="date" data-payroll-start value="2026-09-01"></label><label>Period end<input type="date" data-payroll-end value="2026-09-30"></label><label>Pay date<input type="date" data-payroll-date></label><button class="cp-btn cp-btn-gold" data-payroll-action="calculate">Calculate payroll</button></div><div><strong>Statutory scope</strong><ul><li>PAYE annual-equivalent core salary calculation</li><li>UIF employee + employer contribution</li><li>SDL employer contribution</li><li>Payroll rules version recorded as SARS-2027</li><li>Payroll data structured for payslips and future EMP201/EMP501 exports</li></ul><small>Final SARS filing still requires current SARS BRS validation and the prescribed electronic submission channel.</small></div></div><div data-payroll-result style="margin-top:16px"></div>';
}
async function payrollAction(action){
 if(action!=="calculate")return;const b=document.querySelector("[data-payroll-business]")?.value;if(!b)return;
 const payload={action:"CALCULATE_PAYROLL",business_id:b,period_start:document.querySelector("[data-payroll-start]")?.value,period_end:document.querySelector("[data-payroll-end]")?.value,pay_date:document.querySelector("[data-payroll-date]")?.value||null};
 const r=await fetch(api(),{method:"POST",headers:{Authorization:"Bearer "+auth.getToken(),apikey:authConfig.supabase.publishableKey,"Content-Type":"application/json"},body:JSON.stringify(payload)});const x=await r.json();const out=document.querySelector("[data-payroll-result]");if(!r.ok){out.textContent=x.error||"Payroll failed";return}out.innerHTML='<div class="cp-alert">Payroll run '+esc(x.payroll_run_id)+' calculated for '+esc(x.employee_count)+' employees. Gross '+money(x.totals.gross)+' · PAYE '+money(x.totals.paye)+' · UIF '+money(x.totals.uif_employee)+' · SDL '+money(x.totals.sdl)+'. '+esc(x.notice)+'</div>';}
init().catch(e=>console.error("[HR Operations Centre]",e));