/* Deployed source for the immigration-document-engine Edge Function. */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const secretKeys = (()=>{ try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}"); } catch { return {}; } })();
const publishableKeys = (()=>{ try { return JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}"); } catch { return {}; } })();
const SERVICE_KEY = secretKeys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ANON_KEY = publishableKeys.default || Deno.env.get("SUPABASE_ANON_KEY") || "";
const INTERNAL = Deno.env.get("OPENWA_WORKER_TOKEN") || Deno.env.get("AI_INTERNAL_WORKER_TOKEN") || "";
const REPO_RAW = "https://raw.githubusercontent.com/maliq273/isaacs-and-partners-website/main/";
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth:{persistSession:false,autoRefreshToken:false} });
const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-ai-internal-worker-token,x-openwa-worker-token","Access-Control-Allow-Methods":"GET,POST,OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json",...cors}});
const clean=(v:unknown,max=5000)=>String(v??"").trim().slice(0,max);
const TEMPLATES:Record<string,string>={DHA_84:"immigrations_docs/Visitor-Visa-Application-Form-DHA-84-Form-11-June-19-2014.pdf",DHA_1738:"immigrations_docs/FORM-DHA-1738_e-version.pdf",BI_947:"immigrations_docs/BI-947.pdf",BI_1712A:"immigrations_docs/Spousal-RelationshipBI-1712A-Form-12-1.pdf"};
function templatePath(input:string){const key=clean(input).toUpperCase();if(TEMPLATES[key])return TEMPLATES[key];if(Object.values(TEMPLATES).includes(input))return input;throw new Error("Unknown immigration PDF template.");}
async function loadTemplate(input:string){const path=templatePath(input);const response=await fetch(REPO_RAW+path);if(!response.ok)throw new Error(`Immigration template could not be retrieved: HTTP ${response.status}`);const bytes=new Uint8Array(await response.arrayBuffer());const digest=await crypto.subtle.digest("SHA-256",bytes);const hash=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,"0")).join("");const pdf=await PDFDocument.load(bytes,{ignoreEncryption:false});return {path,bytes,hash,pdf};}
function fieldType(field:any){return field?.constructor?.name||"PDFField";}
async function loadCoordinateMap(template:string){
 const key=clean(template).toUpperCase();
 const path=key==="DHA_84"?"DHA-84":key==="BI_947"?"BI-947":key==="BI_1712A"?"BI-1712A":null;
 if(!path) throw new Error("No authoritative coordinate map exists for this template.");
 const response=await fetch(REPO_RAW+"app/knowledgebase/immigration_docs/coordinate-maps/"+path+".json");
 if(!response.ok) throw new Error("Coordinate map could not be retrieved.");
 return await response.json();
}
function normAnchor(v:string){return String(v||"").toLowerCase().replace(/&nbsp;/g," ").replace(/<[^>]+>/g," ").replace(/[^a-z0-9]+/g," ").trim().replace(/\s+/g," ");}
function coordinateAnchor(id:string,label:string){
 const aliases:any={
  "previous_surnames":"Previous surname s","original_nationality":"nationality","nationality_acquired":"Where and when was present nationality obtained","email":"E mail address","spouse_dob":"Date of birth of","spouse_nationality":"Nationality","contacts":"Names of Organisations or persons you will be contacting during your stay in the Republic","transit_destination":"Destination after leaving the Republic","transit_mode":"Mode of travel to destination","transit_departure":"Intended date and port of departure from the Republic to that destination","declaration_date":"Date","sa_address":"Residential physical Address in the Republic","sa_host_id":"Identity document number or permanent residence permit number of South African host",
  "affirmative_details":"Give particulars if reply to any of the questions above is in the affirmative","transit_visa":"Visa or permit for destination country",
  "employer_address":"Name of Employer University Organisation","employer_phone":"Telephone No","employer_fax":"Fax No",
  "self_employed_address":"Address","self_employed_phone":"Telephone No","self_employed_fax":"Fax No",
  "temp_permit":"Type of temporary residence permit held","permit_valid_until":"Valid until","permit_office":"Issuing office","first_names":"First name s","dob":"Date of birth","nationality_current":"Present nationality","previous_relationships":"Details of previous marriage s or permanent spousal relationship s if any","home_phone":"Home","work_phone":"Work","email":"E mail address","adult_dependants":"Names of children over the age of 21 who are still dependent on the applicant and give reasons for dependency","current_duties":"Principal applicant Describe briefly your present last duties","residence_history":"FULL DETAILS OF PREVIOUS AND CURRENT RESIDENCE","health":"infectious physical mental condition","asylum_elsewhere":"applied for asylum in another country","signature_date":"Date",
  "contact_sa":"Postal address and telephone number at which you can be contacted in South Africa","spouse_employment":"Employment details of spouse",
  "a_id":"Identity No","b_id":"Identity No","a_foreigner_birthplace":"date of birth place of birth","b_foreigner_birthplace":"date of birth place of birth","a_expiry":"Date of expiry","b_expiry":"Date of expiry","a_first_names":"First name s","b_first_names":"First name s","a_dob":"Date of birth","b_dob":"Date of birth","a_foreigner_first_names":"First name s","b_foreigner_first_names":"First name s","a_foreigner_surname":"Surname","b_foreigner_surname":"Surname","a_foreigner_gender":"Gender","b_foreigner_gender":"Gender","a_foreigner_address":"Residential address","b_foreigner_address":"Residential address","a_foreigner_passport":"Passport No","b_foreigner_passport":"Passport No","a_foreigner_dob":"Date of birth","b_foreigner_dob":"Date of birth","a_foreigner_nationality":"Nationality","b_foreigner_nationality":"Nationality","a_foreigner_visa":"Type of visa permit held","b_foreigner_visa":"Type of visa permit held","a_foreigner_expiry":"Date of expiry","b_foreigner_expiry":"Date of expiry","a_relationship_duration":"spousal relationship for the past years","a_relationship_status":"spousal relationship","b_relationship_continues":"relationship mentioned in the preceding paragraph still subsists","a_exclusivity":"party to a marriage or spousal relationship","a_evidence":"documentation proving cohabitation","a_oath_date":"signed and sworn solemnly affirmed before me","b_oath_date":"signed and sworn solemnly affirmed before me","a_commissioner_first":"First name s","a_commissioner_surname":"Surname","a_commissioner_capacity":"Capacity","a_commissioner_place":"Place",
  "a_foreigner_birthplace":"Place of birth","b_foreigner_birthplace":"Place of Birth","a_commissioner":"Commissioner of Oaths","b_commissioner":"Commissioner of Oaths"
 };
 return aliases[id]||label.replace(/_/g," ");
}
function bboxPages(html:string){
 const pages:any[]=[]; const re=/<page\s+width="([^"]+)"\s+height="([^"]+)"[^>]*>([\s\S]*?)<\/page>/g; let m;
 while((m=re.exec(html))){const body=m[3];const lines:any[]=[];const lr=/<line\s+xMin="([^"]+)"\s+yMin="([^"]+)"\s+xMax="([^"]+)"\s+yMax="([^"]+)"[^>]*>([\s\S]*?)<\/line>/g;let lm;
 while((lm=lr.exec(body))){const text=normAnchor(lm[5].replace(/<word[^>]*>([\s\S]*?)<\/word>/g," $1 "));lines.push({xMin:Number(lm[1]),yMin:Number(lm[2]),xMax:Number(lm[3]),yMax:Number(lm[4]),text});}
 pages.push({width:Number(m[1]),height:Number(m[2]),lines});
 }
 return pages;
}
async function resolveDynamicCoordinateFields(map:any,template:string){
 const source=String(map?.source||"").split("/").pop()||"";
 const bboxFile=source.replace(/\.pdf$/i,".html");
 const response=await fetch(REPO_RAW+"app/knowledgebase/immigration_docs/bbox/"+bboxFile);
 if(!response.ok)throw new Error("BBOX source could not be retrieved for coordinate map.");
 const pages=bboxPages(await response.text());
 const specs=Object.entries(map?.answerPaths||{});
 const fields:any[]=[]; const unresolved:any[]=[];
 for(const [id,answerPath] of specs){
   const rawLabel=String((map?.unresolved||[]).find((x:any)=>x.id===id)?.label||id);
   const anchor=normAnchor(coordinateAnchor(id,rawLabel));
   const tokens=anchor.split(" ").filter((x:string)=>x.length>2&&!/^\d+$/.test(x));
   let best:any=null; const candidates:any[]=[];
   for(let pi=0;pi<pages.length;pi++)for(let li=0;li<pages[pi].lines.length;li++){
     const line=pages[pi].lines[li]; const score=tokens.reduce((n:number,t:string)=>n+(line.text.includes(t)?1:0),0);
     if(tokens.length && score>=Math.max(1,Math.ceil(tokens.length*0.6)))candidates.push({pi,line,score});
   }
   const desired=Number((map?.occurrences||{})[id]||1); const picked=candidates[Math.max(0,desired-1)];
   if(picked){const {pi,line,score}=picked;const x=Math.min(line.xMax+4,pages[pi].width-90);const y=Math.max(6,pages[pi].height-line.yMax-1);const h=Math.max(10,Math.min(22,line.yMax-line.yMin+3));const w=Math.max(50,pages[pi].width-x-30);best={field:id,answerPath,page:pi+1,writeRect:[x,y,w,h],anchor,anchorRect:[line.xMin,line.yMin,line.xMax,line.yMax],score};}
   if(best)fields.push(best); else unresolved.push({field:id,answerPath,reason:"ANCHOR_NOT_FOUND",anchor});
 }
 return {fields,unresolved,total:specs.length,resolved:fields.length};
}
function drawWrapped(page:any,text:string,x:number,y:number,maxWidth:number,maxHeight:number,font:any,size:number){
 const words=String(text).split(/\\s+/); let line=""; const lines:string[]=[];
 for(const word of words){const next=line?line+" "+word:word;if(font.widthOfTextAtSize(next,size)<=maxWidth) line=next; else {if(line)lines.push(line);line=word;}}
 if(line)lines.push(line);
 const maxLines=Math.max(1,Math.floor(maxHeight/(size*1.2)));
 for(let i=0;i<Math.min(lines.length,maxLines);i++) page.drawText(lines[i],{x,y:y+maxHeight-size-(i*size*1.2),size,font,color:rgb(0,0,0),maxWidth});
 return lines.length<=maxLines;
}
async function inspect(input:string){const {path,hash,pdf}=await loadTemplate(input);const form=pdf.getForm();const fields=form.getFields().map((field:any)=>({name:field.getName(),type:fieldType(field),required:typeof field.isRequired==="function"?field.isRequired():false,multiline:typeof field.isMultiline==="function"?field.isMultiline():false,options:typeof field.getOptions==="function"?field.getOptions():undefined}));return {template:input,path,sha256:hash,pages:pdf.getPageCount(),hasXFA:form.hasXFA(),fieldCount:fields.length,fields};}
async function authenticate(req:Request){const internal=clean(req.headers.get("x-ai-internal-worker-token")||req.headers.get("x-openwa-worker-token"),512);if(internal){if(!INTERNAL||internal!==INTERNAL)throw new Error("Invalid internal worker credentials.");return {internal:true,userId:null};}const auth=clean(req.headers.get("authorization"),4096).replace(/^Bearer\\s+/i,"");if(!auth)throw new Error("Authentication is required.");if(!ANON_KEY)throw new Error("Supabase authentication is not configured.");const caller=createClient(SUPABASE_URL,ANON_KEY,{global:{headers:{Authorization:`Bearer ${auth}`}},auth:{autoRefreshToken:false,persistSession:false}});const {data,error}=await caller.auth.getUser(auth);if(error||!data?.user?.id)throw new Error("Authenticated user could not be verified.");const {data:isAdmin,error:adminError}=await admin.rpc("is_super_admin");if(adminError)throw adminError;if(!isAdmin)throw new Error("Super Admin approval authority is required for official immigration document generation.");return {internal:false,userId:data.user.id};}
function valueAt(obj:any,path:string){return String(path||"").split(".").reduce((x,k)=>x?.[k],obj);}
function displayLabel(fieldName:string,answerPath:string|null){if(answerPath){const last=String(answerPath).split(".").pop()||answerPath;const labels:any={surname:"Surname",first_names:"Given names",dob_year:"DOB Year",dob_month:"DOB Month",dob_day:"DOB Day",nationality:"Nationality",passportNumber:"Passport",critical_skills:"Critical Skills",proposed_activities:"Proposed activities",phone:"Contact number",email:"Email",occupation:"Occupation",employer:"Employer",job_title:"Job title",salary:"Salary",work_location:"Work location"};return labels[last]||last.replace(/_/g," ");}return fieldName;}
function buildFieldAudit(fields:any[],fieldMap:any,answers:any,applied:any[],unresolved:any[]){
 const appliedByField=new Map((applied||[]).map((x:any)=>[x.field,x]));
 const unresolvedByField=new Map((unresolved||[]).map((x:any)=>[x.field,x]));
 const entries=fields.map((f:any)=>{
   const name=f.getName(); const answerPath=fieldMap?.[name]||null; const appliedEntry=appliedByField.get(name); const failed=unresolvedByField.get(name);
   const value=answerPath?valueAt(answers,String(answerPath)):undefined;
   if(appliedEntry)return {field:name,label:displayLabel(name,String(answerPath)),answerPath,status:"FILLED",value:String(value),type:appliedEntry.type};
   if(answerPath)return {field:name,label:displayLabel(name,String(answerPath)),answerPath,status:"NOT_AVAILABLE",reason:failed?.reason||"ANSWER_MISSING",type:fieldType(f)};
   return {field:name,label:displayLabel(name,null),answerPath:null,status:"UNMAPPED",reason:"NO_AUTHORITATIVE_ANSWER_MAPPING",type:fieldType(f)};
 });
 const filled=entries.filter((x:any)=>x.status==="FILLED");
 const unavailable=entries.filter((x:any)=>x.status==="NOT_AVAILABLE");
 const unmapped=entries.filter((x:any)=>x.status==="UNMAPPED");
 return {version:1,generatedAt:new Date().toISOString(),fieldCount:entries.length,filledCount:filled.length,notAvailableCount:unavailable.length,unmappedCount:unmapped.length,formPopulationComplete:unavailable.length===0&&unmapped.length===0,entries,filled,notAvailable:unavailable,unmapped};
}
async function populate({template,answers,fieldMap,metadata,matterId,clientUserId,actor}:{template:string,answers:any,fieldMap:any,metadata:any,matterId:any,clientUserId:any,actor:any}){const loaded=await loadTemplate(template);const pdf=loaded.pdf;const form=pdf.getForm();const fields=form.getFields();const known=new Set(fields.map((f:any)=>f.getName()));const unresolved:any[]=[];const applied:any[]=[];for(const [fieldName,answerPath] of Object.entries(fieldMap||{})){if(!known.has(fieldName)){unresolved.push({field:fieldName,reason:"FIELD_NOT_FOUND",answerPath});continue;}const value=valueAt(answers,String(answerPath));if(value===undefined||value===null||String(value)===""){unresolved.push({field:fieldName,reason:"ANSWER_MISSING",answerPath});continue;}const field:any=form.getField(fieldName);const type=fieldType(field);try{if(type==="PDFTextField")field.setText(String(value));else if(type==="PDFDropdown"||type==="PDFOptionList")field.select(String(value));else if(type==="PDFCheckBox"){const truth=[true,"true","yes","1","on","Y","X"].includes(value);truth?field.check():field.uncheck();}else if(type==="PDFRadioGroup")field.select(String(value));else {unresolved.push({field:fieldName,reason:"UNSUPPORTED_FIELD_TYPE",type,answerPath});continue;} applied.push({field:fieldName,answerPath,type});}catch(e){unresolved.push({field:fieldName,reason:"FIELD_WRITE_FAILED",type,error:e instanceof Error?e.message:"Unknown error"});}}
let coordinateApplied:any[]=[];
if(fields.length===0){
 const map=await loadCoordinateMap(template);
 if(map.sha256 && map.sha256!==loaded.hash)throw new Error("Coordinate map SHA-256 does not match the source government PDF. Regenerate the map before generating a form.");
 const resolvedMap=map.coordinateStrategy==="BBOX_LABEL_DYNAMIC"
   ? await resolveDynamicCoordinateFields(map,template)
   : {fields:map.fields||[],unresolved:[],total:(map.fields||[]).length,resolved:(map.fields||[]).length};
 if(resolvedMap.unresolved.length)throw new Error("Coordinate map could not resolve all authoritative field anchors: "+resolvedMap.unresolved.map((x:any)=>x.field).join(", "));
 const font=await pdf.embedFont(StandardFonts.Helvetica);
 for(const spec of resolvedMap.fields){
   const value=valueAt(answers,String(spec.answerPath));
   if(value===undefined||value===null||String(value)===""){unresolved.push({field:spec.field,reason:"ANSWER_MISSING",answerPath:spec.answerPath,page:spec.page});continue;}
   const page=pdf.getPage(spec.page-1); const [x,y,w,h]=spec.writeRect;
   const ok=drawWrapped(page,String(value),x,y,w,h,font,Math.min(9,Math.max(6,h*0.55)));
   if(!ok)unresolved.push({field:spec.field,reason:"TEXT_OVERFLOW",answerPath:spec.answerPath,page:spec.page});
   else coordinateApplied.push({field:spec.field,answerPath:spec.answerPath,page:spec.page,writeRect:spec.writeRect,anchor:spec.anchor});
 }
 if(unresolved.length)console.warn("[immigration-document-engine] Coordinate draft contains unresolved/missing fields:",unresolved.length);
} else {
 form.updateFieldAppearances(); form.flatten();
}
const fieldAudit=fields.length?buildFieldAudit(fields,fieldMap,answers,applied,unresolved):{version:2,generatedAt:new Date().toISOString(),fieldCount:coordinateApplied.length+unresolved.length,filledCount:coordinateApplied.length,notAvailableCount:unresolved.length,unmappedCount:0,formPopulationComplete:unresolved.length===0,entries:[...coordinateApplied.map((x:any)=>({...x,status:"FILLED",label:displayLabel(x.field,x.answerPath),value:String(valueAt(answers,String(x.answerPath))),coordinate:{page:x.page,writeRect:x.writeRect,anchor:x.anchor}})),...unresolved.map((x:any)=>({...x,status:"NOT_AVAILABLE",label:displayLabel(x.field,x.answerPath||null)}))],filled:coordinateApplied.map((x:any)=>({...x,status:"FILLED",label:displayLabel(x.field,x.answerPath),value:String(valueAt(answers,String(x.answerPath)))})),notAvailable:unresolved.map((x:any)=>({...x,status:"NOT_AVAILABLE",label:displayLabel(x.field,x.answerPath||null)})),unmapped:[]};
const bytes=await pdf.save();const path=`applications/${matterId||"unassigned"}/${crypto.randomUUID()}-${templatePath(template).split("/").pop()}`;const upload=await admin.storage.from("immigration-generated").upload(path,bytes,{contentType:"application/pdf",cacheControl:"3600",upsert:false});if(upload.error)throw upload.error;const record=await admin.from("immigration_application_documents").insert({matter_id:matterId||null,client_user_id:clientUserId||null,case_type:metadata?.caseType||"unknown",template_path:loaded.path,template_sha256:loaded.hash,generated_path:path,status:"NEEDS_REVIEW",field_manifest:fieldAudit,answers_snapshot:answers||{},checklist:metadata?.checklist||[],provenance:{source:"Anthony Isaacs",template_source:"GitHub /immigrations_docs",generated_by:actor||"SYSTEM"},generated_by:actor||null,generated_at:new Date().toISOString()}).select("id").single();if(record.error)throw record.error;const signed=await admin.storage.from("immigration-generated").createSignedUrl(path,604800);if(signed.error)throw signed.error;return {ok:true,documentId:record.data.id,template:loaded.path,templateSha256:loaded.hash,generatedPath:path,signedUrl:signed.data.signedUrl,appliedFields:fields.length?applied:coordinateApplied,fieldAudit,coordinateMapUsed:fields.length===0,reviewStatus:"NEEDS_REVIEW",submissionReady:false,formPopulationComplete:fieldAudit.formPopulationComplete};}
Deno.serve(async(req)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:cors});try{const url=new URL(req.url);if(req.method==="GET"&&url.searchParams.get("action")==="INSPECT_TEMPLATE")return json(await inspect(url.searchParams.get("template")||"DHA_1738"));const body=req.method==="POST"?await req.json():Object.fromEntries(url.searchParams.entries());const action=clean(body.action||"");if(action==="INSPECT_TEMPLATE")return json(await inspect(body.template||"DHA_1738"));if(action!=="GENERATE_FORM")return json({error:"Unsupported action."},400);const auth=await authenticate(req);return json(await populate({template:body.template||"DHA_1738",answers:body.answers||{},fieldMap:body.fieldMap||{},metadata:body.metadata||{},matterId:body.matter_id||null,clientUserId:body.client_user_id||null,actor:auth.userId}));}catch(e){console.error("[immigration-document-engine]",e);return json({error:e instanceof Error?e.message:"Immigration document generation failed."},400);}});
