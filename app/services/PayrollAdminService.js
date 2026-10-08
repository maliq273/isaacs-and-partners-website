import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";
const RPC_URL=authConfig.supabase.url + "/rest/v1/rpc";
class PayrollAdminService{
 async request(name,body={}){
  await auth.initialise();if(!auth.isAuthenticated())throw new Error("Authentication required.");
  const r=await fetch(RPC_URL+"/"+name,{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json",apikey:authConfig.supabase.publishableKey,Authorization:"Bearer "+auth.getToken()},body:JSON.stringify(body)});
  const raw=await r.text();let d=null;try{d=raw?JSON.parse(raw):null}catch{}
  if(!r.ok)throw new Error(d?.message||d?.details||d?.hint||"Payroll administration request failed.");
  return d;
 }
 approvalSnapshot(){return this.request("super_admin_payroll_approval_snapshot")}
 approve(runId,notes){return this.request("payroll_internal_approve",{p_payroll_run_id:runId,p_notes:notes||null})}
 reviewerSnapshot(){return this.request("payroll_reviewer_admin_snapshot")}
 setReviewer(businessId,userId,notes){return this.request("payroll_reviewer_set",{p_business_id:businessId,p_user_id:userId,p_notes:notes||null})}
}
export default new PayrollAdminService();
