import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const esc=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const money=v=>new Intl.NumberFormat("en-ZA",{style:"currency",currency:"ZAR"}).format(Number(v)||0);

export default class ClientEstimateEngine{
 constructor({dashboard}){this.dashboard=dashboard;this.supabase=dashboard.supabase;this.services=[];this.questions=[];}
 async load(){
  const [s,q]=await Promise.all([
   this.supabase.from("service_catalog").select("id,code,name,service_domain,description,pricing_mode,default_currency,minimum_fee").eq("active",true).order("name"),
   this.supabase.from("service_qualification_questions").select("*").eq("active",true).order("service_code").order("sort_order")
  ]);
  if(s.error)throw s.error;if(q.error)throw q.error;const clientCodes=["IMMIGRATION","BUSINESS-COMPLIANCE-RETAINER","HR-PAYROLL-OUTSOURCING","HR-TEMP-STAFFING","TEMP_OUTSOURCING","PERM_OUTSOURCING","LEGAL_SERVICES","NOTARY_MEDIATION"];this.services=(s.data||[]).filter(x=>clientCodes.includes(x.code));this.questions=q.data||[];return this.services;
 }
 async open(){
  await this.load();
  this.dashboard.modal('<span class="cp-eyebrow">Controlled Commercial Workflow</span><h2>Request an estimate</h2><p>Anthony will ask the qualifying questions, prepare an <strong>indicative estimate</strong>, and route the request to Super Admin. No final price is released until approval.</p><div class="cp-service-grid" data-estimate-services>'+this.services.map((s,i)=>'<button class="cp-service" data-estimate-service="'+i+'"><strong>'+esc(s.name)+'</strong><span>'+esc(s.description||s.service_domain||"Service")+'</span></button>').join("")+'</div>');
  document.querySelectorAll("[data-estimate-service]").forEach(b=>b.onclick=()=>this.form(this.services[Number(b.dataset.estimateService)]));
 }
 form(service){
  const qs=this.questions.filter(q=>q.service_code===service.code);
  const fields=qs.length?qs.map(q=>this.field(q)).join(""):'<label>Tell Anthony what you need<textarea data-estimate-answer="details" rows="5" required></textarea></label>';
  this.dashboard.modal('<span class="cp-eyebrow">'+esc(service.name)+'</span><h2>Qualifying questions</h2><p>These answers are used only to prepare an indicative estimate and commercial approval request.</p><div class="cp-form">'+fields+'<div class="cp-alert" data-estimate-note>Final pricing is not being issued at this stage.</div><button class="cp-btn cp-btn-gold" data-create-estimate>Create indicative estimate</button></div>');
  document.querySelector("[data-create-estimate]").onclick=()=>this.submit(service,qs);
 }
 field(q){
  const a='data-estimate-answer="'+esc(q.question_key)+'"';
  if(q.input_type==="BOOLEAN")return '<label>'+esc(q.question_text)+'<select '+a+'><option value="false">No</option><option value="true">Yes</option></select></label>';
  if(q.input_type==="MULTISELECT")return '<label>'+esc(q.question_text)+'<input '+a+' placeholder="Separate items with commas"></label>';
  const type=q.input_type==="NUMBER"?"number":"text";
  return '<label>'+esc(q.question_text)+'<input '+a+' type="'+type+'" '+(q.required?"required":"")+'></label>';
 }
 async submit(service,qs){
  const answers={};for(const q of qs){const el=document.querySelector("[data-estimate-answer='"+CSS.escape(q.question_key)+"']");if(!el)continue;let v=el.value;if(q.input_type==="BOOLEAN")v=v==="true";if(q.input_type==="NUMBER")v=Number(v||0);if(q.input_type==="MULTISELECT")v=v.split(",").map(x=>x.trim()).filter(Boolean);answers[q.question_key]=v;}
  const detail=document.querySelector('[data-estimate-answer="details"]');if(detail)answers.details=detail.value.trim();
  const token=auth.getToken();if(!token)throw new Error("Your session has expired.");
  const businessId=this.dashboard.role==="BUSINESS"?this.dashboard.data.businesses?.[0]?.id:null;
  const phone=this.dashboard.data.profile?.phone||this.dashboard.user?.phone||null;
  const r=await fetch(authConfig.supabase.url+"/functions/v1/commercial-approval-engine",{method:"POST",headers:{Authorization:"Bearer "+token,apikey:authConfig.supabase.publishableKey,"Content-Type":"application/json"},body:JSON.stringify({action:"CREATE_ESTIMATE",client_user_id:this.dashboard.user.id,business_id:businessId,service_code:service.code,qualifying_answers:answers,request_data:{channel:"PORTAL",phone_number:phone}})});
  const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||"Estimate could not be created.");
  this.dashboard.closeModal();
  this.dashboard.alert("Indicative estimate prepared: "+(b.rough_low?money(b.rough_low)+" – ":"")+money(b.rough_high||0)+". This is not a final quote. Super Admin approval is now required.");
  await this.dashboard.refresh();
  this.dashboard.openSection("estimates");
 }
}