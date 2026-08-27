import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";
import navigation from "../core/navigation.js";
import adminAccountsData from "./AdminAccountsDataService.js";
import { resolveUserDashboardRole } from "./DashboardAccess.js";

const esc = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");

class ClientsController {
    constructor(){this.individuals=[];this.businesses=[];this.role=null;this.initialised=false;this.bound=false;this.onClick=this.onClick.bind(this);this.onSubmit=this.onSubmit.bind(this);this.onSearch=this.renderTable.bind(this);}

    async initialise(){
        if(this.initialised)return this;
        await auth.initialise();
        if(!auth.isAuthenticated()){navigation.toLogin(window.location.pathname,{replace:true});return this;}
        this.role=await resolveUserDashboardRole(auth.getCurrentUser());
        if(!["SUPER_ADMIN","STAFF"].includes(this.role)){navigation.toRoleDashboard(this.role,{replace:true});return this;}
        if(this.role==="STAFF" && !(await this.hasPermission("view_clients"))){this.deny("You do not have permission to view client records.");return this;}
        this.bind();await this.load();this.initialised=true;return this;
    }

    async request(path,options={}){
        const token=auth.getToken();if(!token)throw new Error("Your session has expired. Please sign in again.");
        const response=await fetch(`${authConfig.supabase.url}/rest/v1/${path}`,{...options,headers:{Accept:"application/json",apikey:authConfig.supabase.publishableKey,Authorization:`Bearer ${token}`,"Content-Type":"application/json",...(options.headers||{})}});
        const raw=await response.text();let data=[];try{data=raw?JSON.parse(raw):[];}catch{data=raw;}
        if(!response.ok)throw new Error(data?.message||data?.hint||`Client request failed (${response.status}).`);return data;
    }

    async rpc(name,payload){return this.request(`rpc/${encodeURIComponent(name)}`,{method:"POST",body:JSON.stringify(payload)});}
    async hasPermission(key){if(this.role==="SUPER_ADMIN")return true;try{return Boolean(await this.rpc("has_staff_permission",{p_permission_key:key}));}catch(error){console.warn("[ClientsController] permission check failed",error);return false;}}

    async load(){this.setBusy(true);try{const [individuals,businesses]=await Promise.all([this.request("profiles?role=eq.INDIVIDUAL&select=id,email,first_name,last_name,phone,is_active,created_at,updated_at&order=created_at.desc"),this.request("businesses?select=id,owner_user_id,legal_name,trading_name,registration_number,tax_number,email,phone,is_active,created_at,updated_at&order=created_at.desc")]);this.individuals=Array.isArray(individuals)?individuals:[];this.businesses=Array.isArray(businesses)?businesses:[];this.render();}catch(error){console.error("[ClientsController] load failed",error);this.message(error.message,"error");}finally{this.setBusy(false);}}

    bind(){if(this.bound)return;this.bound=true;document.addEventListener("click",this.onClick);document.addEventListener("submit",this.onSubmit);document.querySelector("#client-search")?.addEventListener("input",this.onSearch);document.querySelector("#client-status-filter")?.addEventListener("change",this.onSearch);document.querySelector("#client-department-filter")?.addEventListener("change",this.onSearch);document.querySelector("[data-auth-action='logout']")?.addEventListener("click",async e=>{e.preventDefault();await auth.logout({remote:true,reason:"user"});navigation.toLogin(null,{replace:true});});}

    onClick(event){const button=event.target.closest("[data-client-action]");if(!button)return;const action=button.dataset.clientAction;if(action==="new")return this.openCreate();if(action==="edit")return this.openEdit(button.dataset.role,button.dataset.id);if(action==="toggle")return this.toggle(button.dataset.role,button.dataset.id,button.dataset.active==="true");if(action==="close")return this.closeModal();if(action==="refresh")return this.load();if(action==="export")return this.exportCsv();}

    async openCreate(){if(this.role!=="SUPER_ADMIN"){this.message("Only Super Admin can provision a new client account.","error");return;}this.openModal(this.formMarkup("create","INDIVIDUAL",{}));}
    async openEdit(role,id){const record=role==="INDIVIDUAL"?this.individuals.find(x=>x.id===id):this.businesses.find(x=>x.id===id);if(!record){this.message("Client record could not be found.","error");return;}this.openModal(this.formMarkup("edit",role,record));}
    formMarkup(action,role,record){const business=role==="BUSINESS",edit=action==="edit";return `<div class="modal-backdrop" data-client-action="close"></div><section class="modal-card" role="dialog" aria-modal="true"><div class="modal-header"><div><p class="eyebrow">${this.role==="SUPER_ADMIN"?"Super Admin":"Staff"} · Live Supabase</p><h2>${edit?"Edit":"Create"} ${business?"Business":"Individual"}</h2></div><button type="button" class="icon-button" data-client-action="close">×</button></div><form id="client-form" data-action="${action}" data-role="${role}" data-id="${esc(record.id||"")}"><div class="form-grid"><label>First name<input name="first_name" required value="${esc(record.first_name||"")}"></label><label>Last name<input name="last_name" value="${esc(record.last_name||"")}"></label><label>Email<input name="email" type="email" required value="${esc(record.email||"")}"></label><label>Phone<input name="phone" value="${esc(record.phone||"")}"></label>${business?`<label>Legal name<input name="legal_name" required value="${esc(record.legal_name||"")}"></label><label>Trading name<input name="trading_name" value="${esc(record.trading_name||"")}"></label><label>Registration number<input name="registration_number" value="${esc(record.registration_number||"")}"></label><label>Tax number<input name="tax_number" value="${esc(record.tax_number||"")}"></label>`:""}${!edit?`<label>Temporary password<input name="password" type="password" minlength="8" required autocomplete="new-password"></label>`:""}</div><div class="modal-footer"><button type="button" class="btn btn-secondary" data-client-action="close">Cancel</button><button type="submit" class="btn btn-primary">${edit?"Save Changes":"Create Account"}</button></div></form></section>`;}

    async onSubmit(event){if(event.target.id!=="client-form")return;event.preventDefault();const form=event.target,data=Object.fromEntries(new FormData(form).entries()),action=form.dataset.action,role=form.dataset.role,id=form.dataset.id;try{this.setBusy(true);if(action==="create"){if(this.role!=="SUPER_ADMIN")throw new Error("Only Super Admin can create client accounts.");role==="INDIVIDUAL"?await adminAccountsData.createIndividual(data):await adminAccountsData.createBusiness(data);}else if(role==="INDIVIDUAL"){if(!(await this.hasPermission("edit_clients")))throw new Error("You do not have permission to edit client records.");await adminAccountsData.updateIndividual(id,data);}else{if(!(await this.hasPermission("edit_clients")))throw new Error("You do not have permission to edit business records.");const businessData={...data};delete businessData.password;await adminAccountsData.updateBusiness(this.businesses.find(x=>x.id===id)?.owner_user_id,businessData);}this.closeModal();await this.load();this.message("Client record saved successfully.","success");}catch(error){this.message(error.message,"error");}finally{this.setBusy(false);}}

    async toggle(role,id,active){if(this.role!=="SUPER_ADMIN"){this.message("Only Super Admin can activate or deactivate client accounts.","error");return;}if(!confirm(`Are you sure you want to ${active?"deactivate":"activate"} this account?`))return;try{await adminAccountsData.setActive(role==="BUSINESS"?this.businesses.find(x=>x.id===id)?.owner_user_id:id,!active,role);await this.load();this.message(`Account ${active?"deactivated":"activated"} successfully.","success");}catch(error){this.message(error.message,"error");}}

    render(){const all=[...this.individuals,...this.businesses];this.setText("#total-clients",all.length);this.setText("#active-clients",all.filter(x=>x.is_active).length);const monthStart=new Date();monthStart.setDate(1);this.setText("#new-clients-month",all.filter(x=>new Date(x.created_at)>=monthStart).length);this.setText("#client-outstanding-documents","—");this.renderTable();}
    renderTable(){const tbody=document.querySelector("#clients-table");if(!tbody)return;const q=String(document.querySelector("#client-search")?.value||"").toLowerCase(),status=String(document.querySelector("#client-status-filter")?.value||"").toLowerCase();const records=[...this.individuals.map(x=>({...x,kind:"Individual",name:`${x.first_name||""} ${x.last_name||""}`.trim()||x.email||"Unnamed"})),...this.businesses.map(x=>({...x,kind:"Business",name:x.trading_name||x.legal_name||x.email||"Unnamed"}))].filter(x=>`${x.name} ${x.email||""} ${x.phone||""} ${x.registration_number||""}`.toLowerCase().includes(q)).filter(x=>!status||(x.is_active?"active":"inactive")===status);if(!records.length){tbody.innerHTML=`<tr><td colspan="8" class="empty-state">No client records match the current filters.</td></tr>`;return;}tbody.innerHTML=records.map(x=>`<tr><td><strong>${esc(x.name)}</strong><small>${esc(x.email||"")}</small></td><td>${x.kind==="Individual"?"Individual":"Business"}</td><td>${esc(x.phone||"—")}</td><td>${x.kind==="Business"?esc(x.registration_number||"—"):"—"}</td><td><span class="status-badge ${x.is_active?"active":"inactive"}">${x.is_active?"Active":"Inactive"}</span></td><td>${this.date(x.updated_at||x.created_at)}</td><td class="row-actions"><button class="btn btn-small" data-client-action="edit" data-role="${x.kind.toUpperCase()}" data-id="${esc(x.id)}">Edit</button>${this.role==="SUPER_ADMIN"?`<button class="btn btn-small ${x.is_active?"btn-danger":"btn-primary"}" data-client-action="toggle" data-role="${x.kind.toUpperCase()}" data-id="${esc(x.id)}" data-active="${x.is_active}">${x.is_active?"Deactivate":"Activate"}</button>`:""}</td><td></td></tr>`).join("");}

    exportCsv(){const rows=[...this.individuals.map(x=>["INDIVIDUAL",`${x.first_name||""} ${x.last_name||""}`.trim(),x.email||"",x.phone||"",x.is_active?"ACTIVE":"INACTIVE"]),...this.businesses.map(x=>["BUSINESS",x.trading_name||x.legal_name||"",x.email||"",x.phone||"",x.is_active?"ACTIVE":"INACTIVE"])];const csv=["TYPE,NAME,EMAIL,PHONE,STATUS",...rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(","))].join("\n");const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`isaacs-clients-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);}
    openModal(html){const host=document.querySelector("#client-modal");if(host){host.innerHTML=html;host.hidden=false;host.querySelector("input")?.focus();}}
    closeModal(){const host=document.querySelector("#client-modal");if(host){host.hidden=true;host.innerHTML="";}}
    deny(message){this.message(message,"error");document.querySelectorAll("button,a").forEach(el=>{if(!el.matches("[data-auth-action='logout']"))el.setAttribute("aria-disabled","true");});}
    message(text,type){const el=document.querySelector("#client-message");if(!el)return;el.hidden=false;el.className=`login-message ${type==="error"?"login-error":"login-success"}`;el.textContent=text;setTimeout(()=>el.hidden=true,5000);}
    setText(selector,value){const el=document.querySelector(selector);if(el)el.textContent=String(value);}
    setBusy(value){document.body.classList.toggle("is-busy",Boolean(value));}
    date(value){if(!value)return"—";const d=new Date(value);return Number.isNaN(d.getTime())?"—":new Intl.DateTimeFormat("en-ZA",{dateStyle:"medium",timeStyle:"short"}).format(d);}
}

export const clientsController=new ClientsController();
export default clientsController;
