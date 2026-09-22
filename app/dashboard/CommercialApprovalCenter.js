import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const esc=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const money=v=>new Intl.NumberFormat("en-ZA",{style:"currency",currency:"ZAR"}).format(Number(v)||0);

class CommercialApprovalCenter{
 constructor(){this.supabase=null;this.root=null;}
 async start(){
  await auth.initialise(); if(!auth.isAuthenticated())return;
  this.supabase=createClient(authConfig.supabase.url,authConfig.supabase.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const t=auth.getToken(),r=auth.getRefreshToken();if(t&&r)await this.supabase.auth.setSession({access_token:t,refresh_token:r});
  this.root=document.querySelector("#commercial-approval-center");if(!this.root)return;
  await this.render();this.bind();
 }
 async render(){
  const uid=auth.getCurrentUser()?.id;
  const n=await this.supabase.from("notifications").select("id,subject,message,status,metadata,created_at").eq("recipient_user_id",uid).order("created_at",{ascending:false}).limit(30);
  const rows=(n.data||[]).filter(x=>x.metadata?.estimate_id);
  if(!rows.length){this.root.innerHTML='<div class="empty-state">No commercial approvals awaiting action.</div>';return;}
  const ids=[...new Set(rows.map(x=>x.metadata.estimate_id))];
  const e=await this.supabase.from("client_estimates").select("id,service_name,status,rough_low,rough_high,proposed_total,approved_total,rough_currency,qualifying_answers,request_data,created_at").in("id",ids);
  const by=Object.fromEntries((e.data||[]).map(x=>[x.id,x]));
  this.root.innerHTML=rows.map(n=>{
   const x=by[n.metadata.estimate_id];if(!x)return "";
   const pending=["ESTIMATE_READY","AWAITING_APPROVAL","MODIFICATION_REQUESTED"].includes(String(x.status||""));
   return '<article class="commercial-approval-card"><div><span class="eyebrow">Anthony · Commercial Approval</span><h3>'+esc(x.service_name)+'</h3><p>'+esc(n.message)+'</p><div class="commercial-approval-metrics"><span>Indicative: <strong>'+money(x.rough_low,x.rough_currency)+' – '+money(x.rough_high,x.rough_currency)+'</strong></span><span>Proposed: <strong>'+money(x.proposed_total,x.rough_currency)+'</strong></span><span>Status: <strong>'+esc(x.status)+'</strong></span></div></div>'+(pending?'<div class="commercial-approval-actions"><button class="btn btn-primary" data-ca="APPROVE" data-id="'+x.id+'">APPROVE</button><button class="btn btn-secondary" data-ca="MODIFY" data-id="'+x.id+'">MODIFY</button><button class="btn btn-secondary" data-ca="REJECT" data-id="'+x.id+'">REJECT</button></div>':"")+'</article>';
  }).join("");
 }
 bind(){this.root.addEventListener("click",e=>{const b=e.target.closest("[data-ca]");if(b)this.act(b.dataset.ca,b.dataset.id);});}
 async act(action,id){
  try{
   let total=null,notes="";
   if(action==="APPROVE"){
    const estimate=(await this.supabase.from("client_estimates").select("proposed_total,rough_high").eq("id",id).single()).data;
    total=Number(estimate?.proposed_total||estimate?.rough_high||0);
    if(!total)throw new Error("No proposed commercial value is available.");
   }
   if(action==="MODIFY"){
    const raw=prompt("Enter the final approved amount in ZAR. Cancel to stop.");if(raw===null)return;total=Number(raw);if(!(total>0))throw new Error("Enter a valid final amount.");
    notes=prompt("Optional modification note:")||"Super Admin modified the commercial value.";
   }
   if(action==="REJECT")notes=prompt("Optional rejection note:")||"Rejected by Super Admin.";
   const {data,error}=await this.supabase.functions.invoke("commercial-approval-engine",{body:{action,estimate_id:id,approved_total:total,notes}});if(error)throw error;
   this.root.insertAdjacentHTML("beforebegin",'<div class="login-message">Commercial request '+esc(action.toLowerCase())+'d successfully.</div>');await this.render();
  }catch(e){console.error(e);alert(e.message||"Approval action failed.");}
 }
}
new CommercialApprovalCenter().start();