import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")||"";
const ANON_KEY=Deno.env.get("SUPABASE_ANON_KEY")||"";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,content-type"};
const json=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json",...cors}});
const allowed=new Set(["PAYSTACK_MERCHANT_ID","PAYSTACK_PUBLIC_KEY","PAYSTACK_SECRET_KEY","OPENAI_API_KEY","ANTHROPIC_API_KEY","XAI_API_KEY","OPENWA_API_KEY","OPENWA_WORKER_TOKEN","OPENWA_WEBHOOK_SECRET","OPENWA_BASE_URL","OPENWA_SESSION_ID","GITHUB_TOKEN"]);
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({error:"POST required."},405);
 try{
  const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
  if(!token||!SUPABASE_URL||!ANON_KEY)return json({error:"Authentication or server configuration missing."},401);
  const db=createClient(SUPABASE_URL,ANON_KEY,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
  const user=await db.auth.getUser(token);
  if(user.error||!user.data.user)return json({error:"Authentication required."},401);
  const profile=await db.from("profiles").select("role,is_active").eq("id",user.data.user.id).maybeSingle();
  if(profile.error||!profile.data?.is_active||profile.data.role!=="SUPER_ADMIN")return json({error:"Only an active Super Admin can manage integration secrets."},403);
  const body=await req.json(),name=String(body.name||"").trim(),value=String(body.value||"");
  if(!allowed.has(name))return json({error:"That secret name is not permitted."},400);
  if(value.length<4||value.length>10000)return json({error:"Secret value is empty or too long."},400);
  const stored=await db.rpc("admin_secret_store",{p_name:name,p_value:value,p_description:"Managed by Super Admin Control Centre"});
  if(stored.error)return json({error:stored.error.message||"Supabase Vault rejected the secret."},400);
  return json({ok:true,name,message:name+" saved in encrypted Supabase Vault. Connected workers read supported values from Vault when an Edge Function environment secret is not set."});
 }catch(e){return json({error:String(e?.message||e)},500)}
});