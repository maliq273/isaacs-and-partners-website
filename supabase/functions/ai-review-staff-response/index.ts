import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import AIProviderService from "https://raw.githubusercontent.com/maliq273/isaacs-and-partners-website/682e60be1a1ecd36842c8771aea695fad70b6562/app/ai/providers/AIProviderService.js";
import CompanyTruthService from "https://raw.githubusercontent.com/maliq273/isaacs-and-partners-website/660269e3cdbff9aa89c66744947a4b2ad2dce5a2/app/ai/CompanyTruthService.js";

const corsHeaders={"Access-Control-Allow-Origin":"https://www.isaacsandpartners.online","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:corsHeaders});
const clean=(v:unknown,max=8000)=>String(v??"").trim().slice(0,max);
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:corsHeaders});
 if(req.method!=="POST")return json({error:"Method not allowed."},405);
 try{
  const url=Deno.env.get("SUPABASE_URL");const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");const anon=Deno.env.get("SUPABASE_ANON_KEY")??Deno.env.get("SUPABASE_PUBLISHABLE_KEY");const bearer=clean(req.headers.get("Authorization"),4096).replace(/^Bearer\s+/i,"");
  if(!url||!service||!anon||!bearer)return json({error:"Authentication is required."},401);
  const admin=createClient(url,service,{auth:{autoRefreshToken:false,persistSession:false}});const caller=createClient(url,anon,{auth:{autoRefreshToken:false,persistSession:false}});const verified=await caller.auth.getUser(bearer);if(verified.error||!verified.data.user)return json({error:"Authenticated user could not be verified."},401);const actor=verified.data.user;
  const profile=await admin.from("profiles").select("id,role,is_active").eq("id",actor.id).maybeSingle();if(profile.error)throw profile.error;if(!profile.data||profile.data.is_active===false)return json({error:"Active staff identity is required."},403);
  const isAdmin=String(profile.data.role).toUpperCase()==="SUPER_ADMIN";const canAnswer=await admin.rpc("staff_ai_can",{p_staff_user_id:actor.id,p_capability:"ANSWER_AI_QUERIES"});if(!isAdmin&&!canAnswer.data)return json({error:"You are not authorised to use Anthony response review."},403);
  const payload=await req.json().catch(()=>({}));const interventionId=clean(payload.interventionId,64);const staffResponse=clean(payload.response,8000);if(!interventionId||!staffResponse)return json({error:"Intervention and staff response are required."},400);
  const intervention=await admin.from("human_interventions").select("id,conversation_id,client_user_id,matter_id,status,question,reason,ai_context").eq("id",interventionId).maybeSingle();if(intervention.error)throw intervention.error;if(!intervention.data)return json({error:"Intervention not found."},404);
  if(!isAdmin){const assigned=await admin.from("human_interventions").select("assigned_staff_id").eq("id",interventionId).maybeSingle();if(assigned.error)throw assigned.error;if(assigned.data?.assigned_staff_id!==actor.id)return json({error:"This intervention is not assigned to you."},403);}
  const provider=new AIProviderService();const companyTruth=new CompanyTruthService();const context=companyTruth.buildContext(`${staffResponse}\n${clean(intervention.data.question,3000)}`,{limit:16});
  const system=`You are Anthony, the client-facing AI liaison for Isaacs & Partners. A staff member has supplied an internal draft response to a client. Rewrite it into a client-safe response. Preserve verified facts and the staff member's intended answer, but remove internal commentary, staff names unless appropriate, private operational details, credentials, internal instructions, uncertainty presented as fact, and unsupported promises. Never invent a price, legal conclusion, appointment, matter status or commitment. If the draft cannot safely answer the client, produce a concise response saying Anthony needs to confirm the matter with the team. Do not mention that you edited or filtered the response.`;
  const userPrompt=`CLIENT QUESTION:\n${clean(intervention.data.question,4000)}\n\nSTAFF DRAFT:\n${staffResponse}\n\nAPPROVED COMPANY CONTEXT:\n${JSON.stringify(context).slice(0,16000)}\n\nReturn only the final client-facing message.`;
  const generated=await provider.generate({system,user:userPrompt,temperature:0.15,maxOutputTokens:1000});const reviewed=clean(generated?.text||staffResponse,4096);if(!reviewed)return json({error:"Anthony could not produce a safe client response."},502);
  await admin.from("human_interventions").update({ai_context:{...(intervention.data.ai_context||{}),anthony_review:{reviewed_at:new Date().toISOString(),reviewed_by:actor.id,original_staff_response:staffResponse,client_safe_response:reviewed}}}).eq("id",interventionId);
  return json({success:true,reviewedResponse:reviewed,provider:generated?.provider||null,model:generated?.model||null});
 }catch(error){return json({error:error instanceof Error?error.message:"Anthony response review failed."},500)}
});