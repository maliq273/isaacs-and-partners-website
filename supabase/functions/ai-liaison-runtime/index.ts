import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import WhatsAppAgent from "https://raw.githubusercontent.com/maliq273/isaacs-and-partners-website/main/app/communication/agents/WhatsAppAgent.js";
import AIProviderService from "https://raw.githubusercontent.com/maliq273/isaacs-and-partners-website/main/app/ai/providers/AIProviderService.js";
import CompanyTruthService from "https://raw.githubusercontent.com/maliq273/isaacs-and-partners-website/main/app/ai/CompanyTruthService.js";
import TruthFusionEngine from "./TruthFusionEngine.js";
import HistoricalMemoryRetrievalService from "https://raw.githubusercontent.com/maliq273/isaacs-and-partners-website/main/app/ai/HistoricalMemoryRetrievalService.js";
import CustomerRelationshipMemoryEngine from "https://raw.githubusercontent.com/maliq273/isaacs-and-partners-website/main/app/ai/CustomerRelationshipMemoryEngine.js";
import RelationshipOperationalIntelligenceEngine from "https://raw.githubusercontent.com/maliq273/isaacs-and-partners-website/main/app/ai/RelationshipOperationalIntelligenceEngine.js";
import AuthorityRoleIntelligenceEngine from "https://raw.githubusercontent.com/maliq273/isaacs-and-partners-website/main/app/ai/AuthorityRoleIntelligenceEngine.js";
import IdentityRelationshipResolutionEngine from "https://raw.githubusercontent.com/maliq273/isaacs-and-partners-website/main/app/ai/IdentityRelationshipResolutionEngine.js";
import AnthonyAuthorizationEngine from "https://raw.githubusercontent.com/maliq273/isaacs-and-partners-website/main/app/ai/AnthonyAuthorizationEngine.js";
import AuthorityActionService from "https://raw.githubusercontent.com/maliq273/isaacs-and-partners-website/main/app/ai/AuthorityActionService.js?v=c519189c786688ba916193c9e43a9f69cdcb6820";
import AuthorityInteractionEngine from "./AuthorityInteractionEngine.js";
import ImmigrationQualificationWorkflowService from "https://raw.githubusercontent.com/maliq273/isaacs-and-partners-website/main/app/ai/ImmigrationQualificationWorkflowService.js?v=275afafb839eda960f834020b7c35b7cdb587650";
import { hindsightBank, hindsightRecall, hindsightRetain } from "./_shared/hindsight.ts";
import { getImmigrationFormIntelligence } from "https://raw.githubusercontent.com/maliq273/isaacs-and-partners-website/main/app/immigration/ImmigrationFormIntelligenceRegistry.js";
import AnthonyWorkerOrchestrator from "https://raw.githubusercontent.com/maliq273/isaacs-and-partners-website/main/app/ai/workers/AnthonyWorkerOrchestrator.js";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ANON_KEY=Deno.env.get("SUPABASE_ANON_KEY")??Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
const INTERNAL_WORKER_TOKEN=Deno.env.get("OPENWA_WORKER_TOKEN");
const ALLOWED_ORIGIN=Deno.env.get("AI_LIAISON_ALLOWED_ORIGIN")??"https://www.isaacsandpartners.online";
if(!SUPABASE_URL||!SERVICE_ROLE_KEY)throw new Error("AI liaison runtime configuration is incomplete.");
const admin=createClient(SUPABASE_URL,SERVICE_ROLE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
const corsHeaders={"Access-Control-Allow-Origin":ALLOWED_ORIGIN,"Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-ai-internal-worker-token, x-openwa-worker-token","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
function json(b:any,s=200){return new Response(JSON.stringify(b),{status:s,headers:corsHeaders})}
function clean(v:any,m=4096){return String(v??"").trim().slice(0,m)}
function nullable(v:any,m=255){const t=clean(v,m);return t||null}
function channelOf(v:any){const c=clean(v,32).toUpperCase()||"PORTAL";if(!["PORTAL","WHATSAPP","EMAIL","OTHER"].includes(c))throw new Error("Invalid conversation channel.");return c}
function isDirectChat(id:string){const c=clean(id,255).toLowerCase();return !!c&&!c.endsWith("@g.us")&&!c.endsWith("@broadcast")&&!c.endsWith("@newsletter")&&c!=="status@broadcast"&&(c.endsWith("@c.us")||c.endsWith("@lid")||/^\d{6,20}$/.test(c))}
async function authenticate(req:Request,p:any){const it=clean(req.headers.get("X-AI-Internal-Worker-Token"),512)||clean(req.headers.get("X-OpenWA-Worker-Token"),512);if(it){if(!INTERNAL_WORKER_TOKEN||it!==INTERNAL_WORKER_TOKEN)throw new Response(JSON.stringify({error:"Invalid internal worker credentials."}),{status:401,headers:corsHeaders});const uid=clean(p?.userId,128);if(!uid)return{caller:admin,user:null,internal:true};const{data,error}=await admin.auth.admin.getUserById(uid);if(error||!data?.user?.id)throw new Response(JSON.stringify({error:"Internal client could not be resolved."}),{status:404,headers:corsHeaders});return{caller:admin,user:data.user,internal:true}}if(!ANON_KEY)throw new Response(JSON.stringify({error:"AI portal authentication is not configured."}),{status:503,headers:corsHeaders});const token=clean(req.headers.get("Authorization")).replace(/^Bearer\s+/i,"");if(!token)throw new Response(JSON.stringify({error:"Authentication is required."}),{status:401,headers:corsHeaders});const caller=createClient(SUPABASE_URL,ANON_KEY,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{autoRefreshToken:false,persistSession:false}});const{data,error}=await caller.auth.getUser(token);if(error||!data?.user?.id)throw new Response(JSON.stringify({error:"Authenticated user could not be verified."}),{status:401,headers:corsHeaders});return{caller,user:data.user,internal:false}}
async function matterFor(uid:string|null,mid:string|null,identity:any){if(!mid)return null;const{data,error}=await admin.from("matters").select("*").eq("id",mid).maybeSingle();if(error)throw error;if(!data)return null;const role=String(identity?.authorityRole||"").toUpperCase();if(role==="SUPER_ADMIN")return data;if(role==="STAFF"&&identity?.staff?.id){const a=await admin.from("assignments").select("matter_id,status").eq("staff_id",identity.staff.id).eq("matter_id",mid);if(a.error)throw a.error;if(a.data?.some((x:any)=>!x.status||!["COMPLETED","CANCELLED","CLOSED"].includes(String(x.status).toUpperCase())))return data;}if(uid&&data.individual_user_id===uid)return data;if(uid&&data.business_id){const r=await admin.from("businesses").select("id").eq("id",data.business_id).eq("owner_user_id",uid).maybeSingle();if(r.error)throw r.error;if(r.data)return data}throw new Error("You are not authorised to use this matter in the AI conversation.")}
async function conversation(uid:string|null,chatId:string,phone:string|null,channel:string,mid:string|null){const q=await admin.from("ai_conversations").select("*").eq("channel",channel).eq("chat_id",chatId).order("updated_at",{ascending:false}).limit(1).maybeSingle();if(q.error)throw q.error;if(q.data){if(q.data.client_user_id&&uid&&q.data.client_user_id!==uid)throw new Error("Conversation belongs to another user.");return q.data}const r=await admin.from("ai_conversations").insert({client_user_id:uid,matter_id:mid,chat_id:chatId,phone_number:phone,channel,state:"AI_ACTIVE",metadata:{source:"ai-liaison-runtime",created_by:"trusted-runtime"}}).select("*").single();if(r.error)throw r.error;return r.data}
async function history(cid:string){const r=await admin.from("ai_conversation_messages").select("id,direction,body,sender_type,metadata,created_at,intent,service_domain").eq("conversation_id",cid).order("created_at",{ascending:false}).limit(40);if(r.error)throw r.error;return(r.data||[]).reverse().map((x:any)=>({id:x.id,direction:x.direction,body:x.body,sender:x.sender_type,messageId:x.id,metadata:x.metadata||{},createdAt:x.created_at,intent:x.intent||null,serviceDomain:x.service_domain||null}))}
async function append(cid:string,sender:string,dir:string,body:string,intent:any,domain:any,metadata:any){const safeSender=["SUPER_ADMIN","STAFF","CLIENT","AI"].includes(String(sender||""))?sender:"CLIENT";const r=await admin.rpc("ai_append_conversation_message",{p_conversation_id:cid,p_sender_type:safeSender,p_direction:dir,p_body:body,p_intent:intent,p_service_domain:domain,p_metadata:{...(metadata||{}),identity_type:sender||"UNKNOWN"}});if(r.error)throw r.error;return r.data}
async function persistMemories(records:any[]){for(const record of records||[]){let q:any=admin.from("ai_customer_memories").select("id").eq("category",record.category).eq("memory_key",record.memory_key).eq("value_text",record.value_text).limit(1);if(record.contact_id)q=q.eq("contact_id",record.contact_id);else if(record.client_user_id)q=q.eq("client_user_id",record.client_user_id);else if(record.conversation_id)q=q.eq("conversation_id",record.conversation_id);const existing=await q.maybeSingle();if(existing.error&&existing.error.code!=="PGRST116")throw existing.error;if(existing.data?.id){const u=await admin.from("ai_customer_memories").update({last_confirmed_at:record.last_confirmed_at,last_seen_at:record.last_seen_at,status:"ACTIVE",evidence:record.evidence,source_message_id:record.source_message_id,metadata:record.metadata}).eq("id",existing.data.id);if(u.error)throw u.error}else{const ins=await admin.from("ai_customer_memories").insert(record);if(ins.error)throw ins.error}}}
async function queue(con:any,uid:string|null,body:string,phone:string|null,mid:string|null,source:string|null,attachment:any=null){if(!isDirectChat(con.chat_id))throw new Error("Outbound WhatsApp delivery is restricted to direct contacts.");const key=`ai-reply:${con.id}:${source||Date.now()}`;const ex=await admin.from("communication_messages").select("id").eq("idempotency_key",key).maybeSingle();if(ex.error&&ex.error.code!=="PGRST116")throw ex.error;if(ex.data?.id)return ex.data.id;const m=await admin.from("communication_messages").insert({customer_user_id:uid,matter_id:mid||con.matter_id||null,channel:"WHATSAPP",direction:"OUTBOUND",phone_number:phone||con.phone_number||null,chat_id:con.chat_id,body:body.slice(0,4096),status:"QUEUED",idempotency_key:key,metadata:{source:"ai-liaison-runtime",conversation_id:con.id,source_message_id:source,...(attachment?.url?{document_url:attachment.url,document_filename:attachment.filename||"Isaacs-Partners-DHA-1738-Draft.pdf",document_mimetype:"application/pdf"}:{})}}).select("id").single();if(m.error)throw m.error;const o=await admin.from("communication_outbox").insert({message_id:m.data.id,session_id:null,chat_id:con.chat_id,status:"QUEUED"});if(o.error)throw o.error;return m.data.id}
const QUALIFICATION_STATES=new Set(["NEW","ASK_WHATSAPP_CONSENT","ASK_MATTER","ASK_EMAIL","ASK_NAME","ASK_ACCOUNT_TYPE","IDENTITY_MATCHING"]);
const PENDING_QUALIFICATION_STATES=new Set(["STAFF_PENDING_APPROVAL","CLIENT_PENDING_APPROVAL"]);
async function persistWhatsAppQualification(contact:any,qualification:any,conversationId:string){
  if(!contact?.id||!qualification)return contact;
  const facts={...(contact.onboarding_facts||{}),...(qualification.facts||{})};
  const accountType=String(facts.claimedAccountType||contact.claimed_account_type||"").toUpperCase()||null;
  const state=String(qualification.nextState||contact.onboarding_state||"NEW").toUpperCase();
  const pending=PENDING_QUALIFICATION_STATES.has(state);
  const patch:any={onboarding_state:state,onboarding_facts:facts,claimed_account_type:accountType,updated_at:new Date().toISOString()};
  if(pending){patch.dashboard_status="PENDING_ADMIN_APPROVAL";patch.account_match_status="PENDING_ADMIN_REVIEW";patch.identity_status="UNAUTHENTICATED_WHATSAPP_CONTACT";}
  if(facts.firstName)patch.first_name=facts.firstName;
  if(facts.lastName)patch.last_name=facts.lastName;
  if(facts.email)patch.email=facts.email;
  const u=await admin.from("communication_contacts").update(patch).eq("id",contact.id).select("*").single();
  if(u.error)throw u.error;
  if(pending&&accountType){
    const admins=await admin.from("authority_directory").select("user_id").eq("authority_role","SUPER_ADMIN").eq("is_active",true);
    if(!admins.error){
      for(const sa of admins.data||[]){
        if(!sa.user_id)continue;
        const key=`whatsapp-registration:${contact.id}:${accountType}`;
        const existing=await admin.from("notifications").select("id").eq("recipient_user_id",sa.user_id).eq("subject","WhatsApp registration awaiting approval").contains("metadata",{registration_key:key}).maybeSingle();
        if(existing.data?.id)continue;
        await admin.from("notifications").insert({recipient_user_id:sa.user_id,channel:"IN_APP",subject:"WhatsApp registration awaiting approval",message:`Anthony has qualified a new WhatsApp registration as ${accountType}. Review the temporary contact profile before activating dashboard or organisational access. Contact: ${facts.firstName||""} ${facts.lastName||""} · ${contact.phone_number||"phone unavailable"}.`,status:"UNREAD",metadata:{registration_key:key,contact_id:contact.id,conversation_id:conversationId,account_type:accountType,source:"anthony_qualification"}});
      }
    }
  }
  return u.data;
}
async function runWhatsAppQualification({identity,contact,body,conversation}:any){
  const identityType=String(identity?.identityType||"UNKNOWN").toUpperCase();
  const state=String(contact?.onboarding_state||conversation?.facts?.onboardingState||"NEW").toUpperCase();
  if(!["PROSPECT","UNKNOWN"].includes(identityType))return null;
  if(!QUALIFICATION_STATES.has(state))return null;
  return await agent().handleOnboarding({contact,body,conversation:{...conversation,onboardingState:state,facts:{...(conversation?.facts||{}),...(contact?.onboarding_facts||{})}}});
}
async function scopeOperational(intelligence:any,identity:any){const role=String(identity?.authorityRole||"").toUpperCase();if(role==="SUPER_ADMIN")return intelligence;if(role!=="STAFF")return intelligence;const staffId=identity?.staff?.id;if(!staffId)return {...intelligence,matters:[],userMatters:[],appointments:[],allAppointments:[],documents:[],allDocuments:[],invoices:[],allInvoices:[],commitments:[],staffOwnership:[]};const a=await admin.from("assignments").select("matter_id,status").eq("staff_id",staffId);if(a.error)throw a.error;const ids=new Set((a.data||[]).filter((x:any)=>!x.status||!["COMPLETED","CANCELLED","CLOSED"].includes(String(x.status).toUpperCase())).map((x:any)=>x.matter_id));const f=(x:any)=>x?.matter_id&&ids.has(x.matter_id);return {...intelligence,matters:(intelligence.matters||[]).filter((x:any)=>ids.has(x.id)),userMatters:(intelligence.userMatters||[]).filter((x:any)=>ids.has(x.id)),appointments:(intelligence.appointments||[]).filter(f),allAppointments:(intelligence.allAppointments||[]).filter(f),documents:(intelligence.documents||[]).filter(f),allDocuments:(intelligence.allDocuments||[]).filter(f),invoices:(intelligence.invoices||[]).filter(f),allInvoices:(intelligence.allInvoices||[]).filter(f),commitments:(intelligence.commitments||[]).filter(f),staffOwnership:(intelligence.staffOwnership||[])} }
function agent(){const p=new AIProviderService();const c=new CompanyTruthService();return new WhatsAppAgent({db:admin,responseGenerator:async(input:any)=>{try{return await new TruthFusionEngine({provider:p,companyTruth:c}).generate(input)}catch(error){console.error("Anthony AI provider unavailable; using deterministic fallback",error);return null}}})}
const historicalRetriever=new HistoricalMemoryRetrievalService();const relationshipMemory=new CustomerRelationshipMemoryEngine();const roi=new RelationshipOperationalIntelligenceEngine({db:admin});const authorityEngine=new AuthorityRoleIntelligenceEngine({db:admin});const identityEngine=new IdentityRelationshipResolutionEngine({db:admin,authorityEngine});const authorisationEngine=new AnthonyAuthorizationEngine({db:admin});const actionService=new AuthorityActionService({db:admin});
const immigrationQualification=new ImmigrationQualificationWorkflowService({db:admin});
function detectImmigrationWorkflowCode(matter:any,body:string){
 const text=(String(body||"")+" "+String(matter?.service_type||"")+" "+String(matter?.application_type||"")+" "+String(matter?.title||"")).toUpperCase();
 if(/DHA[- ]?84|PORT OF ENTRY|TRANSIT VISA/.test(text))return "DHA-84";
 if(/DHA[- ]?1738|CRITICAL SKILLS|TEMPORARY RESIDENCE/.test(text))return "DHA-1738";
 if(/BI[- ]?947|PERMANENT RESIDENCE/.test(text))return "BI-947";
 if(/BI[- ]?1712A|SPOUSAL RELATIONSHIP/.test(text))return "BI-1712A";
 if(/DHA[- ]?49|NOTICE OF APPEAL|APPEAL TO DIRECTOR[- ]?GENERAL/.test(text))return "DHA-49";
 if(/SECTION[- ]?22|ASYLUM SEEKER/.test(text))return "SECTION-22";
 if(/SECTION[- ]?24|REFUGEE STATUS/.test(text))return "SECTION-24";
 if(/WAIVER|WAIVE/.test(text))return "WAIVER";
 if(/UNDESIRAB/.test(text))return "UNDESIRABILITY-REVIEW";
 return null;
}
function immigrationIntelligence(matter:any,body:string){
 const code=detectImmigrationWorkflowCode(matter,body); if(!code)return null;
 const spec=getImmigrationFormIntelligence(code); if(!spec)return null;
 return {workflowCode:code,mode:spec.mode,populationStatus:spec.populationStatus,askInOrder:spec.askInOrder||[],suppliers:spec.suppliers||{},evidence:spec.evidence||[],output:spec.output||{}};
}
async function immigrationApplicationCall(action,matterId,body,userId,internal){
  const response=await fetch(SUPABASE_URL+"/functions/v1/immigration-application-runtime",{method:"POST",headers:{"Content-Type":"application/json","x-ai-internal-worker-token":INTERNAL_WORKER_TOKEN||""},body:JSON.stringify({action,matter_id:matterId,body,userId,internal})});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok||!payload?.ok)throw new Error(payload?.error||"Immigration application runtime failed.");
  return payload;
}
function applicationGenerateRequest(text){return /\b(create|generate|prepare|draft|update)\b/i.test(String(text||""))&&/\b(dha[- ]?84|dha[- ]?1738|bi[- ]?947|bi[- ]?1712a|dha[- ]?49|section[- ]?22|section[- ]?24|waiver|undesirab|critical skills|permanent residence|spousal|application|form|pdf)\b/i.test(String(text||""));}
function applicationSummaryRequest(text){return !applicationGenerateRequest(text)&&/\b(summary|progress|documentation|documents|pdf|dha[- ]?84|dha[- ]?1738|bi[- ]?947|bi[- ]?1712a|dha[- ]?49|section[- ]?22|section[- ]?24|waiver|undesirab|application|matter|file)\b/i.test(String(text||""));}

const authorityInteractionEngine=new AuthorityInteractionEngine({db:admin,companyTruth:new CompanyTruthService()});
async function prepareImmigrationDraft({workflow,matter,actorUserId}:any){
  const text=String(workflow?.requestBody||"");
  if(!workflow?.internalAuthority||matter?.service_type!=="IMM-CRITICAL-SKILLS")return null;
  if(!/\b(create|prepare|generate|draft)\b.{0,80}\b(visa|form|application|dha[- ]?1738|critical skills)\b/i.test(text))return null;
  const facts=workflow?.workflow?.known_facts||{};
  const v=(...keys:string[])=>{for(const k of keys){const x=k.split(".").reduce((o:any,p)=>o?.[p],facts);if(x&&typeof x==="object"&&"value" in x)return x.value;if(x!==undefined&&x!==null&&String(x)!=="")return x;}return "";};
  const dob=String(v("identity.date_of_birth")||"").trim();
  const dobMatch=dob.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  const dobDay=dobMatch?.[1]||"";
  const dobMonthName=dobMatch?.[2]||"";
  const dobYear=dobMatch?.[3]||"";
  const monthNames:any={january:"01",february:"02",march:"03",april:"04",may:"05",june:"06",july:"07",august:"08",september:"09",october:"10",november:"11",december:"12"};
  const dobMonth=monthNames[dobMonthName.toLowerCase()]||dobMonthName;
  const employer=v("employment.employer");
  const jobTitle=v("employment.job_title");
  const occupation=v("employment.occupation");
  const salary=v("employment.salary");
  const workLocation=v("employment.work_location");
  const answers={
    identity:{
      title:v("identity.title"),
      surname:v("identity.surname"),
      first_names:v("identity.first_names"),
      maiden_name:v("identity.maiden_name"),
      stage_name:v("identity.stage_name"),
      previous_names:v("identity.previous_names"),
      date_of_birth:dob,
      dob_year:dobYear,
      dob_month:dobMonth,
      dob_day:dobDay,
      date_of_divorce:v("identity.date_of_divorce"),
      nationality:v("identity.nationality")
    },
    citizenship:{
      acquisition_details:v("citizenship.acquisition_details"),
      other_citizenship_details:v("citizenship.other_citizenship_details")
    },
    passport:{
      number:v("passport.number"),
      issue_country:v("passport.issue_country"),
      issue_date:v("passport.issue_date"),
      expiry_date:v("passport.expiry_date"),
      other_document_type:v("passport.other_document_type"),
      other_document_number:v("passport.other_document_number")
    },
    contact:{
      email:v("contact.email"),
      phone:v("contact.phone"),
      work_phone:v("contact.work_phone")
    },
    residence:{
      address:v("residence.address"),
      postal_code:v("residence.postal_code"),
      previous_period:v("residence.previous_period"),
      previous_country:v("residence.previous_country")
    },
    immigration:{
      current_status:v("immigration.current_status"),
      asylum_country:v("immigration.asylum_country"),
      refusal_details:v("immigration.refusal_details")
    },
    contact_person:{
      name:v("contact_person.name"),
      address:v("contact_person.address"),
      work_phone:v("contact_person.work_phone"),
      phone:v("contact_person.phone")
    },
    sa_relatives:{
      name:v("sa_relatives.name"),
      address:v("sa_relatives.address"),
      relationship:v("sa_relatives.relationship"),
      identity_number:v("sa_relatives.identity_number")
    },
    employment:{occupation,employer,job_title:jobTitle,salary,work_location:workLocation},
    visa:{critical_skills:true},
    intent:{
      proposed_activities:[employer,jobTitle,occupation,workLocation,salary].filter(Boolean).join(" — ")
    }
  };
  const fieldMap:any={
    "Check Box14":"visa.critical_skills",
    "SurnameFamily name":"identity.surname",
    "Given names":"identity.first_names",
    "Year":"identity.dob_year",
    "Month":"identity.dob_month",
    "Day":"identity.dob_day",
    "Text8":"identity.nationality",
    "Passport number":"passport.number",
    "Outline your proposed activities whilst in the Republic":"intent.proposed_activities",
    "Title I Mr I Ms I Other specify":"identity.title",
    "Maiden name":"identity.maiden_name",
    "Stage name":"identity.stage_name",
    "Previousalternative namesaliases including details":"identity.previous_names",
    "Date of divorce":"identity.date_of_divorce",
    "If acquired other than by birth date and conditions under which acquired":"citizenship.acquisition_details",
    "If so of which country plus details":"citizenship.other_citizenship_details",
    "Country of issue":"passport.issue_country",
    "Type of document":"passport.other_document_type",
    "Number":"passport.other_document_number",
    "Postal code                                   Postal code":"residence.postal_code",
    "Telephone No Work incl area code":"contact.work_phone",
    "Home incl area code":"contact.phone",
    "Address":"residence.address",
    "Period":"residence.previous_period",
    "Country":"residence.previous_country",
    "If no specify period and present status":"immigration.current_status",
    "Yes D No D If yes specify the country":"immigration.asylum_country",
    "Name":"contact_person.name",
    "Address_2":"contact_person.address",
    "Telephone No Work incl area code_2":"contact_person.work_phone",
    "Home incl area code_2":"contact_person.phone",
    "Name_2":"sa_relatives.name",
    "Address_3":"sa_relatives.address",
    "Relationship":"sa_relatives.relationship",
    "Identity No":"sa_relatives.identity_number",
    "Have you ever been refused entry into or deported from the Republic If so please provide details":"immigration.refusal_details"
  };
  const response=await fetch(`${SUPABASE_URL}/functions/v1/immigration-document-engine`,{
    method:"POST",
    headers:{"Content-Type":"application/json","x-ai-internal-worker-token":INTERNAL_WORKER_TOKEN||""},
    body:JSON.stringify({
      action:"GENERATE_FORM",
      template:"DHA_1738",
      answers,
      fieldMap,
      metadata:{caseType:"critical_skills",checklist:workflow.checklist||[],source:"Anthony Isaacs E2E"},
      matter_id:matter.id,
      client_user_id:matter.individual_user_id||null,
      actor:actorUserId||"ANTHONY"
    })
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(payload?.error||"DHA-1738 draft generation failed.");
  return payload;
}
Deno.serve(async req=>{if(req.method==="OPTIONS")return new Response("ok",{status:200,headers:corsHeaders});if(req.method!=="POST")return json({error:"Method not allowed."},405);try{const p=await req.json();const{caller,user,internal}=await authenticate(req,p);const requestedAction=String(p?.action||"CHAT").toUpperCase();if(!internal&&requestedAction==="SETUP_DASHBOARD"){if(!user?.id)return json({error:"Authentication required."},401);const access=await caller.rpc("client_portal_access_status");if(access.error)throw access.error;if(String(Array.isArray(access.data)?access.data[0]:access.data).toUpperCase()!=="APPROVED")return json({error:"Client portal access is not approved."},403);const profile=typeof p?.profileData==="object"&&p.profileData?{...p.profileData}:{};const codes=Array.isArray(p?.selectedServiceCodes)?[...new Set(p.selectedServiceCodes.map((x:any)=>String(x).trim()).filter(Boolean))]:[];if(!String(profile.first_name||"").trim()||!String(profile.last_name||"").trim()||!String(profile.email||"").trim()||!String(profile.whatsapp_number||"").trim())return json({error:"Anthony requires the core customer profile before completing setup."},400);if(!codes.length)return json({error:"Select at least one service before completing setup."},400);const valid=await admin.from("client_portal_service_directory").select("service_code").in("service_code",codes).eq("active",true);if(valid.error)throw valid.error;if((valid.data||[]).length!==codes.length)return json({error:"One or more selected services are not active in the authoritative service directory."},400);const up=await admin.from("client_dashboard_state").upsert({user_id:user.id,setup_status:"COMPLETED",setup_step:"COMPLETED",setup_started_at:new Date().toISOString(),setup_completed_at:new Date().toISOString(),anthony_intro_seen:true,profile_data:profile,selected_service_codes:codes,updated_at:new Date().toISOString()},{onConflict:"user_id"}).select("*").single();if(up.error)throw up.error;await admin.from("ai_agent_events").insert({conversation_id:null,matter_id:null,event_type:"CLIENT_DASHBOARD_SETUP_COMPLETED",actor_type:"AI",payload:{user_id:user.id,selected_service_codes:codes,source:"ai-liaison-runtime",assistant_name:"Anthony"}});return json({ok:true,action:"SETUP_DASHBOARD",dashboard:up.data});}const body=clean(p?.body);if(!body)return json({error:"Message body is required."},400);const channel=channelOf(p?.channel);if(internal&&channel!=="WHATSAPP")return json({error:"Internal worker requests are restricted to WhatsApp."},403);if(!internal&&channel!=="PORTAL")return json({error:"Browser AI requests are restricted to the client portal."},403);const chatId=nullable(p?.chatId,255)||(user?`portal:${user.id}`:"portal:unknown");const phone=nullable(p?.phoneNumber,64);const mid=nullable(p?.matterId,64);const msgId=nullable(p?.messageId,255);if(channel==="WHATSAPP"&&(!p?.chatId||!isDirectChat(chatId)))return json({error:"WhatsApp AI is restricted to direct contacts, not groups or broadcasts."},403);if(!internal&&chatId!==`portal:${user.id}`)return json({error:"Portal chat identity is server-controlled."},403);if(!internal){const a=await caller.rpc("client_portal_access_status");if(a.error)throw a.error;if(String(Array.isArray(a.data)?a.data[0]:a.data).toUpperCase()!=="APPROVED")return json({error:"Client portal access is not approved."},403)}
const identity=channel==="WHATSAPP"?await identityEngine.resolveWhatsApp({phoneNumber:phone,chatId,whatsappName:nullable(p?.whatsappName,255)}):null;const authorityRole=identity?.authorityRole||null;const staffConversation=Boolean(identity?.verified&&["STAFF","SUPER_ADMIN","DIRECTOR","PARTNER","SHAREHOLDER","STAKEHOLDER"].includes(String(authorityRole||"").toUpperCase()));const uid=identity?.userId||user?.id||identity?.contact?.user_id||null;const contact=identity?.contact||null;const matter=await matterFor(uid,mid,identity);
const resolvedMatter=matter||(identity?.matters||[]).find((x:any)=>!["CLOSED","COMPLETED","CANCELLED","ARCHIVED"].includes(String(x?.status||"").toUpperCase()))||null;const con=await conversation(uid,chatId,phone,channel,mid);const prior=await history(con.id);const authorityInteraction=await authorityInteractionEngine.resolve({identity,conversation:con,chatId,message:body});const authoritySession=authorityInteraction.session;if(authoritySession)await authorityInteractionEngine.persistSession(con.id,authoritySession);const authorization=authorisationEngine.evaluate({identity,message:body,intent:p?.intent,domain:p?.serviceDomain});const clientMsg=await append(con.id,identity?.identityType||"UNKNOWN","INBOUND",body,nullable(p?.intent,100),nullable(p?.serviceDomain,100),{source:"ai-liaison-runtime",transport:internal?"openwa":"portal",identity_type:identity?.identityType||"UNKNOWN",identity_status:identity?.identityStatus||"UNKNOWN",authority_id:identity?.authority?.authorityId||null,authority_role:authorityRole||null,phone_verified:Boolean(identity?.verified),relationship_count:identity?.relationships?.length||0,authorization_scope:authorization.scope.level,authorization_allowed:authorization.allowed,disclosure_rule:authorization.disclosureRule,...(msgId&&!staffConversation?{client_message_id:msgId}:{})});

const applicationWorkflowCode=detectImmigrationWorkflowCode(resolvedMatter,body);
const applicationMatter=resolvedMatter&&applicationWorkflowCode?resolvedMatter:null;
if(applicationMatter){
  const applicationMatterId=applicationMatter.id;
  const applicationLabel=applicationWorkflowCode||"IMMIGRATION";
  const attachmentName=(code:string)=>`Isaacs-Partners-${String(code||"IMMIGRATION").replace(/[^A-Z0-9-]+/gi,"-")}-Draft.pdf`;
  if(staffConversation&&applicationGenerateRequest(body)){
    const generated=await immigrationApplicationCall("GENERATE",applicationMatterId,body,uid,true);
    const audit=generated.intake?.field_audit||null;
    const reply="Anthony regenerated the "+applicationLabel+" reviewable draft from the authoritative matter/application record.\n\nProgress: "+(generated.progress?.overallPercent||0)+"%.\nField audit: "+(audit?.filledCount||0)+" filled; "+(audit?.notAvailableCount||0)+" not available; "+(audit?.unmappedCount||0)+" unmapped.\nStatus: NEEDS_REVIEW."+((generated.latestDocument?.signedUrl)?"\nPDF: "+generated.latestDocument.signedUrl:"\nPDF: No PDF template is configured for this workflow; the guided evidence workflow remains active.")+"\n\nSubmission remains controlled by Isaacs & Partners staff.";
    const aiMsg=await append(con.id,"AI","OUTBOUND",reply,"IMMIGRATION_APPLICATION_GENERATE","IMMIGRATION",{source:"immigration-application-runtime",assistant_name:"Anthony",workflow_code:applicationLabel,progress:generated.progress,field_audit:audit,document_id:generated.latestDocument?.id||null});
    const out=channel==="WHATSAPP"?await queue(con,uid,reply,phone,applicationMatterId,msgId,generated.latestDocument?.signedUrl?{url:generated.latestDocument.signedUrl,filename:attachmentName(applicationLabel)}:null):null;
    return json({ok:true,conversation:{...con,matter_id:applicationMatterId},message:clientMsg,aiMessage:aiMsg,transportMessageId:out,result:{action:"IMMIGRATION_APPLICATION_GENERATE",workflowCode:applicationLabel,progress:generated.progress,documentId:generated.latestDocument?.id||null}});
  }
  if(staffConversation&&applicationSummaryRequest(body)){
    const summary=await immigrationApplicationCall("SUMMARY",applicationMatterId,body,uid,true);
    const reply=clean(summary.summary,8192);
    const aiMsg=reply?await append(con.id,"AI","OUTBOUND",reply,"IMMIGRATION_APPLICATION_SUMMARY","IMMIGRATION",{source:"immigration-application-runtime",assistant_name:"Anthony",workflow_code:applicationLabel,progress:summary.progress,field_audit:summary.intake?.field_audit||null}):null;
    const out=reply&&channel==="WHATSAPP"?await queue(con,uid,reply,phone,applicationMatterId,msgId,summary.latestDocument?.signedUrl?{url:summary.latestDocument.signedUrl,filename:attachmentName(applicationLabel)}:null):null;
    return json({ok:true,conversation:{...con,matter_id:applicationMatterId},message:clientMsg,aiMessage:aiMsg,transportMessageId:out,result:{action:"IMMIGRATION_APPLICATION_SUMMARY",workflowCode:applicationLabel,progress:summary.progress,documentId:summary.latestDocument?.id||null}});
  }
  const current=await immigrationApplicationCall("SNAPSHOT",applicationMatterId,body,uid,internal);
  const greeting=/^(hi|hello|hey|good morning|good afternoon|good evening|help|start|what do you need|what information|what documents)\b/i.test(body.trim());
  const currentAnswered=current.intake?.answer_states?.[current.intake?.current_question_key]?.status;
  if(greeting&&!currentAnswered){
    const q=current.nextQuestion;
    const reply=q?"Hi, I’m Anthony. Let’s complete your "+applicationLabel+" immigration intake.\n\n"+q.prompt+"\n\nApplication progress: "+(current.progress?.overallPercent||0)+"%.":"Hi, I’m Anthony. Your application interview is complete; I’m keeping the evidence checklist ready for Isaacs & Partners staff review.";
    const aiMsg=await append(con.id,"AI","OUTBOUND",reply,"IMMIGRATION_APPLICATION_INTAKE","IMMIGRATION",{source:"immigration-application-runtime",assistant_name:"Anthony",workflow_code:applicationLabel,current_question:q?.key||null,question_supplier:q?.supplier||null,progress:current.progress});
    const out=channel==="WHATSAPP"?await queue(con,uid,reply,phone,applicationMatterId,msgId):null;
    return json({ok:true,conversation:{...con,matter_id:applicationMatterId},message:clientMsg,aiMessage:aiMsg,transportMessageId:out,result:{action:"IMMIGRATION_APPLICATION_NEXT",workflowCode:applicationLabel,progress:current.progress,nextQuestion:q}});
  }
  const intake=await immigrationApplicationCall("ANSWER",applicationMatterId,body,uid,internal);
  const q=intake.nextQuestion;
  const reply=q
    ?"Thank you. I’ve recorded that answer on your matter.\n\nNext question:\n"+q.prompt+"\n\nApplication progress: "+(intake.progress?.overallPercent||0)+"%."+((intake.draft?.documentId)?"\n\nI have also updated the reviewable "+applicationLabel+" draft.":"")
    :"Thank you. I’ve recorded the final application answer.\n\nThe "+applicationLabel+" intake is complete. I’ll keep the outstanding evidence checklist and any reviewable PDF ready for Isaacs & Partners staff review.\n\nProgress: "+(intake.progress?.overallPercent||0)+"%.";
  const aiMsg=await append(con.id,"AI","OUTBOUND",reply,"IMMIGRATION_APPLICATION_INTAKE","IMMIGRATION",{source:"immigration-application-runtime",assistant_name:"Anthony",workflow_code:applicationLabel,progress:intake.progress,field_audit:intake.intake?.field_audit||null,next_question:q?.key||null,question_supplier:q?.supplier||null,draft_document_id:intake.intake?.draft_document_id||null});
  const out=channel==="WHATSAPP"?await queue(con,uid,reply,phone,applicationMatterId,msgId,intake.latestDocument?.signedUrl?{url:intake.latestDocument.signedUrl,filename:attachmentName(applicationLabel)}:null):null;
  await admin.from("ai_conversations").update({matter_id:applicationMatterId,state:intake.intake?.status||"IN_PROGRESS",facts:{...(con.facts||{}),immigrationWorkflow:applicationLabel,immigrationProgress:intake.progress,nextQuestion:q?.key||null}}).eq("id",con.id);
  return json({ok:true,conversation:{...con,matter_id:applicationMatterId,state:intake.intake?.status||"IN_PROGRESS"},message:clientMsg,aiMessage:aiMsg,transportMessageId:out,result:{action:"IMMIGRATION_APPLICATION_ANSWER",workflowCode:applicationLabel,progress:intake.progress,nextQuestion:q}});
}
const immigrationWorkflow=await immigrationQualification.process({identity,conversationId:con.id,matterId:resolvedMatter?.id||mid||con.matter_id||null,body});
if(immigrationWorkflow){
  let draft=null;
  try{
    draft=await prepareImmigrationDraft({
      workflow:{...immigrationWorkflow,requestBody:body,internalAuthority:staffConversation},
      matter:immigrationWorkflow.matter,
      actorUserId:uid
    });
  }catch(error){
    console.error("Anthony DHA-1738 draft preparation failed",error);
  }
  const replyBase=clean(immigrationWorkflow.reply,8192);
  const audit=draft?.fieldAudit||null;
  const auditSummary=audit
    ? "\n\nDHA-1738 field audit: "+audit.filledCount+" filled; "+audit.notAvailableCount+" not available; "+audit.unmappedCount+" unmapped. Form population complete: "+(audit.formPopulationComplete?"YES":"NO")+"."
    : "";
  const reply=draft?.ok
    ? replyBase+"\n\nDHA-1738 draft created from the verified matter record. Document ID: "+draft.documentId+". Status: NEEDS_REVIEW. It is not submission-ready; the field audit and outstanding statutory evidence, payment and approval gates remain open."+auditSummary
    : replyBase;
  const aiMsg=reply?await append(con.id,"AI","OUTBOUND",reply,"IMMIGRATION_QUALIFICATION",null,{source:"ai-liaison-runtime",runtime:"ImmigrationQualificationWorkflowService",assistant_name:"Anthony",qualification_mode:immigrationWorkflow.mode,qualification_state:immigrationWorkflow.workflow?.state||"QUALIFICATION",completeness:immigrationWorkflow.completeness||null,payment_seen:Boolean(immigrationWorkflow.payment?.seen),document_audit:audit}):null;
  const out=reply&&channel==="WHATSAPP"?await queue(con,uid,reply,phone,immigrationWorkflow.matter?.id||mid,msgId,draft?.ok?{url:draft.signedUrl,filename:"Isaacs-Partners-DHA-1738-Draft.pdf"}:null):null;
  await admin.from("ai_conversations").update({matter_id:immigrationWorkflow.matter?.id||con.matter_id||mid||null,state:immigrationWorkflow.workflow?.state||"QUALIFICATION",facts:{...(con.facts||{}),immigrationQualification:{mode:immigrationWorkflow.mode,state:immigrationWorkflow.workflow?.state||"QUALIFICATION",complete:Boolean(immigrationWorkflow.complete),paymentSeen:Boolean(immigrationWorkflow.payment?.seen),missing:immigrationWorkflow.missing||[]}},updated_at:new Date().toISOString()}).eq("id",con.id);
  return json({ok:true,conversation:{...con,matter_id:immigrationWorkflow.matter?.id||con.matter_id||mid||null,state:immigrationWorkflow.workflow?.state||"QUALIFICATION"},message:clientMsg,aiMessage:aiMsg,transportMessageId:out,result:{action:"IMMIGRATION_QUALIFICATION",mode:immigrationWorkflow.mode,complete:Boolean(immigrationWorkflow.complete),paymentSeen:Boolean(immigrationWorkflow.payment?.seen),missing:immigrationWorkflow.missing||[]},context:{identity:{type:identity?.identityType,status:identity?.identityStatus,authorityRole,verified:identity?.verified},authorization}});
}

const qualification=channel==="WHATSAPP"&&!authorityInteraction.bypassCustomerQualification?await runWhatsAppQualification({identity,contact,body,conversation:{...con,facts:{...(con.facts||{}),...(contact?.onboarding_facts||{})}}}):null;
if(qualification){
  await persistWhatsAppQualification(contact,qualification,con.id);
  const facts={...(con.facts||{}),...(qualification.facts||{}),onboardingState:qualification.nextState};
  await admin.from("ai_conversations").update({facts,state:qualification.nextState,updated_at:new Date().toISOString()}).eq("id",con.id);
  const reply=clean(qualification.reply,8192);
  const aiMsg=reply?await append(con.id,"AI","OUTBOUND",reply,"WHATSAPP_QUALIFICATION",null,{source:"ai-liaison-runtime",runtime:"WhatsAppQualification",assistant_name:"Anthony",qualification_state:qualification.nextState,claimed_account_type:qualification.facts?.claimedAccountType||null,registration_pending:Boolean(qualification.approvalRequired)}):null;
  const out=reply&&channel==="WHATSAPP"?await queue(con,uid,reply,phone,mid,msgId):null;
  return json({ok:true,conversation:{...con,state:qualification.nextState,facts},message:clientMsg,aiMessage:aiMsg,transportMessageId:out,result:{action:"QUALIFY",qualificationState:qualification.nextState,registrationPending:Boolean(qualification.approvalRequired)},context:{identity:{type:identity?.identityType,status:identity?.identityStatus,authorityRole,verified:identity?.verified},authorization}});
}

async function notifySuperAdminWithAlert(adminDb:any,alertText:string,conversationId:string,customerPhone:string,chatId:string,compiledQuote:any=null,proposedReply:string=""){
  const admins=await adminDb.from("authority_directory").select("user_id, phone_number, authority_role").eq("authority_role","SUPER_ADMIN").eq("is_active",true);
  const actionButtons=[
    {id:"APPROVE",text:"APPROVE",type:"reply"},
    {id:"MODIFY",text:"MODIFY",type:"reply"},
    {id:"REJECT",text:"REJECT",type:"reply"}
  ];
  if(admins.data&&admins.data.length>0){
    for(const adm of admins.data){
      const adminPhone=adm.phone_number;
      if(adminPhone){
        const adminChatId=adminPhone.includes("@")?adminPhone:`${adminPhone.replace(/[^0-9]/g,"")}@c.us`;
        const key=`sa-alert:${conversationId}:${adminPhone}`;
        const existing=await adminDb.from("communication_messages").select("id").eq("idempotency_key",key).maybeSingle();
        if(existing.data?.id)continue;
        const m=await adminDb.from("communication_messages").insert({
          customer_user_id:adm.user_id||null,
          channel:"WHATSAPP",
          direction:"OUTBOUND",
          phone_number:adminPhone,
          chat_id:adminChatId,
          body:alertText,
          status:"QUEUED",
          idempotency_key:key,
          metadata:{
            source:"ai-liaison-runtime",
            type:"SUPER_ADMIN_APPROVAL_ALERT",
            conversation_id:conversationId,
            customer_phone:customerPhone,
            customer_chat_id:chatId,
            interactive:true,
            action_buttons:actionButtons,
            buttons:actionButtons,
            compiled_quote:compiledQuote,
            proposed_reply:proposedReply
          }
        }).select("id").single();
        if(m.data?.id)await adminDb.from("communication_outbox").insert({message_id:m.data.id,chat_id:adminChatId,status:"QUEUED"});
      }
      if(adm.user_id){
        const notifKey=`notif-approval:${conversationId}`;
        const existingNotif=await adminDb.from("notifications").select("id").eq("recipient_user_id",adm.user_id).contains("metadata",{alert_key:notifKey}).maybeSingle();
        if(!existingNotif.data?.id){
          await adminDb.from("notifications").insert({
            recipient_user_id:adm.user_id,
            channel:"IN_APP",
            subject:`⚠️ Approval Needed: ${customerPhone}`,
            message:alertText,
            status:"UNREAD",
            metadata:{
              alert_key:notifKey,
              conversation_id:conversationId,
              customer_phone:customerPhone,
              action_buttons:actionButtons,
              compiled_quote:compiledQuote,
              proposed_reply:proposedReply
            }
          });
        }
      }
    }
  }
}

// Lead Persistence for all incoming enquiries matched by WhatsApp / Phone Number
if(chatId||phone){const cleanPhone=phone||chatId.replace(/@.*$/,"");try{const enquiry=await admin.from("public_enquiries").upsert({session_id:chatId,service_domain:nullable(p?.serviceDomain,100),answers:[{message:body,timestamp:new Date().toISOString()}],qualified:true,metadata:{phone:cleanPhone,channel,chat_id:chatId,created_by:"ai-liaison-runtime"}},{onConflict:"session_id"});if(enquiry.error)console.warn("Lead persistence failed",enquiry.error.message);}catch(error){console.warn("Lead persistence exception",error);}}

// Super Admin Commercial Approval Decision Interceptor.
const cleanBody=body.trim().toUpperCase();
const approvalMatch=/^(APPROVE|MODIFY|REJECT)(?:_([0-9A-F-]{36}))?$/.exec(cleanBody);
const approvalAction=approvalMatch?.[1]||null;
const buttonEstimateId=approvalMatch?.[2]?.toLowerCase()||null;
if(approvalAction&&staffConversation&&String(authorityRole).toUpperCase()==="SUPER_ADMIN"){
  const pendingConv=await admin.from("ai_conversations").select("*").eq("state","approval_needed").order("updated_at",{ascending:false}).limit(1).maybeSingle();
  const pendingFacts=pendingConv?.data?.facts||{};
  const estimateId=buttonEstimateId||pendingFacts.estimateId||null;
  if(estimateId){
    const response=await fetch(`${SUPABASE_URL}/functions/v1/commercial-approval-engine`,{
      method:"POST",
      headers:{"Content-Type":"application/json","X-AI-Internal-Worker-Token":Deno.env.get("OPENWA_WORKER_TOKEN")||""},
      body:JSON.stringify({action:approvalAction,estimate_id:estimateId,actor_phone:phone,approved_total:pendingFacts.compiledQuote?.approvedTotal||pendingFacts.compiledQuote?.total||pendingFacts.proposedTotal||null})
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(result?.error||"Commercial approval action failed.");
    const label=approvalAction==="APPROVE"?"approved and the official quotation is being generated.":approvalAction==="MODIFY"?"marked for modification.":"rejected and will not be sent to the client.";
    const reply="Commercial request "+label;
    const aiMsg=await append(con.id,"AI","OUTBOUND",reply,"SUPER_ADMIN_"+approvalAction,null,{source:"commercial-approval-engine",estimate_id:estimateId});
    const out=channel==="WHATSAPP"?await queue(con,uid,reply,phone,mid,msgId):null;
    if(pendingConv?.data?.id)await admin.from("ai_conversations").update({state:approvalAction==="REJECT"?"HUMAN_ACTIVE":"AI_ACTIVE",facts:{...pendingFacts,approval_needed:false,lastApprovalAction:approvalAction,approvalResult:result},updated_at:new Date().toISOString()}).eq("id",pendingConv.data.id);
    return json({ok:true,conversation:con,message:clientMsg,aiMessage:aiMsg,transportMessageId:out,result:{action:"SUPER_ADMIN_"+approvalAction,estimateId,engine:result}});
  }
}

const action=await actionService.execute({identity,message:body,conversationId:con.id});const actionContext=action?.context||null;if(action.handled){const reply=clean(action.reply);const aiMsg=reply?await append(con.id,identity?.identityType||"UNKNOWN","OUTBOUND",reply,action.action||"AUTHORITY_ACTION",null,{source:"ai-liaison-runtime",runtime:"AuthorityActionService",assistant_name:"Anthony",authorization_scope:authorization.scope.level,authorization_allowed:authorization.allowed,action_executed:Boolean(action.executed)}):null;const out=reply&&channel==="WHATSAPP"?await queue(con,uid,reply,phone,mid,msgId):null;return json({ok:true,conversation:con,message:clientMsg,aiMessage:aiMsg,transportMessageId:out,result:{action:action.action||null,executed:Boolean(action.executed),permission:action.permission||null},context:{identity:{type:identity?.identityType,status:identity?.identityStatus,authorityRole,verified:identity?.verified},authorization}})}
if(!authorization.allowed&&(authorization.request.type!=="GENERAL")){const reply=`I recognise your database identity as ${String(identity?.identityType||"UNKNOWN").replace(/_/g," ")}${authorityRole?` with authority role ${authorityRole.replace(/_/g," ")}`:""}, but I cannot disclose or perform that request within the authority currently resolved for this WhatsApp number. ${authorization.reason}`;const aiMsg=await append(con.id,"AI","OUTBOUND",reply,"AUTHORIZATION_DENIED",null,{source:"ai-liaison-runtime",assistant_name:"Anthony",authorization_scope:authorization.scope.level,authorization_allowed:false,disclosure_rule:authorization.disclosureRule});const out=channel==="WHATSAPP"?await queue(con,uid,reply,phone,mid,msgId):null;return json({ok:true,conversation:con,message:clientMsg,aiMessage:aiMsg,transportMessageId:out,result:{action:"AUTHORIZATION_DENIED",reason:authorization.reason},context:{identity:{type:identity?.identityType,status:identity?.identityStatus,authorityRole,verified:identity?.verified},authorization}})}
if(["HUMAN_ACTIVE"].includes(String(con.state||"").toUpperCase())&&!staffConversation)return json({ok:true,conversation:con,message:clientMsg,aiMessage:null,result:{action:"ROUTE_TO_HUMAN",escalated:true},context:{historyLoaded:prior.length,maxHistory:40,identity:identity?{type:identity.identityType,status:identity.identityStatus,authorityRole,verified:identity.verified}:null,authorization}});
const historicalMemory=!staffConversation?await historicalRetriever.retrieve({db:admin,conversationId:con.id,contactId:contact?.id||null,userId:uid,query:body,history:prior}):{found:false,records:[],isHistoricalRecall:false};const relationshipRecords=!staffConversation?relationshipMemory.observe({body,contact,onboardingFacts:contact?.onboarding_facts||{},user,conversationId:con.id,sourceMessageId:clientMsg?.id||null}).records:[];await persistMemories(relationshipRecords);
const hindsightActorBank=staffConversation
  ? hindsightBank("staff",identity?.userId||uid||"unknown")
  : (contact?.id ? hindsightBank("client",contact.id) : (uid ? hindsightBank("client-user",uid) : null));
const hindsightGlobalBank=hindsightBank("global","learned");
const learnedMemory=await hindsightRecall({actorBank:hindsightActorBank,globalBank:hindsightGlobalBank,query:body,maxTokens:900});const rawOperational=await roi.build({contactId:contact?.id||null,userId:uid,matterId:mid});const operationalIntelligence=await scopeOperational(rawOperational,identity);
const immigrationContext=immigrationIntelligence(resolvedMatter,body);
const workerContext=await new AnthonyWorkerOrchestrator({db:admin}).run({conversationId:con.id,matterId:mid||con.matter_id||null,body,channel,identity,matter:resolvedMatter,servicePlan:{domain:p?.serviceDomain||null},intent:{domain:p?.serviceDomain||null},operationalContext:operationalIntelligence,historicalMemory,learnedMemory});
const ctx={id:con.id,chatId,phoneNumber:con.phone_number||phone,state:con.state||"AI_ACTIVE",facts:{...(con.facts||{}),authoritySession:authoritySession||con.facts?.authoritySession||null},memory:con.facts?.customerMemory||{},lastIntent:con.last_intent||null,lastService:con.last_service||null,messages:prior};
const learnedMemoryContext=learnedMemory?.memories||[];let result:any;if(authorityInteraction.internalAuthority){const generated=await agent().generateReply({body,intent:{intent:authorityInteraction.intent,confidence:1},servicePlan:{domain:null,service:null,commercial:{quoteRequired:false,quoteApprovalRequired:false}},sales:null,context:ctx,lead:null,user:null,matter:resolvedMatter,operationalContext:{...operationalIntelligence,workerContext,immigrationWorkflowIntelligence:immigrationContext,authorityContext:identity?.authority||null,identityContext:identity,authorizationContext:authorization,authorityInteractionContext:authorityInteraction,authoritySession:authoritySession,companyTruthFirst:authorityInteraction.companyTruth,assistantName:"Anthony"},historicalMemory:null,learnedMemory:learnedMemoryContext});result={handled:true,action:"RESPOND",intent:{intent:authorityInteraction.intent,confidence:1},servicePlan:{domain:null,service:null,commercial:{quoteRequired:false,quoteApprovalRequired:false}},reply:typeof generated==="object"?generated?.text:generated,aiProvider:typeof generated==="object"?generated?.provider:null,aiModel:typeof generated==="object"?generated?.model:null,companySources:typeof generated==="object"?generated?.companySources||[]:[]};}else if(identity?.verified&&/^(?:hi[,.]?\s*)?(?:who am i|identify me|what is my identity|what identity do you have for me)\??$/i.test(body)){result={handled:true,action:"RESPOND",intent:{intent:"IDENTITY_AUTHORITY",confidence:1},servicePlan:{domain:null,service:null,commercial:{quoteRequired:false}},reply:`Hello ${identity.authoritativeName||"there"}. I recognise this WhatsApp number in the Isaacs & Partners database as ${String(identity.identityType||"UNKNOWN").replace(/_/g," ")}${authorityRole?` with authority role ${authorityRole.replace(/_/g," ")}`:""}. The identity resolution used the verified WhatsApp number and existing organisational/client records; your WhatsApp display name does not grant authority.`,aiProvider:"DETERMINISTIC_IDENTITY",aiModel:null,companySources:[identity.source||"database"]};}else result=await agent().handleInbound({chatId,phoneNumber:ctx.phoneNumber,body,messageId:msgId,user:staffConversation?null:user,matter:resolvedMatter,operationalContext:{...operationalIntelligence,immigrationWorkflowIntelligence:immigrationContext,authorityContext:identity?.authority||null,identityContext:identity,authorizationContext:authorization,authorityInteractionContext:authorityInteraction,companyTruthFirst:authorityInteraction.companyTruth,assistantName:"Anthony"},conversation:ctx,contact,historicalMemory,learnedMemory:learnedMemoryContext});

const isApprovalNeeded=Boolean(
  result?.approval_needed||
  result?.approvalNeeded||
  result?.requiresApproval||
  result?.action==="APPROVAL_NEEDED"||
  result?.context?.facts?.approval_needed||
  con?.facts?.approval_needed
);
const nextState=isApprovalNeeded?"approval_needed":(result?.action==="ESCALATE"&&!staffConversation?"AI_ESCALATED":con.state||"AI_ACTIVE");

if(result?.action==="ESCALATE"&&!staffConversation){const intervention=await admin.rpc("ai_create_human_intervention",{p_conversation_id:con.id,p_matter_id:mid||con.matter_id||null,p_client_user_id:uid,p_reason:result?.reason||"Anthony has requested authorised human assistance.",p_priority:result?.priority||"NORMAL",p_question:body,p_ai_context:{assistant_name:"Anthony",identity:identity?{type:identity.identityType,status:identity.identityStatus,authority_role:authorityRole}:null,authorization,operational:operationalIntelligence.portfolio||null}});if(intervention.error)throw intervention.error;}
const learningApprovalNeeded=Boolean(result?.approval_needed||result?.approvalNeeded||result?.requiresApproval||result?.action==="APPROVAL_NEEDED"||result?.context?.facts?.approval_needed||con?.facts?.approval_needed);
const learningParts:any[]=[];
if(relationshipRecords.length){
  const durableCategories=new Set(["SERVICE_INTEREST","GOAL","PREFERENCE","CORRECTION"]);
  for(const record of relationshipRecords.filter((item:any)=>durableCategories.has(String(item?.category||"").toUpperCase())).slice(0,8)){
    const value=clean(record?.value_text||"",1200);
    if(value)learningParts.push("Customer-originated durable memory: "+value);
  }
}
learningParts.push("Anthony interaction outcome: action="+clean(result?.action||"RESPOND",80)+
  "; intent="+clean(result?.intent?.intent||"UNKNOWN",120)+
  "; service="+clean(result?.servicePlan?.service?.name||result?.servicePlan?.domain||"UNKNOWN",180)+
  "; escalated="+String(result?.action==="ESCALATE")+
  "; approvalNeeded="+String(learningApprovalNeeded));
if(hindsightActorBank){
  await hindsightRetain({
    bankId:hindsightActorBank,
    content:learningParts.join("\n"),
    metadata:{source:"anthony",channel,conversation_id:con.id,matter_id:mid||""}
  }).catch(error=>console.warn("Hindsight actor retain degraded",error));
}
const globalLearning="Anthony operational learning: service="+clean(result?.servicePlan?.service?.name||result?.servicePlan?.domain||"UNKNOWN",180)+
  "; action="+clean(result?.action||"RESPOND",80)+
  "; approvalNeeded="+String(learningApprovalNeeded)+
  "; escalated="+String(result?.action==="ESCALATE")+
  "; workflow="+clean(result?.servicePlan?.domain||"GENERAL",100);
await hindsightRetain({
  bankId:hindsightGlobalBank,
  content:globalLearning,
  metadata:{source:"anthony-global-learning",channel,action:clean(result?.action||"RESPOND",80)}
}).catch(error=>console.warn("Hindsight global retain degraded",error));

const reply=clean(result?.reply,8192);const aiMsg=reply?await append(con.id,"AI","OUTBOUND",reply,result?.intent?.intent||null,result?.servicePlan?.domain||null,{source:"ai-liaison-runtime",runtime:"WhatsAppAgent",assistant_name:"Anthony",action:result?.action||"RESPOND",ai_provider:result?.aiProvider||null,ai_model:result?.aiModel||null,company_truth_sources:result?.companySources||[],context_messages_loaded:prior.length,historical_memory_found:historicalMemory.found,portfolio_attention:operationalIntelligence.portfolio.attentionLevel,next_action:operationalIntelligence.portfolio.nextAction,identity_type:identity?.identityType||"UNKNOWN",identity_status:identity?.identityStatus||"UNKNOWN",authority_id:identity?.authority?.authorityId||null,authority_role:authorityRole||null,phone_verified:Boolean(identity?.verified),authorization_scope:authorization.scope.level,authorization_allowed:authorization.allowed,disclosure_rule:authorization.disclosureRule}):null;
const customerPhone=phone||con.phone_number||chatId.replace(/@.*$/,"");
let estimateId=(con.facts||{}).estimateId||null;
if(isApprovalNeeded&&!staffConversation&&!estimateId){
  const serviceCode=result?.servicePlan?.service?.code||result?.compiledQuote?.serviceCode||result?.context?.facts?.serviceCode||null;
  const serviceName=result?.servicePlan?.service?.name||result?.compiledQuote?.serviceName||result?.context?.facts?.serviceName||"Requested Service";
  if(serviceCode){
    const sq=await admin.from("service_catalog").select("id,code,name").eq("code",serviceCode).maybeSingle();
    if(sq.data){
      const ei=await admin.from("client_estimates").insert({client_user_id:uid||null,service_id:sq.data.id,service_code:sq.data.code,service_name:serviceName,status:"AWAITING_APPROVAL",request_data:{chat_id:chatId,phone_number:phone,matter_id:mid||null},qualifying_answers:{message:body},research_snapshot:{source:"Anthony runtime",checked_at:new Date().toISOString()},proposed_total:result?.compiledQuote?.total||result?.compiledQuote?.estimatedTotal||null,internal_costing_snapshot:{compiledQuote:result?.compiledQuote||null}}).select("id").single();
      if(ei.data?.id)estimateId=ei.data.id;
    }
  }
}
const facts={
  ...(con.facts||{}),
  ...(authoritySession?{authoritySession}:{}) ,
  ...(result?.context?.facts||{}),
  approval_needed:isApprovalNeeded,
  customerPhone,
  estimateId,
  proposedReply:result?.proposedReply||reply||null,
  compiledQuote:result?.compiledQuote||result?.context?.facts?.compiledQuote||null,
  customerMemory:result?.context?.memory||con.facts?.customerMemory||{}
};
await admin.from("ai_conversations").update({facts,last_intent:result?.intent?.intent||con.last_intent||null,last_service:result?.servicePlan?.service?.name||con.last_service||null,state:nextState,updated_at:new Date().toISOString()}).eq("id",con.id);

if(isApprovalNeeded&&!staffConversation){
  const transcriptLines=[...prior.map((x:any)=>`${x.sender_type||x.sender||"CLIENT"}: ${x.body}`),`CLIENT: ${body}`];
  const transcript=transcriptLines.join("\n");
  const compiledQuote=result?.compiledQuote||result?.context?.facts?.compiledQuote||null;
  const quoteSummary=compiledQuote?.alertSummary||"";
  const alertText=[
    `⚠️ APPROVAL NEEDED FOR ANTHONY AI`,
    ``,
    `Customer Phone: ${customerPhone}`,
    ``,
    `Full Conversation Transcript:`,
    `${transcript.slice(-3000)}`,
    ``,
    quoteSummary?`Compiled Price / Quotation Details:\n${quoteSummary}\n`:null,
    `Proposed Response / Action:`,
    `"${reply||"Human Verification Required"}"`,
    ``,
    `Can I proceed? (Tap Yes or No button below)`
  ].filter(Boolean).join("\n");
  await notifySuperAdminWithAlert(admin,alertText,con.id,customerPhone,chatId,compiledQuote,reply);
}

let out=null;if(reply&&channel==="WHATSAPP"&&(result?.action==="RESPOND"||staffConversation)&&!isApprovalNeeded)out=await queue(con,uid,reply,phone,mid,msgId);return json({ok:true,conversation:{...con,state:nextState,facts},message:clientMsg,aiMessage:aiMsg,transportMessageId:out,result:{action:result?.action||null,intent:result?.intent||null,servicePlan:result?.servicePlan||null,sales:result?.sales||null,escalated:result?.action==="ESCALATE",approvalNeeded:isApprovalNeeded,aiProvider:result?.aiProvider||null,aiModel:result?.aiModel||null,companySources:result?.companySources||[]},context:{historyLoaded:prior.length,maxHistory:40,historicalMemoryFound:historicalMemory.found,historicalRecall:historicalMemory.isHistoricalRecall,portfolio:operationalIntelligence.portfolio,identity:identity?{type:identity.identityType,status:identity.identityStatus,authorityRole,verified:identity.verified,source:identity.source,relationships:identity.relationships}:null,authorization}})}catch(e){if(e instanceof Response)return e;console.error("AI liaison runtime failed",e);return json({error:e instanceof Error?e.message:"AI liaison runtime failed."},500)}});
