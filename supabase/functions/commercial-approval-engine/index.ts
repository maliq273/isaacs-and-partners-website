import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!, KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, INTERNAL=Deno.env.get("OPENWA_WORKER_TOKEN")||"";
const admin=createClient(SUPABASE_URL,KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-ai-internal-worker-token"};
const json=(b:any,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json",...cors}});
const n=(v:any)=>Math.max(Number(v)||0,0), c=(v:any,m=1000)=>String(v??"").trim().slice(0,m);

async function actor(req:Request,b:any){
 const internal=req.headers.get("X-AI-Internal-Worker-Token");
 if(internal&&INTERNAL&&internal===INTERNAL){
  const phone=c(b.actor_phone,64).replace(/\D/g,"");
  const q=await admin.from("authority_directory").select("id,user_id,phone_number,authority_role").eq("authority_role","SUPER_ADMIN").eq("is_active",true);
  const x=(q.data||[]).find((v:any)=>String(v.phone_number||"").replace(/\D/g,"")===phone);
  if(!x)throw new Error("SUPER_ADMIN authority could not be verified.");
  return {userId:x.user_id||null,authorityId:x.id,phone:x.phone_number};
 }
 const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
 if(!token)throw new Error("Authentication required.");
 const u=await admin.auth.getUser(token); if(u.error||!u.data.user)throw new Error("Authentication required.");
 const p=await admin.from("profiles").select("id,role,is_active").eq("id",u.data.user.id).maybeSingle();
 return {userId:u.data.user.id,role:p.data?.role,isActive:p.data?.is_active!==false};
}
async function superAdmin(a:any){
 if(a.authorityId)return a;
 if(a.role==="SUPER_ADMIN"&&a.isActive)return a;
 const q=await admin.from("authority_directory").select("id,user_id,phone_number").eq("user_id",a.userId).eq("authority_role","SUPER_ADMIN").eq("is_active",true).maybeSingle();
 if(q.error||!q.data)throw new Error("Super Admin authority required.");
 return {...a,authorityId:q.data.id,phone:q.data.phone_number};
}
function range(service:any,a:any){
 const code=String(service?.code||"");
 if(code==="TEMP_OUTSOURCING"||code==="HR-TEMP-STAFFING"){
  const rate=n(a.nt_rate||a.employee_rate), employees=Math.max(n(a.employees)||1,1);
  const nt=n(a.nt_hours)*rate, ot=n(a.ot_hours)*rate*1.5, sun=n(a.sunday_hours)*rate*(a.retail_sunday?1.5:2), ph=n(a.public_holiday_hours)*rate*2;
  const labour=(nt+ot+sun+ph)*employees, optional=(a.medical_test?2:0)+(a.ppe?1.5:0);
  const total=labour*(1+(5+1+2+5+12.5+8+optional)/100)*1.15;
  return {low:Math.round(total*.9),high:Math.round(total*1.15),proposed:Math.round(total),formula:{nt,ot,sunday:sun,public_holiday:ph,employees}};
 }
 if(code==="PERM_OUTSOURCING"){
  const total=n(a.monthly_salary)*12*.15*Math.max(n(a.employees)||1,1);
  return {low:Math.round(total*.9),high:Math.round(total*1.1),proposed:Math.round(total),formula:{annual_salary:n(a.monthly_salary)*12}};
 }
 if(code==="IMMIGRATION")return {low:8000,high:45000,proposed:30000,formula:{basis:"2026 published South African immigration market range; final company price requires approval"}};
 if(code==="LEGAL_SERVICES")return {low:2000,high:10000,proposed:6000,formula:{basis:"2026 published South African legal-service market references; final company price requires approval"}};
 if(code==="NOTARY_MEDIATION")return {low:1000,high:10000,proposed:5000,formula:{basis:"indicative market reference; final company price requires approval"}};
 if(code==="BUSINESS-COMPLIANCE-RETAINER")return {low:1250,high:1500,proposed:1250,formula:{basis:"company costing centre retainer anchor"}};
 const fixed=service?.pricing_mode==="FIXED"?n(service?.minimum_fee):n(service?.minimum_fee);
 return fixed?{low:Math.round(fixed*.9),high:Math.round(fixed*1.2),proposed:Math.round(fixed),formula:{basis:"company service catalogue"}}:{low:0,high:0,proposed:null,formula:{basis:"qualification required"}};
}
async function pdf(estimate:any,quote:any,client:any,org:any){
 const d=await PDFDocument.create(),p=d.addPage([595.28,841.89]),f=await d.embedFont(StandardFonts.Helvetica),b=await d.embedFont(StandardFonts.HelveticaBold);
 const gold=rgb(.788,.635,.153),ink=rgb(.08,.08,.1),muted=rgb(.38,.4,.45),white=rgb(1,1,1);
 const t=(s:any,x:number,y:number,z=10,font=f,color=ink)=>p.drawText(String(s??"").slice(0,105),{x,y,size:z,font,color});
 p.drawRectangle({x:0,y:790,width:595,height:52,color:ink}); t(org?.trading_name||org?.legal_name||"Isaacs & Partners",34,812,18,b,white); t("QUOTATION",420,812,18,b,gold);
 t("Isaacs & Partners Pty(Ltd)",34,758,11,b); t("Registration: "+(org?.registration_number||"2025/474736/07"),34,742,9,f,muted); t("Tax: "+(org?.income_tax_number||"—"),34,728,9,f,muted); t(org?.email||"info@isaacsandpartners.online",34,714,9,f,muted); t(org?.phone||org?.whatsapp||"",34,700,9,f,muted); t(org?.registered_address||org?.physical_address||"",34,686,8,f,muted); t(org?.vat_registered&&org?.vat_number?"VAT: "+org.vat_number:"VAT treatment: as applicable",34,672,8,f,muted);
 const cname=client?.trading_name||client?.legal_name||[client?.first_name,client?.last_name].filter(Boolean).join(" ")||client?.email||"Customer";
 t("Bill To",34,668,9,b,gold); t(cname,34,650,13,b); t(client?.email||"",34,634,9,f,muted); t(client?.phone||"",34,620,9,f,muted);
 t("Quote No.",390,668,9,b,gold); t(quote?.quote_number||"Pending",390,650,11,b); t("Date",390,632,9,b,gold); t(new Date().toISOString().slice(0,10),390,616,9,f,muted); t("Valid until",390,600,9,b,gold); t(quote?.expiry_date||"",390,584,9,f,muted);
 t(estimate.service_name,34,560,14,b); t("Prepared after Super Admin commercial approval.",34,542,9,f,muted); p.drawLine({start:{x:34,y:525},end:{x:561,y:525},thickness:1,color:gold});
 t("Description",34,505,9,b,gold); t("Quantity",400,505,9,b,gold); t("Amount",490,505,9,b,gold); t(estimate.service_name,34,480,11,b); t("1",405,480,10); t("R "+Number(quote?.total||estimate.approved_total||0).toLocaleString("en-ZA",{minimumFractionDigits:2}),490,480,10,b);
 p.drawLine({start:{x:34,y:458},end:{x:561,y:458},thickness:1,color:rgb(.85,.85,.85)}); t("Approved total",390,430,10,b); t("R "+Number(quote?.total||estimate.approved_total||0).toLocaleString("en-ZA",{minimumFractionDigits:2}),490,430,12,b,gold);
 t("This quotation is based on the approved commercial costing. Third-party/statutory charges are included only where stated.",34,370,8,f,muted); t(org?.default_payment_terms||"Payment terms as stated in the accepted quotation.",34,348,8,f,muted); t("Isaacs & Partners · "+(org?.website||"www.isaacsandpartners.online"),34,70,8,f,muted);
 return await d.save();
}
async function createQuote(e:any,total:number,a:any){
 const items=[{item_name:e.service_name,description:"Approved commercial quotation",quantity:1,rate:total,tax_rate:0}];
 const r=await admin.rpc("create_quote_transaction",{p_matter_id:e.request_data?.matter_id||null,p_individual_user_id:e.business_id?null:e.client_user_id,p_business_id:e.business_id||null,p_subject:e.service_name,p_description:"Approved quotation generated by Anthony after Super Admin approval.",p_currency:"ZAR",p_expiry_date:new Date(Date.now()+30*86400000).toISOString().slice(0,10),p_items:items});
 if(r.error)throw r.error; const q=await admin.from("quotes").update({status:"APPROVED",approved_by:a.userId,approved_at:new Date().toISOString(),delivery_status:"SENT",sent_at:new Date().toISOString()}).eq("id",r.data).select("*").single(); if(q.error)throw q.error;
 const oq=await admin.from("organisation_profiles").select("*").eq("is_active",true).order("updated_at",{ascending:false}).limit(1).maybeSingle();
 const cq=e.business_id?await admin.from("businesses").select("*").eq("id",e.business_id).maybeSingle():await admin.from("profiles").select("*").eq("id",e.client_user_id).maybeSingle();
 const bytes=await pdf({...e,approved_total:total},q.data,cq.data,oq.data), path="quotes/"+r.data+".pdf";
 const up=await admin.storage.from("commercial-documents").upload(path,bytes,{contentType:"application/pdf",upsert:true,cacheControl:"3600"}); if(up.error)throw up.error;
 await admin.from("client_estimates").update({status:"QUOTE_CREATED",quote_id:r.data,approved_total:total,approved_by:a.userId,approved_at:new Date().toISOString(),document_path:path,document_type:"QUOTE_PDF",updated_at:new Date().toISOString()}).eq("id",e.id);
 const su=await admin.storage.from("commercial-documents").createSignedUrl(path,604800); return {quote:q.data,quoteId:r.data,path,url:su.data?.signedUrl||null};
}
async function notify(e:any,text:string,url:string|null){
 const chat=e.request_data?.chat_id||e.request_data?.chatId, phone=e.request_data?.phone_number||e.request_data?.phone; if(!chat&&!phone)return;
 const chatId=chat||(String(phone).replace(/\D/g,"")+"@c.us");
 const m=await admin.from("communication_messages").insert({customer_user_id:e.client_user_id||null,channel:"WHATSAPP",direction:"OUTBOUND",phone_number:phone||null,chat_id:chatId,body:text,status:"QUEUED",metadata:{source:"commercial-approval-engine",estimate_id:e.id,document_url:url,document_filename:"Isaacs-Partners-Quote-"+e.id+".pdf"}}).select("id").single();
 if(m.error)throw m.error; const o=await admin.from("communication_outbox").insert({message_id:m.data.id,chat_id:chatId,status:"QUEUED"}); if(o.error)throw o.error;
}
async function main(req:Request){
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 const body=await req.json().catch(()=>({})),a=await actor(req,body),action=String(body.action||"").toUpperCase();
 if(action==="CREATE_ESTIMATE"){
  if(a.userId!==body.client_user_id||!["INDIVIDUAL","BUSINESS"].includes(a.role))throw new Error("Customer identity required.");
  const s=await admin.from("service_catalog").select("*").eq("code",c(body.service_code,100)).eq("active",true).maybeSingle(); if(s.error||!s.data)throw new Error("Selected service is not available.");
  const rr=range(s.data,body.qualifying_answers||{});
  const research=body.research_snapshot||{sources:[{label:"South Africa National Minimum Wage 2026",url:"https://www.labour.gov.za/Media-Desk/Media-Statements/Pages/Minister-of-Employment-and-Labour,-Meth-increases-the-statutory-National-Minimum-Wage-to-R30,23-per-hour.aspx",checked_at:new Date().toISOString()},{label:"APSO TES costing guidance",url:"https://apso.org.za/industry-news/500-calculation-of-statutory-provision-on-temp-mark-up",checked_at:new Date().toISOString()}]};
  const ins=await admin.from("client_estimates").insert({client_user_id:body.client_user_id,business_id:body.business_id||null,service_id:s.data.id,service_code:s.data.code,service_name:s.data.name,status:"ESTIMATE_READY",request_data:body.request_data||{},qualifying_answers:body.qualifying_answers||{},research_snapshot:research,rough_low:rr.low,rough_high:rr.high,proposed_total:rr.proposed,internal_costing_snapshot:{formula:rr.formula,source:"service_costing_and_workbook_rules"},created_by:a.userId}).select("id").single(); if(ins.error)throw ins.error;
  const admins=await admin.from("authority_directory").select("user_id,phone_number").eq("authority_role","SUPER_ADMIN").eq("is_active",true);
  for(const x of admins.data||[]){const alertText="⚠️ COMMERCIAL APPROVAL REQUIRED\n\nService: "+s.data.name+"\nIndicative range: R"+Number(rr.low||0).toLocaleString("en-ZA")+" - R"+Number(rr.high||0).toLocaleString("en-ZA")+"\nProposed: R"+Number(rr.proposed||0).toLocaleString("en-ZA")+"\n\nAnthony has prepared an indicative estimate. No final price may be sent until you decide.";const buttons=[{id:"APPROVE_"+ins.data.id,text:"APPROVE",type:"reply"},{id:"MODIFY_"+ins.data.id,text:"MODIFY",type:"reply"},{id:"REJECT_"+ins.data.id,text:"REJECT",type:"reply"}];if(x.user_id)await admin.from("notifications").insert({recipient_user_id:x.user_id,channel:"IN_APP",subject:"Commercial approval required",message:alertText,status:"UNREAD",metadata:{estimate_id:ins.data.id,action_buttons:buttons}});if(x.phone_number){const chatId=String(x.phone_number).replace(/\D/g,"")+"@c.us";const m=await admin.from("communication_messages").insert({customer_user_id:x.user_id||null,channel:"WHATSAPP",direction:"OUTBOUND",phone_number:x.phone_number,chat_id:chatId,body:alertText,status:"QUEUED",metadata:{source:"commercial-approval-engine",type:"COMMERCIAL_APPROVAL",estimate_id:ins.data.id,action_buttons:buttons,buttons}}).select("id").single();if(m.data?.id)await admin.from("communication_outbox").insert({message_id:m.data.id,chat_id:chatId,status:"QUEUED"});}};
  return json({ok:true,estimate_id:ins.data.id,status:"ESTIMATE_READY",rough_low:rr.low,rough_high:rr.high,currency:"ZAR",disclaimer:"Indicative estimate only — not a final quotation."});
 }
 if(["APPROVE","MODIFY","REJECT"].includes(action)){
  const sa=await superAdmin(a),eq=await admin.from("client_estimates").select("*").eq("id",c(body.estimate_id,64)).maybeSingle(); if(eq.error||!eq.data)throw new Error("Estimate not found."); const e=eq.data,before=e.status;
  if(action==="REJECT"){await admin.from("client_estimates").update({status:"REJECTED",approval_notes:c(body.notes,2000)||"Rejected by Super Admin.",updated_at:new Date().toISOString()}).eq("id",e.id);await admin.from("commercial_approval_actions").insert({estimate_id:e.id,action,actor_user_id:sa.userId,actor_phone:sa.phone||null,before_status:before,after_status:"REJECTED",notes:c(body.notes,2000)});await notify(e,"Anthony here — your request is not approved at this stage. I will keep the matter with Isaacs & Partners for further review.",null);return json({ok:true,status:"REJECTED"});}
  if(action==="MODIFY"){await admin.from("client_estimates").update({status:"MODIFICATION_REQUESTED",approval_notes:c(body.notes,2000)||"Super Admin requested modification.",updated_at:new Date().toISOString()}).eq("id",e.id);await admin.from("commercial_approval_actions").insert({estimate_id:e.id,action,actor_user_id:sa.userId,actor_phone:sa.phone||null,before_status:before,after_status:"MODIFICATION_REQUESTED",notes:c(body.notes,2000)});return json({ok:true,status:"MODIFICATION_REQUESTED"});}
  const total=n(body.approved_total)||n(e.proposed_total)||n(e.rough_high); if(total<=0)throw new Error("An approved final price is required.");
  const result=await createQuote(e,total,sa); await admin.from("commercial_approval_actions").insert({estimate_id:e.id,action,actor_user_id:sa.userId,actor_phone:sa.phone||null,before_status:before,after_status:"QUOTE_CREATED",notes:c(body.notes,2000),metadata:{quote_id:result.quoteId,document_path:result.path}});
  await notify(e,"Your approved quotation "+(result.quote?.quote_number||"")+" is ready. Anthony has prepared the official Isaacs & Partners quotation PDF.",result.url);
  return json({ok:true,status:"QUOTE_CREATED",quote_id:result.quoteId,document_url:result.url});
 }
 if(action==="DOCUMENT_URL"){
  const e=await admin.from("client_estimates").select("id,client_user_id,document_path").eq("id",c(body.estimate_id,64)).maybeSingle(); if(e.error||!e.data)throw new Error("Estimate not found.");
  if(a.userId!==e.data.client_user_id&&a.role!=="SUPER_ADMIN"&&!a.authorityId)throw new Error("Not authorised."); if(!e.data.document_path)throw new Error("Document is not available yet.");
  const s=await admin.storage.from("commercial-documents").createSignedUrl(e.data.document_path,3600); if(s.error)throw s.error; return json({ok:true,url:s.data.signedUrl});
 }
 throw new Error("Unsupported commercial approval action.");
}
Deno.serve(async req=>{try{return await main(req)}catch(e){console.error(e);return json({error:e instanceof Error?e.message:"Commercial approval engine failed."},400)}});