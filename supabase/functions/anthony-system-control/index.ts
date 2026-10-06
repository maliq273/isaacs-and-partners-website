import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ORIGIN=Deno.env.get("AI_LIAISON_ALLOWED_ORIGIN")||"https://www.isaacsandpartners.online";
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")||"";
const SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const ANON_KEY=Deno.env.get("SUPABASE_ANON_KEY")||Deno.env.get("SUPABASE_PUBLISHABLE_KEY")||"";
const INTERNAL=Deno.env.get("OPENWA_WORKER_TOKEN")||"";
const REPO_DEFAULT="maliq273/isaacs-and-partners-website";
const cors={"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Headers":"authorization,content-type,x-ai-internal-worker-token,x-openwa-worker-token","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json"};
const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
const clean=(v:any,n=8000)=>String(v??"").trim().slice(0,n);
const pathSafe=(p:string)=>p.replace(/^\/+|\/+$/g,"").replace(/\\/g,"/");
const blocked=(p:string)=>/(^|\/)(\.env(?:\.|$)|node_modules|\.git)(\/|$)|(^|\/)(service[_-]?role|secret|credentials?)(\/|\.|$)/i.test(p);
async function caller(req:Request,payload:any){
 const internal=clean(req.headers.get("X-AI-Internal-Worker-Token"),512)||clean(req.headers.get("X-OpenWA-Worker-Token"),512);
 if(internal){
  if(!INTERNAL||internal!==INTERNAL)throw new Error("Invalid internal worker credentials.");
  const uid=clean(payload?.actorUserId,128); if(!uid)throw new Error("actorUserId is required for internal system changes.");
  const u=await admin.auth.admin.getUserById(uid); if(u.error||!u.data?.user)throw new Error("Internal actor could not be resolved.");
  return u.data.user;
 }
 const token=clean(req.headers.get("Authorization"),4096).replace(/^Bearer\s+/i,"");
 if(!token)throw new Error("Authentication is required.");
 const c=createClient(SUPABASE_URL,ANON_KEY,{auth:{autoRefreshToken:false,persistSession:false}});
 const u=await c.auth.getUser(token); if(u.error||!u.data?.user)throw new Error("Authenticated user could not be verified.");
 return u.data.user;
}
async function githubConfig(){
 const r=await admin.rpc("get_github_integration_secret"); if(r.error)throw new Error("GitHub integration secret is unavailable: "+r.error.message);
 const row=Array.isArray(r.data)?r.data[0]:r.data; if(!row?.github_token||!row?.repository)throw new Error("GitHub integration is not configured.");
 return row;
}
async function gh(token:string,url:string,init:any={}){
 const res=await fetch(url,{...init,headers:{"Accept":"application/vnd.github+json","Authorization":`Bearer ${token}`,"X-GitHub-Api-Version":"2026-03-10","Content-Type":"application/json",...(init.headers||{})}});
 const data=await res.json().catch(()=>({})); if(!res.ok)throw new Error(`GitHub HTTP ${res.status}: ${data?.message||"request failed"}`); return data;
}
async function authorised(userId:string){
 const p=await admin.from("profiles").select("id,role,is_active").eq("id",userId).maybeSingle(); if(p.error)throw p.error;
 if(!p.data||p.data.is_active===false||String(p.data.role).toUpperCase()!=="SUPER_ADMIN")throw new Error("SUPER_ADMIN access is required.");
 const a=await admin.from("authority_directory").select("action_permissions").eq("user_id",userId).eq("is_active",true).maybeSingle();
 const permissions=a.data?.action_permissions||{}; if(a.data && permissions.manage_system===false)throw new Error("manage_system permission is not enabled for this authority record.");
 return p.data;
}
async function audit(actor:any,action:string,payload:any,result:any){
 await admin.from("audit_logs").insert({actor_user_id:actor.id,action,entity_type:"anthony_system_change",entity_id:payload.path||payload.branch||"system",new_data:{...result,request:payload},metadata:{source:"anthony-system-control"}});
 await admin.from("ai_agent_events").insert({actor_type:"SUPER_ADMIN",actor_user_id:actor.id,event_type:action,payload:{request:payload,result}});
}
const admin=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{autoRefreshToken:false,persistSession:false}});

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return json({error:"Method not allowed."},405);
 try{
  const payload=await req.json().catch(()=>({})); const actor=await caller(req,payload); await authorised(actor.id);
  const action=clean(payload.action,64).toUpperCase(); const cfg=await githubConfig(); const token=cfg.github_token; const repository=clean(payload.repository||cfg.repository||REPO_DEFAULT,200);
  const [owner,repo]=repository.split("/"); if(!owner||!repo)throw new Error("Invalid repository.");
  if(action==="READ_FILE"){
   const path=pathSafe(clean(payload.path,500)); if(!path||blocked(path))throw new Error("That path is not readable through Anthony's system-control boundary.");
   const data=await gh(token,`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(clean(payload.ref||"main",120))}`);
   const content=data?.content?atob(String(data.content).replace(/\n/g,"")):"";
   const result={repository,path,ref:payload.ref||"main",sha:data.sha,content};
   await audit(actor,"ANTHONY_SYSTEM_READ",payload,{sha:data.sha});
   return json({ok:true,result});
  }
  if(action==="STAGE_FILE_CHANGE"){
   const path=pathSafe(clean(payload.path,500)); const content=String(payload.content??""); if(!path||!content)throw new Error("path and content are required.");
   if(blocked(path))throw new Error("That path is blocked by the system-control security policy.");
   if(path.startsWith(".github/workflows/")&&!payload.allowWorkflow)throw new Error("Workflow changes require explicit allowWorkflow=true.");
   const branchRaw=clean(payload.branch,120)||`anthony/system-change-${Date.now()}`; const branch=branchRaw.replace(/[^A-Za-z0-9._\/-]/g,"-").slice(0,120);
   const mainRef=await gh(token,`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/main`);
   try{await gh(token,`https://api.github.com/repos/${owner}/${repo}/git/refs`,{method:"POST",body:JSON.stringify({ref:`refs/heads/${branch}`,sha:mainRef.object.sha})});}catch(e){if(!String(e?.message||e).includes("422"))throw e;}
   let current:any=null; try{current=await gh(token,`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`);}catch(e){if(!String(e?.message||e).includes("404"))throw e;}
   const commit=await gh(token,`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,{method:"PUT",body:JSON.stringify({message:clean(payload.message,200)||`Anthony: staged system change ${path}`,content:btoa(unescape(encodeURIComponent(content))),sha:current?.sha,branch})});
   const pr=await gh(token,`https://api.github.com/repos/${owner}/${repo}/pulls`,{method:"POST",body:JSON.stringify({title:clean(payload.title,240)||`Anthony system change: ${path}`,head:branch,base:"main",body:clean(payload.description,8000)||"Staged by Anthony's controlled system-change boundary. Production merge remains subject to repository CI/review." ,draft:true})});
   const result={repository,path,branch,commit_sha:commit.commit?.sha||null,pull_request:pr.html_url||null,production_merge_required:true};
   await audit(actor,"ANTHONY_SYSTEM_CHANGE_STAGED",payload,result);
   return json({ok:true,result});
  }
  throw new Error("Unsupported system-control action.");
 }catch(error){return json({error:error instanceof Error?error.message:"Anthony system-control request failed."},400);}
});