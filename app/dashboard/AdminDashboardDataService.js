/**
 * Isaacs & Partners — Super Admin Dashboard Data Service
 *
 * The dashboard is a read/control surface over the existing production
 * data plane. It deliberately does not create a second data model.
 */
import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";
import integrationData from "../integrations/IntegrationDataService.js";
import clientPortalAdmin from "../services/ClientPortalAdminService.js";

const TABLES=Object.freeze({
  staff:"staff",matters:"matters",quotes:"quotes",assignments:"assignments",
  tasks:"tasks",appointments:"appointments",documents:"documents",
  client_documents:"client_documents",invoices:"invoices",payments:"payments",
  communication_contacts:"communication_contacts",communication_messages:"communication_messages",
  notifications:"notifications",
  authority_action_audit:"authority_action_audit",service_catalog:"service_catalog",service_cost_components:"service_cost_components",service_pricing_rules:"service_pricing_rules",service_costing_summary:"service_costing_summary",service_costing_workbooks:"service_costing_workbooks"
});

class AdminDashboardDataService{
  constructor(){
    this.baseUrl=`${authConfig.supabase.url}/rest/v1`;
    this.functionsUrl=`${authConfig.supabase.url}/functions/v1`;
    this.publishableKey=authConfig.supabase.publishableKey;
    this.timeout=authConfig.request.timeout;
  }

  async request(path,options={}){
    await auth.initialise();
    if(!auth.isAuthenticated())throw Object.assign(new Error("An authenticated administrator session is required."),{code:"AUTHENTICATION_REQUIRED"});
    const token=auth.getToken();
    if(!token)throw Object.assign(new Error("Administrator access token is missing."),{code:"ADMIN_TOKEN_MISSING"});
    const controller=typeof AbortController!=="undefined"?new AbortController():null;
    const timer=controller?setTimeout(()=>controller.abort(),this.timeout):null;
    try{
      const response=await fetch(`${this.baseUrl}/${path}`,{
        ...options,
        headers:{Accept:"application/json",apikey:this.publishableKey,Authorization:`Bearer ${token}`,...(options.headers||{})},
        signal:controller?.signal
      });
      const raw=await response.text();let data=null;
      try{data=raw?JSON.parse(raw):null}catch{data=null}
      if(!response.ok)throw Object.assign(new Error(data?.message||data?.hint||`Administrative request failed (${response.status}).`),{status:response.status,details:data});
      return data;
    }catch(error){
      if(error?.name==="AbortError")throw Object.assign(new Error("Administrative data request timed out."),{code:"ADMIN_REQUEST_TIMEOUT"});
      throw error;
    }finally{if(timer)clearTimeout(timer)}
  }

  async table(name,select="id",extra={}){
    const params=new URLSearchParams({select});
    Object.entries(extra).forEach(([k,v])=>params.set(k,String(v)));
    return this.request(`${TABLES[name]}?${params.toString()}`);
  }

  async optionalTable(name,select,extra={}){
    try{return{data:Array.isArray(await this.table(name,select,extra))?await this.table(name,select,extra):[],warning:null}}
    catch(error){
      try{
        const data=await this.table(name,"id",extra);
        return{data:Array.isArray(data)?data:[],warning:`${name}: optional fields unavailable.`};
      }catch{
        return{data:[],warning:`${name}: unavailable under the current RLS/schema.`};
      }
    }
  }

  async writeTable(name,method,body,query=""){ return this.request(`${TABLES[name]}${query ? `?${query}` : ""}`,{method,headers:{"Content-Type":"application/json","Prefer":"return=representation"},body:JSON.stringify(body)}); }

  async authoritySnapshot(){
    const response=await fetch(`${this.functionsUrl}/admin-authority-directory`,{
      headers:{Accept:"application/json",apikey:this.publishableKey,Authorization:`Bearer ${auth.getToken()}`}
    });
    const raw=await response.text();let data=null;try{data=raw?JSON.parse(raw):null}catch{data=null}
    if(!response.ok)throw new Error(data?.error||"Authority directory could not be loaded.");
    return data;
  }

  async saveService(service){ return this.request("service_catalog?on_conflict=code",{method:"POST",headers:{"Content-Type":"application/json","Prefer":"resolution=merge-duplicates,return=representation"},body:JSON.stringify(service)}); }
  async saveCostComponent(component){ return this.writeTable("service_cost_components","POST",component); }
  async saveWorkbook(workbook){ return this.request("service_costing_workbooks?on_conflict=template_key",{method:"POST",headers:{"Content-Type":"application/json","Prefer":"resolution=merge-duplicates,return=representation"},body:JSON.stringify(workbook)}); }
  async getDashboardSummary(verifiedRole=null){
    await auth.initialise();
    if(verifiedRole!=="SUPER_ADMIN")throw Object.assign(new Error("SUPER_ADMIN role verification is required before loading administrative data."),{code:"SUPER_ADMIN_PROFILE_NOT_FOUND"});

    const today=new Date();today.setHours(0,0,0,0);
    const tomorrow=new Date(today);tomorrow.setDate(tomorrow.getDate()+1);
    const isoToday=today.toISOString();
    const isoTomorrow=tomorrow.toISOString();

    const results=await Promise.allSettled([
      this.table("staff","id,user_id,employee_number,department,job_title,is_active,created_at,updated_at"),
      this.table("matters","id,status,title,service_type,portal_request_status,created_at,updated_at"),
      this.table("quotes","id,status,customer_decision,total_amount:total,amount,total_amount_legacy:amount,created_at,updated_at"),
      this.table("assignments","id,matter_id,case_id,quote_id,staff_id,status,assigned_at"),
      this.table("tasks","id,status,assigned_staff_id,matter_id,case_id,due_at,created_at,updated_at"),
      this.table("appointments","id,status,starts_at,ends_at,delivery_mode,individual_user_id,business_id,matter_id,assigned_staff_id,created_at"),
      this.table("documents","id,status,required,document_type,category,matter_id,individual_user_id,business_id,created_at,updated_at"),
      this.table("client_documents","id,status,client_id,matter_id,created_at,updated_at"),
      this.table("invoices","id,status,total_amount:total,amount,amount_paid,balance_due,created_at,updated_at"),
      this.table("payments","id,invoice_id,amount,paid_amount:amount,paid_at,created_at"),
      this.table("communication_contacts","id,user_id,first_name,last_name,email,phone_number,identity_status,onboarding_state,dashboard_status,account_match_status,claimed_account_type,contact_type,is_active,onboarding_facts,created_at,updated_at"),
      this.table("communication_messages","id,customer_user_id,channel,direction,phone_number,chat_id,body,status,created_at,metadata"),
      this.table("notifications","id,recipient_user_id,channel,subject,message,status,created_at,updated_at"),
      this.table("authority_action_audit","id,authority_id,actor_user_id,actor_phone,action,target_type,target_id,request_text,decision,reason,before_data,after_data,metadata,created_at"),
      integrationData.getControlPlaneStatus(),
      this.authoritySnapshot(),
      clientPortalAdmin.snapshot(),
      this.table("service_costing_summary","service_id,code,name,service_domain,description,pricing_mode,default_currency,tax_rate,minimum_fee,active,direct_cost,component_billable_total,fixed_price,rule_markup_percent,effective_minimum_fee"),
      this.table("service_cost_components","id,service_id,component_name,component_type,unit,quantity,unit_cost,markup_percent,billable,active,sort_order,notes"),
      this.table("service_pricing_rules","id,service_id,rule_name,pricing_mode,fixed_price,markup_percent,minimum_fee,maximum_discount_percent,active,effective_from,effective_to,priority"),
      this.table("service_costing_workbooks","id,template_key,name,formula_version,data,active,updated_at")
    ]);

    const value=i=>results[i].status==="fulfilled"?results[i].value:[];
    const staff=value(0),matters=value(1),quotes=value(2),assignments=value(3),tasks=value(4),appointments=value(5);
    const documents=value(6),clientDocuments=value(7),invoices=value(8),payments=value(9),contacts=value(10),messages=value(11),notifications=value(12),rawAudit=value(13);\n    const audit=rawAudit.map(row=>({...row,authority_role:row?.metadata?.authority_role||null,disclosure_rule:row?.metadata?.disclosure_rule||null,scope:row?.metadata?.authorization_scope||null}));
    const integrations=results[15].status==="fulfilled"?results[15].value:{providers:[],events:[],summary:{},warning:"Integration data unavailable."};
    const authority=results[16].status==="fulfilled"?results[16].value:{rows:[],warning:"Authority directory unavailable."};
    const portal=results[17].status==="fulfilled"?results[17].value:{clients:[],warning:"Client portal snapshot unavailable."};
    const costingSummary=results[18].status==="fulfilled"?results[18].value:[];
    const costComponents=results[19].status==="fulfilled"?results[19].value:[];
    const pricingRules=results[20].status==="fulfilled"?results[20].value:[];
    const costingWorkbooks=results[21].status==="fulfilled"?results[21].value:[];

    const closed=new Set(["CLOSED","COMPLETED","CANCELLED","ARCHIVED"]);
    const finalQuotes=new Set(["APPROVED","ACCEPTED","REJECTED","DECLINED","CONVERTED","CANCELLED","CLOSED"]);
    const activeStaff=staff.filter(x=>x?.is_active===true);
    const openMatters=matters.filter(x=>!closed.has(String(x?.status||"").toUpperCase()));
    const activeAssignments=assignments.filter(x=>String(x?.status||"ACTIVE").toUpperCase()==="ACTIVE");
    const assignedMatterIds=new Set(activeAssignments.map(x=>String(x.matter_id)).filter(Boolean));
    const unassignedMatters=openMatters.filter(x=>!assignedMatterIds.has(String(x.id)));
    const pendingQuotes=quotes.filter(x=>!finalQuotes.has(String(x?.status||"").toUpperCase())&&String(x?.customer_decision||"").toUpperCase()!=="ACCEPTED");
    const todayAppointments=appointments.filter(x=>{const t=new Date(x?.starts_at||"");return !Number.isNaN(t.getTime())&&t.toISOString()>=isoToday&&t.toISOString()<isoTomorrow});
    const outstandingDocs=documents.filter(x=>x?.required!==false&&["OUTSTANDING","REJECTED","UNDER_REVIEW","PENDING"].includes(String(x?.status||"").toUpperCase())).length+
      clientDocuments.filter(x=>["OUTSTANDING","REJECTED","UNDER_REVIEW","PENDING"].includes(String(x?.status||"").toUpperCase())).length;
    const outstandingInvoices=invoices.filter(x=>!["PAID","CANCELLED","VOID","CLOSED"].includes(String(x?.status||"").toUpperCase()));
    const outstandingBalance=outstandingInvoices.reduce((sum,x)=>{const n=Number(x?.balance_due??x?.amount_due??x?.total_amount??0);return sum+(Number.isFinite(n)?n:0)},0);
    const unreadNotifications=notifications.filter(x=>["UNREAD","RECEIVED","PENDING","OPEN"].includes(String(x?.status||"").toUpperCase()));
    const inboundToday=messages.filter(x=>x?.direction==="INBOUND"&&x?.channel==="WHATSAPP"&&new Date(x.created_at)>=today).length;
    const outboundToday=messages.filter(x=>x?.direction==="OUTBOUND"&&x?.channel==="WHATSAPP"&&new Date(x.created_at)>=today).length;
    const pendingRegistrations=contacts.filter(x=>x?.is_active!==false&&["PENDING_ADMIN_APPROVAL","NOT_ACTIVATED_PENDING_APPROVAL"].includes(String(x?.dashboard_status||"").toUpperCase()));

    const warnings=results.map((r,i)=>r.status==="rejected"?`Data source ${i+1} unavailable: ${r.reason?.message||"request failed"}`:null).filter(Boolean);
    return{
      user:auth.getCurrentUser(),role:"SUPER_ADMIN",connected:true,
      counts:{
        staff:activeStaff.length,activeStaff:activeStaff.length,openMatters:openMatters.length,
        unassignedMatters:unassignedMatters.length,pendingPreQuotes:pendingQuotes.length,
        appointmentsToday:todayAppointments.length,outstandingDocuments:outstandingDocs,
        outstandingInvoices:outstandingInvoices.length,outstandingBalance,pendingNotifications:unreadNotifications.length,
        inboundToday,outboundToday,activeContacts:contacts.filter(x=>x?.is_active!==false).length,pendingRegistrations:pendingRegistrations.length
      },
      staff,matters,quotes,assignments,tasks,appointments,documents,clientDocuments,invoices,payments,contacts,messages,notifications,audit,
      authority:authority.rows||[],portal:portal.clients||[],pendingRegistrations,integrations,warnings,costing:{services:costingSummary,components:costComponents,rules:pricingRules,workbooks:costingWorkbooks}
    };
  }
}

export const adminDashboardData=new AdminDashboardDataService();
export {AdminDashboardDataService};
export default adminDashboardData;