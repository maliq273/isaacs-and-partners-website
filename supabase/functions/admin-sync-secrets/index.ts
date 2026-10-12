import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")||"";
const SERVICE_ROLE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const MANAGEMENT_TOKEN=Deno.env.get("SUPABASE_ACCESS_TOKEN")||"";
const PROJECT_REF=Deno.env.get("SUPABASE_PROJECT_REF")||"aglobzjtstbfwcsdhvmp";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type"};
const json=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json",...cors}});
const allowed=new Set(["PAYSTACK_SECRET_KEY","OPENAI_API_KEY","ANTHROPIC_API_KEY","OPENWA_API_KEY","GITHUB_TOKEN"]);
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"POST required."},405);
 try{
  const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
  if(!token||!SUPABASE_URL||!SERVICE_ROLE_KEY)return json({error:"Authentication or server configuration missing."},401);
  const db=createClient(SUPABASE_URL,SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const user=await db.auth.getUser(token);
  if(user.error||!user.data.user)return json({error:"Authentication required."},401);
  const profile=await db.from("profiles").select("role,is_active").eq("id",user.data.user.id).maybeSingle();
  if(profile.error||!profile.data?.is_active||profile.data.role!=="SUPER_ADMIN")return json({error:"Only an active Super Admin can manage integration secrets."},403);
  const body=await req.json(),name=String(body.name||"").trim(),value=String(body.value||"");
  if(!allowed.has(name))return json({error:"That secret name is not permitted."},400);
  if(value.length<4||value.length>10000)return json({error:"Secret value is empty or too long."},400);
  if(!MANAGEMENT_TOKEN)return json({error:"Secret sync is not enabled yet. Add SUPABASE_ACCESS_TOKEN as a secret for admin-sync-secrets in Supabase Edge Function settings, then retry. Your value was not saved."},503);
  const upstream=await fetch("https://api.supabase.com/v1/projects/"+encodeURIComponent(PROJECT_REF)+"/secrets",{method:"POST",headers:{Authorization:"Bearer "+MANAGEMENT_TOKEN,"Content-Type":"application/json"},body:JSON.stringify([{name,value}] )});
  const payload=await upstream.json().catch(()=>({}));
  if(!upstream.ok)return json({error:"Supabase rejected the secret sync (HTTP "+upstream.status+"). Check the Management API token permissions. No secret value was returned."},502);
  return json({ok:true,name,message:name+" saved to Supabase project secrets. Edge Functions will receive the updated secret after the provider applies the configuration."});
 }catch(e){return json({error:String(e?.message||e)},500)}
});
