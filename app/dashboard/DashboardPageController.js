import auth from "../auth/AuthService.js";
import navigation from "../core/navigation.js";
import dashboardData from "./DashboardDataService.js";
import adminDashboardData from "./AdminDashboardDataService.js?v=20260922-costing-fix-1";
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
    const c=this.data.costing||{},services=c.services||[],components=c.components||[],rules=c.rules||[],saved=c.workbooks||[];
    const money2=v=>money(v);
    const serviceCards=services.map(s=>{
      const comps=components.filter(x=>String(x.service_id)===String(s.service_id));
      const rule=rules.filter(x=>String(x.service_id)===String(s.service_id)&&x.active).sort((a,b)=>Number(a.priority||100)-Number(b.priority||100))[0];
      const price=s.fixed_price!=null?Number(s.fixed_price):Math.max(Number(s.effective_minimum_fee||0),Number(s.component_billable_total||0)*(1+Number(s.rule_markup_percent||0)/100));
      const tax=price*Number(s.tax_rate||0)/100;
      return '<article class="costing-card"><header><div><span class="eyebrow">'+esc(s.code||"SERVICE")+'</span><h3>'+esc(s.name)+'</h3><p>'+esc(s.service_domain||"")+'</p></div><span class="status-badge '+(s.active?"active":"inactive")+'">'+(s.active?"ACTIVE":"INACTIVE")+'</span></header><div class="costing-summary"><div><span>Direct cost</span><strong>'+money2(s.direct_cost)+'</strong></div><div><span>Billable cost</span><strong>'+money2(s.component_billable_total)+'</strong></div><div><span>Quote before tax</span><strong>'+money2(price)+'</strong></div><div><span>Tax</span><strong>'+money2(tax)+'</strong></div><div><span>Quote total</span><strong>'+money2(price+tax)+'</strong></div></div><div class="costing-components">'+(comps.length?comps.map(x=>'<div><span>'+esc(x.component_name)+'</span><small>'+esc(x.component_type)+' · '+esc(x.quantity)+' × '+money2(x.unit_cost)+' · '+esc(x.markup_percent||0)+'% markup</small></div>').join(""):'<div class="empty-state">No cost components configured.</div>')+'</div><footer><span>Pricing: '+esc(rule?.pricing_mode||s.pricing_mode||"COST_PLUS")+'</span><span>Tax: '+esc(s.tax_rate||0)+'%</span><span>Minimum: '+money2(s.effective_minimum_fee||0)+'</span></footer></article>';
    }).join("");
    const totalDirect=services.reduce((n,x)=>n+Number(x.direct_cost||0),0),totalPrices=services.reduce((n,x)=>n+(x.fixed_price!=null?Number(x.fixed_price):Math.max(Number(x.effective_minimum_fee||0),Number(x.component_billable_total||0)*(1+Number(x.rule_markup_percent||0)/100))),0);
    this.setText("#admin-costing-count",services.length);this.setText("#admin-costing-direct",money2(totalDirect));this.setText("#admin-costing-prices",money2(totalPrices));
    root.innerHTML=serviceCards+'<div class="costing-workbooks"><div class="workbook-heading"><div><span class="eyebrow">Excel-style calculation sheets</span><h3>Costing Workbooks</h3><p>Enter your figures in the yellow input cells. Totals calculate immediately and can be saved as the current company costing template.</p></div></div><div class="workbook-tabs">'+Object.entries(this.getCostingWorkbookTemplates()).map(([k,t],i)=>'<button type="button" class="workbook-tab '+(i===0?"active":"")+'" data-workbook="'+k+'">'+esc(t.name)+'</button>').join("")+'</div><div id="admin-costing-workbook-body"></div></div>';
    this.renderCostingWorkbook();
    const form=document.querySelector("#admin-costing-service-form");
    if(form&&!form.dataset.bound){form.dataset.bound="1";form.addEventListener("submit",async e=>{e.preventDefault();try{await adminDashboardData.saveService({code:form.code.value.trim(),name:form.name.value.trim(),service_domain:form.domain.value.trim()||null,description:form.description.value.trim()||null,pricing_mode:form.mode.value,default_currency:"ZAR",tax_rate:Number(form.tax.value||0),minimum_fee:Number(form.minimum.value||0),active:true});await this.handleRefresh();}catch(error){console.error(error);alert(error.message||"Could not save service.");}})}
    const cform=document.querySelector("#admin-costing-component-form");
    if(cform&&!cform.dataset.bound){cform.dataset.bound="1";cform.addEventListener("submit",async e=>{e.preventDefault();try{await adminDashboardData.saveCostComponent({service_id:cform.service.value,component_name:cform.component.value.trim(),component_type:cform.type.value,unit:cform.unit.value,quantity:Number(cform.quantity.value||1),unit_cost:Number(cform.unitCost.value||0),markup_percent:Number(cform.markup.value||0),billable:cform.billable.checked,active:true,sort_order:0,notes:cform.notes.value.trim()||null});await this.handleRefresh();}catch(error){console.error(error);alert(error.message||"Could not save cost component.");}})}
    const sel=document.querySelector("#admin-costing-component-service");if(sel)sel.innerHTML=services.map(x=>'<option value="'+esc(x.service_id)+'">'+esc(x.code+' — '+x.name)+'</option>').join("");
  }
  renderCostingWorkbook(activeKey=null){
    const body=document.querySelector("#admin-costing-workbook-body");if(!body)return;
    const tabs=[...document.querySelectorAll(".workbook-tab")];
    const key=activeKey||document.querySelector(".workbook-tab.active")?.dataset.workbook||"TEMP_OUTSOURCING";
    tabs.forEach(t=>t.classList.toggle("active",t.dataset.workbook===key));
    const template=this.getCostingWorkbookTemplates()[key]; const saved=(this.data.costing?.workbooks||[]).find(x=>x.template_key===key);
    let values={}; try{values=saved?.data&&typeof saved.data==="object"?saved.data:JSON.parse(localStorage.getItem("ip-costing-"+key)||"{}")}catch{values={}};
    values={...Object.fromEntries(template.rows.map(r=>[r.key,r.value])),...values};
    const result=this.calculateWorkbook(key,values);
    const rows=template.rows.map(r=>{
      const val=values[r.key]??r.value??""; const step=r.type==="money"?"0.01":"0.01";
      const input=r.type==="text"?'<input data-wb-key="'+r.key+'" type="text" value="'+esc(val)+'">':'<input data-wb-key="'+r.key+'" type="number" step="'+step+'" min="0" value="'+esc(val)+'">';
      return '<tr><td><strong>'+esc(r.label)+'</strong>'+(r.optional?'<span class="optional-tag">Optional</span>':"")+'<small>'+esc(r.help||"")+'</small></td><td>'+input+'</td><td>'+esc(r.type==="percent"?(Number(val)||0)+"%":r.type==="money"?money(val):String(val??""))+'</td></tr>';
    }).join("");
    const benchmark=key==="IMMIGRATION"?'<div class="benchmark-table-wrap"><h4>2026 South Africa immigration market benchmark — editable</h4><table class="costing-sheet"><thead><tr><th>Immigration service</th><th>Observed market range</th><th>Starting benchmark</th><th>Use</th></tr></thead><tbody>'+this.getImmigrationBenchmarks().map((r,i)=>'<tr><td>'+esc(r[0])+'</td><td>'+esc(r[1])+'</td><td><input class="benchmark-input" data-benchmark="'+i+'" value="'+esc(r[2])+'"></td><td><button type="button" class="btn btn-secondary btn-sm" data-use-benchmark="'+i+'">Use</button></td></tr>').join("")+'</tbody></table><p class="sheet-note">Benchmarks are research references, not Isaacs &amp; Partners approved prices. Government/VFS/third-party costs are separate unless deliberately included.</p></div>':key==="BUSINESS_COMPLIANCE"?'<div class="benchmark-table-wrap"><h4>Business compliance market benchmark — editable</h4><table class="costing-sheet"><thead><tr><th>Service</th><th>Observed market range</th><th>Starting benchmark</th><th>Use</th></tr></thead><tbody>'+this.getBusinessComplianceBenchmarks().map((r,i)=>'<tr><td>'+esc(r[0])+'</td><td>'+esc(r[1])+'</td><td><input class="benchmark-input" data-biz-benchmark="'+i+'" value="'+esc(r[2])+'"></td><td><button type="button" class="btn btn-secondary btn-sm" data-use-biz-benchmark="'+i+'">Use</button></td></tr>').join("")+'</tbody></table><p class="sheet-note">The R1,250 monthly retainer is your internal base retainer. Each selected service remains separately billable unless deliberately included.</p></div>':"";
    body.innerHTML='<div class="workbook-note">'+esc(template.formula)+'</div><div class="table-wrapper"><table class="costing-sheet"><thead><tr><th>Input / line</th><th>Enter figure</th><th>Current value</th></tr></thead><tbody>'+rows+'</tbody></table></div><div class="workbook-total"><div><span>Base</span><strong>'+money(result.base)+'</strong></div><div><span>Additional charges</span><strong>'+money(result.charges)+'</strong></div><div><span>Subtotal</span><strong>'+money(result.subtotal)+'</strong></div><div><span>Tax</span><strong>'+money(result.tax)+'</strong></div><div class="final"><span>FINAL TOTAL</span><strong>'+money(result.total)+'</strong></div></div><div class="workbook-actions"><button type="button" class="btn btn-primary" id="save-costing-workbook">Save costing template</button><button type="button" class="btn btn-secondary" id="clear-costing-workbook">Clear inputs</button></div>'+benchmark;
    const refreshTotals=()=>{const vals=this.readWorkbookValues(template);localStorage.setItem("ip-costing-"+key,JSON.stringify(vals));const r=this.calculateWorkbook(key,vals);const cells=body.querySelectorAll(".workbook-total strong");if(cells.length>=5){cells[0].textContent=money(r.base);cells[1].textContent=money(r.charges);cells[2].textContent=money(r.subtotal);cells[3].textContent=money(r.tax);cells[4].textContent=money(r.total)}};
    body.querySelectorAll("[data-wb-key]").forEach(el=>el.addEventListener("input",refreshTotals));
    body.querySelectorAll("[data-use-benchmark]").forEach(btn=>btn.addEventListener("click",()=>{const i=Number(btn.dataset.useBenchmark);const row=this.getImmigrationBenchmarks()[i];const input=body.querySelector('[data-wb-key="professional_fee"]');if(input){input.value=String(row[2]).replace(/[^0-9.]/g,"");input.dispatchEvent(new Event("input",{bubbles:true}))}const svc=body.querySelector('[data-wb-key="selected_service"]');if(svc){svc.value=row[0];svc.dispatchEvent(new Event("input",{bubbles:true}))}}));
    body.querySelectorAll("[data-use-biz-benchmark]").forEach(btn=>btn.addEventListener("click",()=>{const i=Number(btn.dataset.useBizBenchmark);const row=this.getBusinessComplianceBenchmarks()[i];const input=body.querySelector('[data-wb-key="other"]');if(input){input.value=String(row[2]).replace(/[^0-9.]/g,"");input.dispatchEvent(new Event("input",{bubbles:true}))}}));
    body.querySelector("#save-costing-workbook")?.addEventListener("click",async()=>{const vals=this.readWorkbookValues(template);try{await adminDashboardData.saveWorkbook({template_key:key,name:template.name,formula_version:"2026-09-22.1",data:vals,active:true});this.data.costing.workbooks=[...(this.data.costing.workbooks||[]).filter(x=>x.template_key!==key),{template_key:key,name:template.name,data:vals,active:true}];alert("Costing template saved.");}catch(error){alert(error.message||"Could not save costing template.");}});
    body.querySelector("#clear-costing-workbook")?.addEventListener("click",()=>{localStorage.removeItem("ip-costing-"+key);this.renderCostingWorkbook(key)});
    document.querySelectorAll(".workbook-tab").forEach(btn=>{if(!btn.dataset.bound){btn.dataset.bound="1";btn.addEventListener("click",()=>this.renderCostingWorkbook(btn.dataset.workbook))}});
  }
  readWorkbookValues(template){const values={};template.rows.forEach(r=>{const el=document.querySelector('[data-wb-key="'+r.key+'"]');if(el)values[r.key]=r.type==="text"?el.value:Number(el.value||0)});return values}
  getCostingWorkbookTemplates(){
    return {
      TEMP_OUTSOURCING:{
        name:"Temporary Employee Outsourcing",
        rows:[
          {key:"position",label:"Position / wage category",type:"text",value:"",help:"Record the position or applicable sector wage category."},
          {key:"employee_rate",label:"Employee rate / wage",type:"money",value:30.23,help:"Enter the applicable minimum/sector/custom employee rate. The 2026 national minimum is R30.23/hour; sectoral rates may be higher."},
          {key:"rate_quantity",label:"Rate quantity",type:"number",value:1,help:"Use 1 for a monthly base; enter hours/units where your rate is hourly."},
          {key:"uif_sdl_wca",label:"UIF + SDL + WCA",type:"percent",value:5},
          {key:"criminal_check",label:"Criminal check",type:"percent",value:1},
          {key:"medical_test",label:"Medical test",type:"percent",value:2,optional:true},
          {key:"ppe",label:"PPE",type:"percent",value:1.5,optional:true},
          {key:"invoice_fee",label:"Invoice fee",type:"percent",value:5},
          {key:"hr_admin",label:"HR administration",type:"percent",value:12.5},
          {key:"service_fee",label:"Service fee",type:"percent",value:8},
          {key:"nt_hours",label:"Normal time hours",type:"number",value:0},
          {key:"nt_rate",label:"NT hourly rate",type:"money",value:0,help:"Use the agreed employee/client base hourly rate."},
          {key:"ot_hours",label:"Overtime hours",type:"number",value:0},
          {key:"ot_multiplier",label:"OT multiplier",type:"number",value:1.5},
          {key:"sunday_hours",label:"Sunday hours",type:"number",value:0},
          {key:"sunday_multiplier",label:"Sunday multiplier",type:"number",value:2},
          {key:"retail_sunday",label:"Retail Sunday is ordinary day",type:"number",value:0,help:"Enter 1 for retail arrangements where Sunday is the ordinary working day; this changes Sunday to ×1.5."},
          {key:"public_holiday_hours",label:"Public holiday hours",type:"number",value:0},
          {key:"public_holiday_multiplier",label:"Public holiday multiplier",type:"number",value:2},
          {key:"tax",label:"Tax",type:"percent",value:15}
        ],
        formula:"Labour = NT hours × NT rate + OT hours × NT rate × OT multiplier + Sunday hours × NT rate × Sunday multiplier + public-holiday hours × NT rate × public-holiday multiplier. For retail Sunday-as-ordinary-day, Sunday multiplier becomes 1.5. This workbook is a commercial estimate; the applicable BCEA, sectoral determination, bargaining council agreement and employment contract must be checked before invoicing."
      },
      PERM_OUTSOURCING:{
        name:"Permanent Outsourcing",
        rows:[
          {key:"monthly_salary",label:"Monthly salary offered",type:"money",value:0},
          {key:"months",label:"Months",type:"number",value:12},
          {key:"service_percent",label:"Service percentage",type:"percent",value:15}
        ],
        formula:"annual salary = monthly salary × 12; final service amount = annual salary × service percentage."
      },
      FOREIGNER_EMPLOYMENT_OFFER:{
        name:"Foreigner Employment Offer / Retainer",
        rows:[
          {key:"monthly_retainer",label:"Monthly retainer",type:"money",value:1250},
          {key:"repatriation",label:"Repatriation reserve",type:"money",value:10000},
          {key:"months",label:"Retainer months",type:"number",value:1}
        ],
        formula:"retainer = monthly retainer × months; reserve = repatriation reserve; total commercial commitment = retainer + reserve. Any termination/repatriation action must remain subject to the signed agreement and applicable law."
      },
      BUSINESS_COMPLIANCE:{
        name:"Business Compliance — Retainer + Individual Services",
        rows:[
          {key:"retainer",label:"Monthly retainer",type:"money",value:1250},
          {key:"cipc",label:"CIPC / company service",type:"money",value:0},
          {key:"sars",label:"SARS / tax service",type:"money",value:0},
          {key:"uif",label:"UIF service",type:"money",value:0},
          {key:"coida",label:"COIDA service",type:"money",value:0},
          {key:"bank",label:"Bank account setup",type:"money",value:0},
          {key:"bbbee",label:"B-BBEE service",type:"money",value:0},
          {key:"other",label:"Other compliance service",type:"money",value:0},
          {key:"tax",label:"Tax",type:"percent",value:15}
        ],
        formula:"monthly retainer is the base; every selected business-compliance service is added separately; tax is applied to the subtotal."
      },
      IMMIGRATION:{
        name:"Immigration Market Benchmark & Quote Builder",
        rows:[
          {key:"selected_service",label:"Service / category",type:"text",value:""},
          {key:"professional_fee",label:"Professional fee",type:"money",value:0},
          {key:"dha_fee",label:"DHA / Home Affairs fee",type:"money",value:0},
          {key:"vfs_fee",label:"VFS fee",type:"money",value:0},
          {key:"saqa",label:"SAQA / qualification evaluation",type:"money",value:0},
          {key:"police_medical",label:"Police / medical / certification",type:"money",value:0},
          {key:"other_disbursements",label:"Other disbursements",type:"money",value:0},
          {key:"tax",label:"Tax",type:"percent",value:15}
        ],
        formula:"professional fee + separately itemised statutory/third-party disbursements; tax is calculated on the taxable professional/disbursement subtotal according to your VAT treatment. Government/VFS figures should be verified at quote time."
      }
    };
  }
  getBusinessComplianceBenchmarks(){
    return [
      ["Private company registration / setup","R790–R1,250","R1,000","Professional handling benchmark; CIPC statutory fees may be separate"],
      ["CIPC annual return","R190–R450+","R320","Provider fee; CIPC statutory fee varies by turnover"],
      ["Beneficial ownership filing","R150–R590","R370","Provider benchmark; filing requirements vary"],
      ["Director / address amendment","R250–R650","R450","Provider benchmark; CIPC fee may be separate"],
      ["Income tax / SARS registration","R350–R500","R425","Provider benchmark"],
      ["Tax clearance / TCS assistance","R350–R1,290","R820","Depends on compliance condition"],
      ["VAT registration","R850–R2,990","R1,920","Provider benchmark; complexity varies"],
      ["PAYE / UIF / SDL registration","R650–R2,490","R1,570","Bundled registrations vary by provider"],
      ["UIF registration","R650–R1,250","R950","Provider benchmark"],
      ["COIDA registration","R790–R3,500","R2,145","Provider benchmark; industry/workforce complexity matters"],
      ["Letter of Good Standing","R400–R690","R545","Provider benchmark"],
      ["B-BBEE affidavit / assistance","R350–R390","R370","EME/QSE status and certification route may differ"],
      ["CSD registration","R490–R750","R620","Provider benchmark"],
      ["Governance / policy pack","R3,500–R4,500","R4,000","Scope-dependent"],
      ["Shareholders agreement","R2,500","R2,500","Document scope dependent"],
      ["SLA / service agreement","R1,250–R1,500","R1,375","Scope dependent"]
    ];
  }
  getImmigrationBenchmarks(){
    return [
      ["Visitor / temporary residence assistance","R8,000–R25,000","R16,500","Attorney market range; government/VFS extra"],
      ["Critical Skills Work Visa","R15,000–R45,000","R30,000","Professional fee benchmark; DHA/VFS/SAQA/professional body extra"],
      ["General Work Visa","R15,000–R45,000","R30,000","Professional fee benchmark; DHA/VFS/other third-party costs extra"],
      ["Intra-Company Transfer (ICT)","R15,500–R80,000+","R30,000","Observed market spans from fixed-package providers to complex corporate matters"],
      ["Corporate Visa (CSV)","R20,000–R50,000+","R35,000","Complexity/volume dependent; government and VFS costs separate"],
      ["Permanent Residence","R20,000–R60,000+","R40,000","Category dependent; DHA/VFS and document costs extra"],
      ["Spousal / Relative Visa","R10,000–R30,000","R20,000","Professional fee benchmark; official fees may differ by route"],
      ["Visa renewal / extension","R5,000–R15,000","R10,000","Routine cases; complexity can increase fee"],
      ["Refusal appeal / reapplication strategy","R8,000–R30,000","R19,000","Documented market range; scope depends on refusal reasons"],
      ["High Court immigration review","R60,000–R250,000","R155,000","Litigation/counsel costs can materially vary"],
      ["Section 22 / asylum-related work","CUSTOM","0","Use hourly + per-page + service flat-rate model; no reliable single market average"],
      ["Section 24 / status-related application","CUSTOM","0","Use hourly + per-page + service flat-rate model; case complexity varies"],
      ["Foreign employment offer / placement retainer","R1,250/month + R10,000 reserve","1,250/month","Isaacs & Partners internal commercial model; reserve subject to signed terms"]
    ];
  }
  calculateWorkbook(template,values){
    const v=values||{}; const num=k=>Number(v[k]??0)||0;
    if(template==="TEMP_OUTSOURCING"){
      const baseRate=num("nt_rate")||num("employee_rate");
      const nt=num("nt_hours")*baseRate;
      const ot=num("ot_hours")*baseRate*num("ot_multiplier");
      const sundayMultiplier=num("retail_sunday")?1.5:num("sunday_multiplier");
      const sunday=num("sunday_hours")*baseRate*sundayMultiplier;
      const ph=num("public_holiday_hours")*baseRate*num("public_holiday_multiplier");
      const labour=(nt+ot+sunday+ph)>0?(nt+ot+sunday+ph):num("employee_rate")*num("rate_quantity");
      const statutory=labour*num("uif_sdl_wca")/100;
      const criminal=labour*num("criminal_check")/100;
      const medical=labour*num("medical_test")/100;
      const ppe=labour*num("ppe")/100;
      const invoice=labour*num("invoice_fee")/100;
      const hr=labour*num("hr_admin")/100;
      const service=labour*num("service_fee")/100;
      const charges=statutory+criminal+medical+ppe+invoice+hr+service;
      const subtotal=labour+charges; const tax=subtotal*num("tax")/100;
      return {base:labour,charges,subtotal,tax,total:subtotal+tax,breakdown:{nt,ot,sunday,ph}};
    }
    if(template==="PERM_OUTSOURCING"){
      const annual=num("monthly_salary")*Math.max(num("months"),0); const fee=annual*num("service_percent")/100;
      return {base:annual,charges:fee,subtotal:fee,tax:0,total:fee};
    }
    if(template==="FOREIGNER_EMPLOYMENT_OFFER"){
      const retainer=num("monthly_retainer")*Math.max(num("months"),0), reserve=num("repatriation");
      return {base:retainer,charges:reserve,subtotal:retainer+reserve,tax:0,total:retainer+reserve};
    }
    if(template==="BUSINESS_COMPLIANCE"){
      const subtotal=["retainer","cipc","sars","uif","coida","bank","bbbee","other"].reduce((s,k)=>s+num(k),0);
      const tax=subtotal*num("tax")/100; return {base:num("retainer"),charges:subtotal-num("retainer"),subtotal,tax,total:subtotal+tax};
    }
    if(template==="IMMIGRATION"){
      const subtotal=["professional_fee","dha_fee","vfs_fee","saqa","police_medical","other_disbursements"].reduce((s,k)=>s+num(k),0);
      const tax=subtotal*num("tax")/100; return {base:num("professional_fee"),charges:subtotal-num("professional_fee"),subtotal,tax,total:subtotal+tax};
    }
    return {base:0,charges:0,subtotal:0,tax:0,total:0};
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