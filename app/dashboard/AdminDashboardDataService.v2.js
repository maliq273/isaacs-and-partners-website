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

const DEFAULT_COSTING_SERVICES = [
  {
    service_id: "srv-001",
    code: "IMM-CSV",
    name: "Critical Skills Work Visa",
    service_domain: "Immigration & Visas",
    description: "End-to-end SAQA qualification evaluation, professional body registration & DHA visa submission",
    pricing_mode: "COST_PLUS",
    default_currency: "ZAR",
    tax_rate: 15,
    minimum_fee: 15000,
    active: true,
    direct_cost: 8500,
    component_billable_total: 22000,
    fixed_price: 30000,
    rule_markup_percent: 25,
    effective_minimum_fee: 15000
  },
  {
    service_id: "srv-002",
    code: "BIZ-CIPC",
    name: "Company Setup & CIPC Compliance Package",
    service_domain: "Commercial & Corporate",
    description: "Private company registration, CIPC filing, SARS tax clearance, PAYE/UIF & COIDA setup",
    pricing_mode: "FIXED",
    default_currency: "ZAR",
    tax_rate: 15,
    minimum_fee: 2500,
    active: true,
    direct_cost: 1200,
    component_billable_total: 3500,
    fixed_price: 4500,
    rule_markup_percent: 20,
    effective_minimum_fee: 2500
  },
  {
    service_id: "srv-003",
    code: "LBR-OUT",
    name: "Temporary Employee Outsourcing Retainer",
    service_domain: "Labour & Operations",
    description: "Comprehensive wage administration, statutory compliance (UIF/SDL/COIDA), and HR administration",
    pricing_mode: "COST_PLUS",
    default_currency: "ZAR",
    tax_rate: 15,
    minimum_fee: 1250,
    active: true,
    direct_cost: 950,
    component_billable_total: 1850,
    fixed_price: 2500,
    rule_markup_percent: 15,
    effective_minimum_fee: 1250
  },
  {
    service_id: "srv-004",
    code: "IMM-REV",
    name: "High Court Immigration Review",
    service_domain: "Litigation & High Court",
    description: "Urgent High Court review of unlawful DHA visa refusals or deportation notices",
    pricing_mode: "FIXED",
    default_currency: "ZAR",
    tax_rate: 15,
    minimum_fee: 50000,
    active: true,
    direct_cost: 35000,
    component_billable_total: 110000,
    fixed_price: 155000,
    rule_markup_percent: 30,
    effective_minimum_fee: 50000
  }
];

const DEFAULT_COST_COMPONENTS = [
  {
    id: "comp-001",
    service_id: "srv-001",
    component_name: "SAQA Qualification Evaluation & DHA Fees",
    component_type: "DISBURSEMENT",
    unit: "package",
    quantity: 1,
    unit_cost: 4500,
    markup_percent: 15,
    billable: true,
    active: true,
    sort_order: 1,
    notes: "Official statutory evaluation and Home Affairs submission fees"
  },
  {
    id: "comp-002",
    service_id: "srv-001",
    component_name: "Senior Immigration Practitioner Time",
    component_type: "LABOUR",
    unit: "hours",
    quantity: 8,
    unit_cost: 1800,
    markup_percent: 25,
    billable: true,
    active: true,
    sort_order: 2,
    notes: "Document drafting, compliance verification, and client liaison"
  },
  {
    id: "comp-003",
    service_id: "srv-002",
    component_name: "CIPC Name Reservation & Incorporation Fees",
    component_type: "DISBURSEMENT",
    unit: "filing",
    quantity: 1,
    unit_cost: 450,
    markup_percent: 0,
    billable: true,
    active: true,
    sort_order: 1,
    notes: "Direct statutory filing fee"
  },
  {
    id: "comp-004",
    service_id: "srv-002",
    component_name: "Tax & Compliance Registration Drafting",
    component_type: "LABOUR",
    unit: "package",
    quantity: 1,
    unit_cost: 2500,
    markup_percent: 20,
    billable: true,
    active: true,
    sort_order: 2,
    notes: "SARS, PAYE, UIF, and COIDA registration bundle"
  }
];

const DEFAULT_PRICING_RULES = [
  {
    id: "rule-001",
    service_id: "srv-001",
    rule_name: "Standard Immigration Cost-Plus Rule",
    pricing_mode: "COST_PLUS",
    fixed_price: 30000,
    markup_percent: 25,
    minimum_fee: 15000,
    maximum_discount_percent: 10,
    active: true,
    priority: 1
  },
  {
    id: "rule-002",
    service_id: "srv-002",
    rule_name: "Fixed Commercial Package Rule",
    pricing_mode: "FIXED",
    fixed_price: 4500,
    markup_percent: 20,
    minimum_fee: 2500,
    maximum_discount_percent: 5,
    active: true,
    priority: 1
  }
];

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

    const value=i=>(results[i]?.status==="fulfilled"&&Array.isArray(results[i]?.value))?results[i].value:[];
    const staff=value(0),matters=value(1),quotes=value(2),assignments=value(3),tasks=value(4),appointments=value(5);
    const documents=value(6),clientDocuments=value(7),invoices=value(8),payments=value(9),contacts=value(10),messages=value(11),notifications=value(12),rawAudit=value(13);
    const audit=rawAudit.map(row=>({...row,authority_role:row?.metadata?.authority_role||null,disclosure_rule:row?.metadata?.disclosure_rule||null,scope:row?.metadata?.authorization_scope||null}));
    const integrations=results[14].status==="fulfilled"?results[14].value:{providers:[],events:[],summary:{},warning:"Integration data unavailable."};
    const authority=results[15].status==="fulfilled"?results[15].value:{rows:[],warning:"Authority directory unavailable."};
    const portal=results[16].status==="fulfilled"?results[16].value:{clients:[],warning:"Client portal snapshot unavailable."};
    
    const fetchedServices=value(17);
    const fetchedComponents=value(18);
    const fetchedRules=value(19);
    const fetchedWorkbooks=value(20);

    const costingSummary=fetchedServices.length?fetchedServices:DEFAULT_COSTING_SERVICES;
    const costComponents=fetchedComponents.length?fetchedComponents:DEFAULT_COST_COMPONENTS;
    const pricingRules=fetchedRules.length?fetchedRules:DEFAULT_PRICING_RULES;
    const costingWorkbooks=fetchedWorkbooks;

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