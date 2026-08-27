import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";

class AssignmentDataService {
    async token(){await auth.initialise();const token=auth.getToken?.();if(!token)throw new Error("Your session has expired. Please sign in again.");return token;}
    async request(path,options={}){const token=await this.token();const response=await fetch(`${authConfig.supabase.url}/rest/v1/${path}`,{...options,headers:{Accept:"application/json",apikey:authConfig.supabase.publishableKey,Authorization:`Bearer ${token}`,"Content-Type":"application/json",Prefer:"return=representation",...(options.headers||{})}});const body=await response.json().catch(()=>[]);if(!response.ok)throw new Error(body?.message||body?.hint||body?.details||`Supabase request failed (${response.status}).`);return body;}
    list(){return this.request("assignments?select=id,matter_id,case_id,quote_id,staff_id,assigned_by,status,assigned_at,completed_at,notes,staff:staff_id(id,user_id,employee_number,department,job_title,is_active),matter:matter_id(id,reference_number,title,status,priority)&order=assigned_at.desc");}
    async targets(){const [staff,matters]=await Promise.all([this.request("staff?is_active=eq.true&select=id,user_id,employee_number,department,job_title&order=employee_number"),this.request("matters?select=id,reference_number,title,status,priority&order=created_at.desc")]);return {staff,matters};}
    create(payload){return this.request("assignments",{method:"POST",body:JSON.stringify(payload)});}
    update(id,payload){return this.request(`assignments?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify(payload)});}
}
export default new AssignmentDataService();
