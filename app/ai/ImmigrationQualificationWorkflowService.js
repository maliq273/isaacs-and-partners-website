import ImmigrationInterviewEngine from "../immigration/ImmigrationInterviewEngine.js";
import AIProviderService from "./providers/AIProviderService.js";

const AUTHORITY_ROLES = new Set(["STAFF","SUPER_ADMIN","DIRECTOR","PARTNER","SHAREHOLDER","STAKEHOLDER"]);
const DOCUMENTS = Object.freeze({
  "identity.surname":"Passport biodata page","identity.first_names":"Passport biodata page","identity.date_of_birth":"Passport biodata page","identity.place_of_birth":"Passport biodata page","identity.nationality":"Passport biodata page","identity.gender":"Passport biodata page",
  "passport.number":"Passport biodata page","passport.issue_date":"Passport biodata page","passport.expiry_date":"Passport biodata page",
  "contact.email":"Client contact details / email confirmation","contact.phone":"Client contact details / WhatsApp confirmation",
  "residence.current_country":"Proof of current residence","residence.address":"Proof of residential address",
  "immigration.current_status":"Current South African visa / permit / status document","immigration.entry_date":"Passport entry stamp / travel history","immigration.previous_applications":"Previous South African visa / permit records","immigration.refusals":"Any refusal / cancellation / undesirable-person decision",
  "compliance.criminal_history":"Police clearance / criminal-history declaration where required",
  "employment.occupation":"Offer of employment / job description","employment.employer":"Offer of employment / employer letter","employment.job_title":"Offer of employment / job description","employment.start_date":"Offer of employment / employment contract","employment.salary":"Offer of employment / employment contract","employment.contract":"Signed employment contract","employment.labour_certificate":"Department of Employment and Labour certificate/recommendation where required","employment.work_location":"Offer of employment / employer letter",
  "qualifications.highest":"Highest relevant qualification certificate","qualifications.institution":"Qualification certificate / academic record","qualifications.experience":"CV and employment evidence","professional.registration":"Professional registration / proof of registration"
});
function clean(value,max=6000){return String(value??"").trim().slice(0,max)}
function getPath(obj,key){return key.split(".").reduce((v,k)=>v?.[k],obj)}
function setPath(obj,key,value){const parts=key.split(".");let target=obj;for(let i=0;i<parts.length-1;i++)target=target[parts[i]]??={};target[parts.at(-1)]={value:clean(value,1500),source:"ANTHONY_QUALIFICATION",status:"UNCONFIRMED"}}
function modeFor(identity){const role=String(identity?.authorityRole||"").toUpperCase();if(AUTHORITY_ROLES.has(role))return role==="STAFF"?"STAFF_FILE_CHECK":"SUPER_ADMIN_FILE_CHECK";return "CLIENT_DOCUMENT_REQUEST"}
function extractExplicitDocumentChecks(body){
  const text=clean(body);
  const checks=[];
  const add=(document,present,notRequired=false)=>checks.push({document,present,notRequired});
  if(/\b(passport\s+(biodata|bio\s*data|data)\s+page|passport biodata)\b/i.test(text))add("Passport biodata page",true);
  if(/\b(offer of employment|employment offer|offer letter|job offer)\b/i.test(text))add("Offer of employment / job description",true);
  if(/\b(qualification certificate|degree certificate|qualification)\b/i.test(text))add("Highest relevant qualification certificate",true);
  if(/\b(professional registration)\b/i.test(text) && /\b(no|not|does not|don't|doesn't|do not)\b/i.test(text))add("Professional registration / proof of registration",false,true);
  if(/\b(proof of (current )?residence|proof of residential address)\b/i.test(text) && /\b(no|not|don't|doesn't|do not)\b/i.test(text))add("Proof of current residence",false);
  if(/\b(current south african visa|current south african status|status document|visa\/status document)\b/i.test(text) && /\b(no|not|don't|doesn't|do not)\b/i.test(text))add("Current South African visa / permit / status document",false);
  return checks;
}

export default class ImmigrationQualificationWorkflowService {
  constructor({db,provider=new AIProviderService()}={}){if(!db)throw new Error("ImmigrationQualificationWorkflowService requires a Supabase admin client.");this.db=db;this.provider=provider}
  async load({conversationId=null,matterId=null}={}){let q=this.db.from("anthony_workflow_state").select("*");if(matterId)q=q.eq("matter_id",matterId);else if(conversationId)q=q.eq("conversation_id",conversationId);else return null;const r=await q.order("updated_at",{ascending:false}).limit(1).maybeSingle();if(r.error)throw r.error;return r.data||null}
  async matter(matterId){if(!matterId)return null;const r=await this.db.from("matters").select("*").eq("id",matterId).maybeSingle();if(r.error)throw r.error;return r.data||null}
  async extractAnswer({question,body,mode}){if(!this.provider.isConfigured())return null;const result=await this.provider.generate({temperature:0,maxOutputTokens:900,system:"You are Anthony Isaacs, executive assistant and immigration workflow coordinator for Isaacs & Partners. Extract only information explicitly provided. Never invent facts. Return JSON only. Schema: {answers:[{key:string,value:string}],documentChecks:[{document:string,present:boolean,notRequired:boolean}],paymentMention:string}. For staff or super-admin file checks, yes means the physical/file copy exists; it does not prove its content is accurate. Mode: "+mode,user:"Current question/checklist item: "+question+"\nUser message: "+body});if(!result?.text)return null;try{return JSON.parse(result.text.trim())}catch{try{const raw=result.text.trim();const start=raw.indexOf("{");const end=raw.lastIndexOf("}");if(start<0||end<=start)return null;return JSON.parse(raw.slice(start,end+1))}catch{return null}}}
  checklistFor(workflow){const facts=workflow?.known_facts||{};const required=Array.isArray(workflow?.required_question_keys)?workflow.required_question_keys:[];return required.filter(key=>!getPath(facts,key)?.value).map(key=>({key,document:DOCUMENTS[key]||"Supporting evidence for this requirement"}))}
  async paymentStatus(matterId){const inv=await this.db.from("invoices").select("id,invoice_number,total,amount_paid,balance_due,status,payment_stage,paid_at").eq("matter_id",matterId).order("created_at",{ascending:false}).limit(5);if(inv.error)throw inv.error;const invoices=inv.data||[];if(!invoices.length)return {seen:false,invoices:[]};return {seen:invoices.some(x=>Number(x.amount_paid||0)>0||String(x.status||"").toUpperCase()==="PAID"||x.paid_at),invoices}}
  async save(workflow,patch){const r=await this.db.from("anthony_workflow_state").update({...patch,updated_at:new Date().toISOString()}).eq("id",workflow.id).select("*").single();if(r.error)throw r.error;return r.data}
  async phrase({mode,matter,checklist,missing,complete,payment}){const roleInstruction=mode==="CLIENT_DOCUMENT_REQUEST"?"Address the client directly. Ask them to upload the listed documents to the client portal or email them to Isaacs & Partners. Do not ask internal staff questions.":"You are speaking to an internal staff member or Super Admin. Do not ask them to confirm or answer the client's qualification questions. Treat their message as the file-check result: record documents explicitly stated as on file, record documents explicitly stated as absent, and record items explicitly stated as not required. Report what is already held, identify the outstanding client-side information/documents Anthony will obtain, and state that Anthony will send the client the outstanding request. Do not ask the internal user to reconfirm the same information.";
    const fallback=()=>{if(!complete){if(mode==="CLIENT_DOCUMENT_REQUEST")return "For "+(matter?.reference_number||"your matter")+", I still need the following from you:\n"+missing.slice(0,5).map(x=>"☐ "+x.document).join("\n")+"\n\nPlease upload these to the client portal or email them to Isaacs & Partners. I will continue the qualification as soon as they are received.";const held=Array.isArray(checklist)?checklist.filter(x=>x.status==="ON_FILE"):[];const outstanding=Array.isArray(checklist)?checklist.filter(x=>x.status!=="ON_FILE"&&x.status!=="NOT_REQUIRED"):[];return "Internal file check for "+(matter?.reference_number||"this matter")+" completed.\n\nOn file:\n"+(held.length?held.map(x=>"☑ "+x.document).join("\n"):"☑ No documents were confirmed on file in this message.")+"\n\nAnthony will obtain from the client:\n"+(outstanding.length?outstanding.slice(0,10).map(x=>"☐ "+x.document).join("\n"):"☐ No additional file items are currently outstanding.")+"\n\nI will request the outstanding information/documents from the client and will not proceed to the next authorised stage until the required evidence and payment gate are satisfied."}if(payment.seen)return "The qualification/file check for "+(matter?.reference_number||"this matter")+" is complete. I can see a payment recorded against the matter, so I will proceed with the next authorised stage.";return "The qualification/file check for "+(matter?.reference_number||"this matter")+" is complete. I do not currently see a payment recorded against the matter. Please reach out to the client about payment; I will also send a reminder to the listed number."};
    if(!this.provider.isConfigured())return fallback();try{const result=await this.provider.generate({temperature:.2,maxOutputTokens:1100,system:"You are Anthony Isaacs, executive assistant and immigration portfolio coordinator at Isaacs & Partners. "+roleInstruction+" Use checkbox formatting. Never claim a payment exists unless the database result says seen=true. Never invent a document or fact. Be concise.",user:JSON.stringify({matter:matter?.reference_number,mode,checklist:checklist.slice(0,10),missing:missing.slice(0,10),complete,payment:{seen:payment.seen}})});return clean(result?.text)||fallback()}catch{return fallback()}}
  async process({identity,conversationId=null,matterId=null,body}={}){const workflow=await this.load({conversationId,matterId});if(!workflow||String(workflow.state||"").toUpperCase()!=="QUALIFICATION")return null;const matter=await this.matter(workflow.matter_id);const mode=modeFor(identity);const facts=JSON.parse(JSON.stringify(workflow.known_facts||{}));const caseType=matter?.service_type==="IMM-CRITICAL-SKILLS"?"critical_skills":matter?.service_type==="IMM-GENERAL"?"general_work":"temporary_residence";const engine=new ImmigrationInterviewEngine({caseType,answers:facts});const current=engine.getNextQuestions(1)[0]||null;const extracted=await this.extractAnswer({question:current?.q||"Internal document checklist",body,mode});const explicitChecks=extractExplicitDocumentChecks(body);let changed=false;
    for(const item of extracted?.answers||[]){if(item?.key&&item?.value){setPath(facts,item.key,item.value);changed=true}}
    const checks={...(facts._document_checks||{})};
    const knownDocs=Object.values(DOCUMENTS);
    for(const item of [...(extracted?.documentChecks||[]),...explicitChecks]){
      if(!item?.document)continue;
      const raw=String(item.document).toLowerCase();
      const matched=knownDocs.find(d=>raw.includes(String(d).toLowerCase())||String(d).toLowerCase().includes(raw));
      checks[matched||item.document]={present:Boolean(item.present),not_required:Boolean(item.notRequired),source:mode};
    }
    facts._document_checks=checks;facts._last_actor_mode=mode;
    const updatedEngine=new ImmigrationInterviewEngine({caseType,answers:facts});
    const completeness=updatedEngine.completeness();
    const missing=updatedEngine.getNextQuestions(8).map(x=>({key:x.key,question:x.q,document:DOCUMENTS[x.key]||"Supporting evidence"}));
    const requiredDocs=[...new Set((workflow.required_question_keys||[]).map(key=>DOCUMENTS[key]||"Supporting evidence"))];
    const pendingFileChecks=requiredDocs.filter(document=>facts._document_checks?.[document]?.present!==true && facts._document_checks?.[document]?.not_required!==true).map(document=>({document}));
    const complete=completeness.ready;
    const payment=await this.paymentStatus(workflow.matter_id);
    const nextState=complete?"QUALIFICATION_COMPLETE":"QUALIFICATION";
    if(changed||JSON.stringify(workflow.known_facts||{})!==JSON.stringify(facts))await this.save(workflow,{known_facts:facts,state:nextState,application_completed_at:complete?new Date().toISOString():workflow.application_completed_at});
    const internalChecklist=[...new Map([...pendingFileChecks.map(x=>({...x,status:"OUTSTANDING"})),...requiredDocs.filter(document=>facts._document_checks?.[document]?.present===true).map(document=>({document,status:"ON_FILE"})),...requiredDocs.filter(document=>facts._document_checks?.[document]?.not_required===true).map(document=>({document,status:"NOT_REQUIRED"}))].map(x=>[x.document,x])).values()];
    const effectiveMissing=mode==="CLIENT_DOCUMENT_REQUEST"?missing:internalChecklist;
    const reply=await this.phrase({mode,matter,checklist:internalChecklist,missing:effectiveMissing,complete,payment});
    return {handled:true,action:"IMMIGRATION_QUALIFICATION",executed:true,mode,matter,workflow:{...workflow,state:nextState,known_facts:facts},completeness,checklist:pendingFileChecks,missing:effectiveMissing,payment,complete,reply}}
}
