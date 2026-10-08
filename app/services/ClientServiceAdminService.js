import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";
const RPC_URL=`${authConfig.supabase.url}/rest/v1/rpc`;
class ClientServiceAdminService{
 async request(name,body={}){await auth.initialise();if(!auth.isAuthenticated())throw new Error("Authentication required.");const r=await fetch(`${RPC_URL}/${name}`,{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json",apikey:authConfig.supabase.publishableKey,Authorization:`Bearer ${auth.getToken()}`},body:JSON.stringify(body)});const raw=await r.text();let d=null;try{d=raw?JSON.parse(raw):null}catch{}if(!r.ok)throw new Error(d?.message||d?.details||d?.hint||"Service access request failed.");return d;}
 snapshot(){return this.request("client_service_admin_snapshot")}
 grant(args){return this.request("client_service_grant",{p_business_id:args.businessId,p_client_user_id:args.clientUserId,p_service_code:args.serviceCode,p_billing_model:args.billingModel||"ONE_OFF",p_amount:Number(args.amount||0),p_grace_days:Number(args.graceDays||0),p_notes:args.notes||null})}
 revoke(id,reason){return this.request("client_service_revoke",{p_entitlement_id:id,p_reason:reason||null})}
 unlock(id,notes){return this.request("client_service_unlock_paid",{p_entitlement_id:id,p_notes:notes||null})}
 price(serviceCode,amount,notes){return this.request("service_price_set",{p_service_code:serviceCode,p_amount:Number(amount),p_notes:notes||null})}
}
export default new ClientServiceAdminService();
