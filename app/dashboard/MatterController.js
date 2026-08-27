import auth from "../auth/AuthService.js";
import matterData from "./MatterDataService.js";
import authConfig from "../auth/auth.config.js";

const esc = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");

class MatterController {
    constructor(){ this.matters=[]; this.individuals=[]; this.businesses=[]; this.bound=false; this.onClick=this.onClick.bind(this); this.onSubmit=this.onSubmit.bind(this); this.onInput=this.onInput.bind(this); }

    async initialise(){
        await auth.initialise();
        if(!auth.isAuthenticated()){ window.location.href="../auth/login.html?return="+encodeURIComponent(window.location.pathname); return; }
        const user=auth.getCurrentUser();
        if(String(user?.role||"").toUpperCase() !== "SUPER_ADMIN"){
            const role=await this.resolveRole();
            if(role !== "SUPER_ADMIN"){ window.location.href="./"; return; }
        }
        this.bind();
        await this.load();
    }

    async resolveRole(){
        const token=auth.getToken(); const id=auth.getCurrentUser()?.id;
        if(!token||!id)return null;
        const response=await fetch(`${authConfig.supabase.url}/rest/v1/profiles?id=eq.${encodeURIComponent(id)}&select=role,is_active`,{headers:{apikey:authConfig.supabase.publishableKey,Authorization:`Bearer ${token}`}});
        const rows=await response.json().catch(()=>[]); const p=rows[0];
        return p?.is_active ? String(p.role||"").toUpperCase() : null;
    }

    bind(){ if(this.bound)return; this.bound=true; document.addEventListener("click",this.onClick); document.addEventListener("submit",this.onSubmit); document.addEventListener("input",this.onInput); document.querySelector("[data-auth-action='logout']")?.addEventListener("click",async e=>{e.preventDefault();await auth.logout({remote:true,reason:"user"});window.location.href="../auth/login.html";}); }

    async load(){
        this.setBusy(true);
        try{
            this.matters=Array.isArray(await matterData.list()) ? await matterData.list() : [];
        }catch(error){
            console.error("[MatterController] Load failed",error); this.message(error.message||"Matter data could not be loaded.","error");
            this.matters=[];
        } finally { this.setBusy(false); }
        this.render();
    }

    async loadClients(){
        const token=auth.getToken();
        const headers={apikey:authConfig.supabase.publishableKey,Authorization:`Bearer ${token}`};
        const [i,b]=await Promise.all([
            fetch(`${authConfig.supabase.url}/rest/v1/profiles?role=eq.INDIVIDUAL&is_active=eq.true&select=id,first_name,last_name,email&order=first_name`,{headers}),
            fetch(`${authConfig.supabase.url}/rest/v1/businesses?is_active=eq.true&select=id,owner_user_id,legal_name,trading_name,email&order=legal_name`,{headers})
        ]);
        this.individuals=await i.json().catch(()=>[]); this.businesses=await b.json().catch(()=>[]);
    }

    async onClick(event){
        const button=event.target.closest("[data-matter-action]"); if(!button)return;
        const action=button.dataset.matterAction;
        if(action==="new"){ await this.openCreate(); return; }
        if(action==="view"){ await this.openView(button.dataset.id); return; }
        if(action==="edit"){ await this.openEdit(button.dataset.id); return; }
        if(action==="close"){ this.closeModal(); return; }
        if(action==="refresh"){ await this.load(); }
    }

    onInput(){ this.renderTable(); }

    async openCreate(){ await this.loadClients(); this.openModal(this.formMarkup("create")); }
    async openEdit(id){ const record=await matterData.get(id); if(!record){this.message("Matter could not be found.","error");return;} await this.loadClients(); this.openModal(this.formMarkup("edit",record)); }
    async openView(id){ const record=await matterData.get(id); if(!record){this.message("Matter could not be found.","error");return;} this.openModal(`<div class="modal-backdrop" data-matter-action="close"></div><section class="modal-card" role="dialog" aria-modal="true"><div class="modal-header"><div><p class="eyebrow">Matter</p><h2>${esc(record.reference_number||"Matter")}</h2></div><button class="icon-button" data-matter-action="close" type="button">×</button></div><div class="detail-grid"><div><span>Title</span><strong>${esc(record.title)}</strong></div><div><span>Status</span><strong>${esc(record.status)}</strong></div><div><span>Priority</span><strong>${esc(record.priority)}</strong></div><div><span>Reference</span><strong>${esc(record.reference_number||"—")}</strong></div><div class="detail-wide"><span>Description</span><p>${esc(record.description||"No description provided.")}</p></div></div><div class="modal-footer"><button class="btn btn-secondary" type="button" data-matter-action="close">Close</button><button class="btn btn-primary" type="button" data-matter-action="edit" data-id="${esc(record.id)}">Edit Matter</button></div></section>`); }

    formMarkup(action,record={}){
        const edit=action==="edit";
        const individualOptions=this.individuals.map(x=>`<option value="${x.id}" ${record.individual_user_id===x.id?"selected":""}>${esc(`${x.first_name||""} ${x.last_name||""}`.trim()||x.email)} — ${esc(x.email||"")}</option>`).join("");
        const businessOptions=this.businesses.map(x=>`<option value="${x.id}" ${record.business_id===x.id?"selected":""}>${esc(x.trading_name||x.legal_name)} — ${esc(x.email||"")}</option>`).join("");
        return `<div class="modal-backdrop" data-matter-action="close"></div><section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="matter-modal-title"><div class="modal-header"><div><p class="eyebrow">Super Admin · Live Supabase</p><h2 id="matter-modal-title">${edit?"Edit":"Create"} Matter</h2></div><button class="icon-button" data-matter-action="close" type="button">×</button></div><form id="matter-form" data-action="${action}" data-id="${esc(record.id||"")}"><div class="form-grid"><label>Title<input name="title" required maxlength="200" value="${esc(record.title||"")}"></label><label>Reference number<input name="reference_number" maxlength="100" value="${esc(record.reference_number||"")}" placeholder="Auto if blank"></label><label>Individual client<select name="individual_user_id"><option value="">Not linked</option>${individualOptions}</select></label><label>Business client<select name="business_id"><option value="">Not linked</option>${businessOptions}</select></label><label>Status<select name="status"><option value="">Use current/default</option><option value="NEW" ${record.status==="NEW"?"selected":""}>New</option><option value="OPEN" ${record.status==="OPEN"?"selected":""}>Open</option><option value="ACTIVE" ${record.status==="ACTIVE"?"selected":""}>Active</option><option value="PENDING" ${record.status==="PENDING"?"selected":""}>Pending</option><option value="CLOSED" ${record.status==="CLOSED"?"selected":""}>Closed</option><option value="COMPLETED" ${record.status==="COMPLETED"?"selected":""}>Completed</option></select></label><label>Priority<select name="priority"><option value="NORMAL" ${!record.priority||record.priority==="NORMAL"?"selected":""}>Normal</option><option value="LOW" ${record.priority==="LOW"?"selected":""}>Low</option><option value="HIGH" ${record.priority==="HIGH"?"selected":""}>High</option><option value="URGENT" ${record.priority==="URGENT"?"selected":""}>Urgent</option></select></label><label class="form-wide">Description<textarea name="description" rows="5" maxlength="5000">${esc(record.description||"")}</textarea></label></div><div class="modal-footer"><button class="btn btn-secondary" type="button" data-matter-action="close">Cancel</button><button class="btn btn-primary" type="submit">${edit?"Save Changes":"Create Matter"}</button></div></form></section>`;
    }

    async onSubmit(event){
        if(event.target.id!=="matter-form")return; event.preventDefault();
        const form=event.target; const raw=Object.fromEntries(new FormData(form).entries());
        const payload={title:String(raw.title||"").trim(),reference_number:String(raw.reference_number||"").trim()||null,individual_user_id:raw.individual_user_id||null,business_id:raw.business_id||null,description:String(raw.description||"").trim()||null,priority:raw.priority||"NORMAL"};
        if(raw.status)payload.status=raw.status;
        if(!payload.title){this.message("Matter title is required.","error");return;}
        try{ this.setBusy(true); if(form.dataset.action==="create"){payload.created_by=auth.getCurrentUser().id;await matterData.create(payload);this.message("Matter created successfully.","success");}else{await matterData.update(form.dataset.id,payload);this.message("Matter updated successfully.","success");} this.closeModal(); await this.load(); }
        catch(error){console.error("[MatterController] Save failed",error);this.message(error.message||"Matter could not be saved.","error");}
        finally{this.setBusy(false);}
    }

    render(){ const all=this.matters; document.querySelector("#total-matters").textContent=all.length; document.querySelector("#open-matters").textContent=all.filter(x=>["NEW","OPEN","ACTIVE","PENDING"].includes(String(x.status||"").toUpperCase())).length; document.querySelector("#high-priority-matters").textContent=all.filter(x=>["HIGH","URGENT"].includes(String(x.priority||"").toUpperCase())).length; document.querySelector("#overdue-matter-tasks").textContent="0"; this.renderTable(); }
    renderTable(){ const tbody=document.querySelector("#matters-table");if(!tbody)return;const q=String(document.querySelector("#matter-search")?.value||"").toLowerCase();const dep=document.querySelector("#matter-department-filter")?.value||"";const status=document.querySelector("#matter-status-filter")?.value||"";const priority=document.querySelector("#matter-priority-filter")?.value||"";const rows=this.matters.filter(x=>`${x.reference_number||""} ${x.title||""} ${x.description||""}`.toLowerCase().includes(q)).filter(x=>!status||String(x.status||"").toLowerCase()===status).filter(x=>!priority||String(x.priority||"").toLowerCase()===priority);tbody.innerHTML=rows.length?rows.map(x=>`<tr class="clickable-row" data-matter-action="view" data-id="${esc(x.id)}"><td><strong>${esc(x.reference_number||"—")}</strong></td><td>${esc(x.individual_user_id||x.business_id||"—")}</td><td>${esc(x.title)}</td><td>${esc(dep||"—")}</td><td>—</td><td>${esc(x.status||"NEW")}</td><td>${esc(x.priority||"NORMAL")}</td><td>Unassigned</td><td>${this.date(x.updated_at)}</td></tr>`).join(""): `<tr><td colspan="9" class="empty-state">No matters found under the current filters or permission scope.</td></tr>`; }
    date(v){if(!v)return"—";const d=new Date(v);return Number.isNaN(d.getTime())?"—":new Intl.DateTimeFormat("en-ZA",{dateStyle:"medium",timeStyle:"short"}).format(d);}
    openModal(html){const host=document.querySelector("#matter-modal");if(host){host.innerHTML=html;host.hidden=false;host.querySelector("input,select,textarea")?.focus();}}
    closeModal(){const host=document.querySelector("#matter-modal");if(host){host.hidden=true;host.innerHTML="";}}
    setBusy(v){document.body.classList.toggle("is-busy",Boolean(v));}
    message(text,type){const el=document.querySelector("#matter-message");if(!el)return;el.hidden=false;el.className=`login-message ${type==="error"?"login-error":"login-success"}`;el.textContent=text;setTimeout(()=>el.hidden=true,5000);}
}
export const matterController=new MatterController();
export default matterController;
