import auth from "../auth/AuthService.js";
import navigation from "../core/navigation.js";
import dashboardData from "./DashboardDataService.js";
import adminDashboardData from "./AdminDashboardDataService.js";
import {resolveUserDashboardRole,clearRoleCache} from "./DashboardAccess.js";
import {getSuperAdminCategories} from "./SuperAdminDashboardConfig.js";

const PAGE_ROLES=Object.freeze({"client-dashboard":"INDIVIDUAL","business-dashboard":"BUSINESS","staff-dashboard":"STAFF","super-admin":"SUPER_ADMIN"});
const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const formatDate=value=>{if(!value)return"—";const d=new Date(value);return Number.isNaN(d.getTime())?String(value):new Intl.DateTimeFormat("en-ZA",{dateStyle:"medium",timeStyle:"short"}).format(d)};
const money=value=>{const n=Number(value||0);return Number.isFinite(n)?new Intl.NumberFormat("en-ZA",{style:"currency",currency:"ZAR",maximumFractionDigits:2}).format(n):"R0.00"};

class DashboardPageController{
  constructor(){this.initialised=false;this.loading=false;this.data=null;this.handleLogout=this.handleLogout.bind(this);this.handleRefresh=this.handleRefresh.bind(this)}
  async initialise(){if(this.initialised)return this;if(this.loading)return this.loading;this.loading=this._initialise();try{return await this.loading}finally{this.loading=false}}
  async _initialise(){
    await auth.initialise();
    if(!auth.isAuthenticated()){navigation.toLogin(this.getCurrentReturnUrl(),{replace:true});return this}
    const user=auth.getCurrentUser(),role=await resolveUserDashboardRole(user),pageRole=this.getPageRole();
    if(!this.canUsePage(role,pageRole)){navigation.toRoleDashboard(role,{replace:true});return this}
    try{
      this.data=pageRole==="SUPER_ADMIN"?await adminDashboardData.getDashboardSummary(role):await dashboardData.getCurrentDashboard({limit:10});
      this.data.user=user;this.data.role=role;this.data.dashboard=pageRole;this.render();
    }catch(error){console.error("[DashboardPageController] Dashboard data load failed:",error);this.renderError(error)}
    this.bindEvents();this.initialised=true;return this;
  }
  getPageRole(){return typeof document==="undefined"?null:PAGE_ROLES[document.body?.dataset?.page]||null}
  canUsePage(actualRole,pageRole){if(!pageRole)return true;if(actualRole==="SUPER_ADMIN")return pageRole==="SUPER_ADMIN"||pageRole==="STAFF";return actualRole===pageRole}
  getCurrentReturnUrl(){return typeof window==="undefined"?"/index.html":window.location.pathname+window.location.search+window.location.hash}
  render(){if(!this.data)return;this.renderUser();this.renderRoleDashboard();this.renderLogoutState()}
  renderUser(){const u=this.data.user||auth.getCurrentUser(),name=u?.name||u?.fullName||u?.full_name||[u?.firstName,u?.lastName].filter(Boolean).join(" ")||u?.email||"Super Admin";document.querySelectorAll("#dashboard-greeting,#admin-greeting").forEach(e=>e.textContent=`Welcome, ${name}`)}
  renderRoleDashboard(){const p=this.getPageRole();if(p==="INDIVIDUAL")return this.renderIndividual();if(p==="BUSINESS")return this.renderBusiness();if(p==="STAFF")return this.renderStaff();if(p==="SUPER_ADMIN")return this.renderSuperAdmin()}
  renderIndividual(){const m=this.data.matters||[],d=this.data.documents||[],a=this.data.appointments||[],i=this.data.invoices||[];this.setStatByIndex(0,m.length);this.setStatByIndex(1,d.length);this.setStatByIndex(2,a.length);this.setStatByIndex(3,this.calculateOutstandingBalance(i));this.setEmptyState(0,this.collectionMessage(m,"matter"));this.setEmptyState(1,this.collectionMessage(d,"outstanding document"));this.setEmptyState(2,this.collectionMessage(a,"upcoming appointment"))}
  renderBusiness(){const m=this.data.matters||[],d=this.data.documents||[],i=this.data.invoices||[];this.setStatByIndex(0,m.length);this.setStatByIndex(1,d.length);this.setStatByIndex(2,this.countComplianceItems(d));this.setStatByIndex(3,this.calculateOutstandingBalance(i));this.setEmptyState(0,this.collectionMessage(m,"business matter"));this.setEmptyState(1,this.collectionMessage(d,"outstanding document"))}
  renderStaff(){const m=this.data.matters||[],t=this.data.tasks||[],d=this.data.documents||[];this.setText("#staff-my-matters",m.length);this.setText("#staff-outstanding-tasks",t.length);this.setText("#staff-document-count",d.length);this.setText("#staff-ai-queue",t.length);this.setText("#staff-workload",m.length?`${m.length} matter(s) currently linked to your workload.`:"No matters currently assigned.")}
  renderSuperAdmin(){
    const d=this.data,c=d.counts||{};
    this.setText("#admin-open-matters",c.openMatters??0);this.setText("#admin-staff-count",c.activeStaff??0);this.setText("#admin-unassigned-count",c.unassignedMatters??0);
    this.setText("#admin-registration-pending",c.pendingRegistrations??0);this.setText("#admin-appointments-today",c.appointmentsToday??0);this.setText("#admin-documents-outstanding",c.outstandingDocuments??0);this.setText("#admin-invoices-outstanding",c.outstandingInvoices??0);this.setText("#admin-pending-quotes",c.pendingPreQuotes??0);
    this.setText("#admin-people-meta",`${c.activeStaff??0} active staff record(s)`);this.setText("#admin-open-matters-meta",`${c.openMatters??0} active matter(s)`);this.setText("#admin-unassigned-meta",`${c.unassignedMatters??0} require assignment`);this.setText("#admin-registration-meta",c.pendingRegistrations?`${c.pendingRegistrations} WhatsApp registration(s) awaiting review`:"No WhatsApp registrations awaiting review");this.setText("#admin-invoice-meta",money(c.outstandingBalance));
    const i=d.integrations||{},s=i.summary||{};this.setText("#admin-ai-events",(i.events||[]).length);this.setText("#admin-integration-summary",`${s.connectedProviders??0}/${s.providerCount??0} providers connected · ${s.pendingEvents??0} pending · ${s.failedEvents??0} failed`);
    this.setText("#admin-system-status",(s.failedEvents||0)>0?"Integration attention required":"Live control plane connected");this.setText("#admin-security-status","Authenticated SUPER_ADMIN session is active. Administrative reads remain subject to the existing RLS and server-side RPC/Edge Function boundaries.");
    this.renderNav();this.renderOverview();this.renderAuthority();this.renderCommunication();this.renderOperations();this.renderFinance();this.renderCostingCenter();this.renderNotifications();this.renderIntegrations();this.renderRegistrationQueue();
  }
  renderNav(){const root=document.querySelector("#super-admin-nav");if(!root)return;root.innerHTML=getSuperAdminCategories().map(c=>`<section class="admin-nav-group"><h3>${esc(c.title)}</h3>${c.modules.map(m=>`<a href="${esc(m.href)}"><strong>${esc(m.title)}</strong><span>${esc(m.description)}</span></a>`).join("")}</section>`).join("")}
  renderOverview(){const d=this.data,c=d.counts||{},i=d.integrations?.summary||{};const root=document.querySelector("#admin-overview-grid");if(!root)return;const cards=[
    ["People & authority",`${c.activeStaff||0} active staff · ${(d.authority||[]).filter(x=>x.is_active).length} active authority records`,"./authority-people.html"],
    ["Customer portal",`${(d.portal||[]).filter(x=>String(x.access?.status||"").toUpperCase()==="PENDING").length} pending approvals`,"./accounts.html"],
    ["WhatsApp",`${c.inboundToday||0} inbound · ${c.outboundToday||0} outbound today`,"./communications.html"],
    ["Operations",`${c.openMatters||0} open matters · ${(d.tasks||[]).filter(x=>!["DONE","COMPLETED","CLOSED"].includes(String(x.status||"").toUpperCase())).length} active tasks`,"./matters.html"],
    ["Documents",`${c.outstandingDocuments||0} outstanding/review`,"./document-vault.html"],
    ["Finance",`${c.pendingPreQuotes||0} pending quotes · ${money(c.outstandingBalance)} outstanding`,"./invoices.html"],
    ["Integrations",`${i.connectedProviders||0}/${i.providerCount||0} connected · ${i.failedEvents||0} failed events`,"./ai.html"],
    ["Reports",`Live data across operational and financial records`,"./reports.html"]
  ];root.innerHTML=cards.map(x=>`<a class="admin-overview-card" href="${x[2]}"><strong>${esc(x[0])}</strong><span>${esc(x[1])}</span><small>Open control surface →</small></a>`).join("")}
  renderAuthority(){const root=document.querySelector("#admin-authority-list");if(!root)return;const rows=(this.data.authority||[]).filter(x=>x.is_active).slice(0,8);root.innerHTML=rows.length?rows.map(r=>`<div class="admin-list-row"><div><strong>${esc(r.full_name)}</strong><small>${esc(r.phone_number||"")} · ${esc(r.job_title||"")}</small></div><span class="status-badge active">${esc(r.authority_role)}</span></div>`).join(""):"<div class='empty-state'>No active authority records available.</div>"}
  renderCommunication(){const c=this.data.counts||{},root=document.querySelector("#admin-communication-metrics");if(root)root.innerHTML=[["Active WhatsApp contacts",c.activeContacts||0],["Inbound today",c.inboundToday||0],["Outbound today",c.outboundToday||0],["Pending WhatsApp registrations",c.pendingRegistrations||0],["Unread/open notifications",c.pendingNotifications||0]].map(x=>`<div><span>${esc(x[0])}</span><strong>${esc(x[1])}</strong></div>`).join("")}
  renderOperations(){const c=this.data.counts||{},root=document.querySelector("#admin-operations-metrics");if(root)root.innerHTML=[["Open matters",c.openMatters||0],["Unassigned matters",c.unassignedMatters||0],["Active tasks",(this.data.tasks||[]).filter(x=>!["DONE","COMPLETED","CLOSED"].includes(String(x.status||"").toUpperCase())).length],["Appointments today",c.appointmentsToday||0]].map(x=>`<div><span>${esc(x[0])}</span><strong>${esc(x[1])}</strong></div>`).join("")}
  renderFinance(){const c=this.data.counts||{},root=document.querySelector("#admin-finance-grid");if(!root)return;root.innerHTML=[["Pending quotes",c.pendingPreQuotes||0],["Outstanding invoices",c.outstandingInvoices||0],["Outstanding balance",money(c.outstandingBalance)],["Payments recorded",(this.data.payments||[]).length]].map(x=>`<article><span>${esc(x[0])}</span><strong>${esc(x[1])}</strong></article>`).join("")}
  renderCostingCenter(){
    const root=document.querySelector("#admin-costing-center");
    if(!root)return;
    const c=this.data.costing||{},services=c.services||[],components=c.components||[],rules=c.rules||[];
    const money2=v=>money(v);
    root.innerHTML=services.length?services.map(s=>{
      const comps=components.filter(x=>String(x.service_id)===String(s.service_id));
      const rule=rules.filter(x=>String(x.service_id)===String(s.service_id)&&x.active).sort((a,b)=>Number(a.priority||100)-Number(b.priority||100))[0];
      const price=s.fixed_price!=null?Number(s.fixed_price):Math.max(Number(s.effective_minimum_fee||0),Number(s.component_billable_total||0)*(1+Number(s.rule_markup_percent||0)/100));
      const tax=price*Number(s.tax_rate||0)/100;
      return '<article class="costing-card"><header><div><span class="eyebrow">'+esc(s.code||"SERVICE")+'</span><h3>'+esc(s.name)+'</h3><p>'+esc(s.service_domain||"")+'</p></div><span class="status-badge '+(s.active?"active":"inactive")+'">'+(s.active?"ACTIVE":"INACTIVE")+'</span></header><div class="costing-summary"><div><span>Direct cost</span><strong>'+money2(s.direct_cost)+'</strong></div><div><span>Billable cost</span><strong>'+money2(s.component_billable_total)+'</strong></div><div><span>Quote before tax</span><strong>'+money2(price)+'</strong></div><div><span>Tax</span><strong>'+money2(tax)+'</strong></div><div><span>Quote total</span><strong>'+money2(price+tax)+'</strong></div></div><div class="costing-components">'+(comps.length?comps.map(x=>'<div><span>'+esc(x.component_name)+'</span><small>'+esc(x.component_type)+' · '+esc(x.quantity)+' × '+money2(x.unit_cost)+' · '+esc(x.markup_percent||0)+'% markup</small></div>').join(""):'<div class="empty-state">No cost components configured.</div>')+'</div><footer><span>Pricing: '+esc(rule?.pricing_mode||s.pricing_mode||"COST_PLUS")+'</span><span>Tax: '+esc(s.tax_rate||0)+'%</span><span>Minimum: '+money2(s.effective_minimum_fee||0)+'</span></footer></article>';
    }).join(""):'<div class="empty-state">No services have been configured in the costing centre yet. Add the service catalog and its cost components to make Anthony pricing-authoritative.</div>';
    const totalDirect=services.reduce((n,x)=>n+Number(x.direct_cost||0),0),totalPrices=services.reduce((n,x)=>n+(x.fixed_price!=null?Number(x.fixed_price):Math.max(Number(x.effective_minimum_fee||0),Number(x.component_billable_total||0)*(1+Number(x.rule_markup_percent||0)/100))),0);
    this.setText("#admin-costing-count",services.length);this.setText("#admin-costing-direct",money2(totalDirect));this.setText("#admin-costing-prices",money2(totalPrices));
  }
  renderNotifications(){const root=document.querySelector("#admin-notification-list");if(!root)return;const rows=[...(this.data.notifications||[])].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,8);root.innerHTML=rows.length?rows.map(n=>`<div class="admin-list-row"><div><strong>${esc(n.subject||"Notification")}</strong><small>${esc(n.message||"")} · ${esc(formatDate(n.created_at))}</small></div><span class="status-badge ${["UNREAD","OPEN","RECEIVED"].includes(String(n.status||"").toUpperCase())?"pending":"active"}">${esc(n.status||"")}</span></div>`).join(""):"<div class='empty-state'>No recent notifications available.</div>"}
  renderIntegrations(){const i=this.data.integrations||{},providers=i.providers||[],events=i.events||[];const root=document.querySelector("#admin-integrations");if(root)root.innerHTML=providers.length?providers.map(p=>{const s=String(p.status||"NOT_CONFIGURED").toUpperCase(),cl=s==="CONNECTED"?"active":s==="ERROR"?"inactive":"pending";return`<article class="integration-card"><div class="integration-card-header"><div><strong>${esc(p.display_name||p.provider_key)}</strong><small>${esc(p.provider_key)}</small></div><span class="status-badge ${cl}">${esc(s)}</span></div><div class="integration-meta"><span>${p.enabled?"Enabled":"Not configured"}</span><span>${esc(formatDate(p.last_success_at))}</span></div>${p.last_error?`<small class="integration-error">${esc(p.last_error)}</small>`:""}</article>`}).join(""):"<div class='empty-state'>Integration registry unavailable.</div>";const eroot=document.querySelector("#admin-integration-events");if(eroot)eroot.innerHTML=events.length?events.slice(0,10).map(e=>`<div class="integration-event-row"><div><strong>${esc(e.event_type||"EVENT")}</strong><small>${esc(e.entity_type||"")}${e.entity_id?" · "+esc(e.entity_id):""}</small></div><div><span class="status-badge ${String(e.status).toUpperCase()==="FAILED"?"inactive":String(e.status).toUpperCase()==="COMPLETED"?"active":"pending"}">${esc(e.status||"")}</span><small>${esc(formatDate(e.created_at))}</small></div></div>`).join(""):"<div class='empty-state'>No recent integration events.</div>"}
  renderRegistrationQueue(){const root=document.querySelector("#admin-registration-list");if(!root)return;const rows=(this.data.pendingRegistrations||[]).slice(0,10);root.innerHTML=rows.length?rows.map(r=>`<div class="admin-alert-row"><div><strong>${esc([r.first_name,r.last_name].filter(Boolean).join(" ")||r.phone_number||"Temporary WhatsApp contact")}</strong><small>${esc(r.claimed_account_type||"UNCLASSIFIED")} · ${esc(r.phone_number||"No phone")} · ${esc(r.email||"no email")}</small></div><span class="status-badge pending">Pending approval</span></div>`).join(""):"<div class='empty-state'>No WhatsApp registrations awaiting approval.</div>"}
  setText(selector,value){const e=document.querySelector(selector);if(e)e.textContent=String(value)}
  setStatByIndex(i,v){const c=document.querySelectorAll(".stats-grid .stat-card strong");if(c[i])c[i].textContent=String(v)}
  setEmptyState(i,v){const e=document.querySelectorAll(".dashboard-grid .empty-state");if(e[i])e[i].textContent=v}
  calculateOutstandingBalance(invoices){return money((invoices||[]).reduce((s,x)=>s+Number(x?.balance_due??x?.amount_due??0),0))}
  countComplianceItems(d){return(d||[]).filter(x=>/compliance|sars|uif|coida/i.test(String(x?.type||x?.category||x?.document_type||""))).length}
  collectionMessage(items,label){return items.length?`${items.length} ${label}${items.length===1?"":"s"} currently linked to your account.`:`No ${label}s are currently linked to your account.`}
  bindEvents(){document.querySelectorAll("[data-auth-action='logout']").forEach(b=>b.addEventListener("click",this.handleLogout));document.querySelectorAll("[data-admin-action='refresh']").forEach(b=>b.addEventListener("click",this.handleRefresh))}
  async handleRefresh(){this.initialised=false;this.data=null;await this.initialise()}
  async handleLogout(e){e?.preventDefault();try{const u=auth.getCurrentUser();clearRoleCache(u?.id||u?.user_id||null);await auth.logout({remote:true,reason:"user"});navigation.toLogin(null,{replace:true})}catch(error){console.error("[DashboardPageController] Logout failed:",error)}}
  renderLogoutState(){document.querySelectorAll("[data-auth-action='logout']").forEach(b=>b.disabled=false)}
  renderError(error){const n=document.querySelector("#dashboard-data-error");if(n){n.hidden=false;n.textContent=error?.code==="AUTHENTICATION_REQUIRED"?"Your session is no longer active. Please sign in again.":"Some dashboard data could not be loaded. The available live data remains visible; refresh to retry."}}
  safeRelativeHref(v){const href=String(v||"");return/^\.\/[A-Za-z0-9._-]+\.html$/.test(href)?href:"./super-admin.html"}
  escape(v){return esc(v)}
}
export const dashboardPageController=new DashboardPageController();
export {DashboardPageController};
export default dashboardPageController;