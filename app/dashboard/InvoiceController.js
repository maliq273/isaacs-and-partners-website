import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";
import navigation from "../core/navigation.js";
import { resolveUserDashboardRole } from "./DashboardAccess.js";

const esc = v => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");
const money = v => new Intl.NumberFormat("en-ZA", { style:"currency", currency:"ZAR" }).format(Number(v || 0));
const today = () => new Date().toISOString().slice(0,10);

class InvoiceController {
    constructor(){ this.role=null; this.rows=[]; this.clients={individuals:[],businesses:[]}; this.matters=[]; this.permissions={}; this.bound=false; this.onClick=this.onClick.bind(this); this.onSubmit=this.onSubmit.bind(this); }
    async initialise(){
        await auth.initialise();
        if(!auth.isAuthenticated()) return navigation.toLogin(location.pathname,{replace:true});
        this.role=await resolveUserDashboardRole(auth.getCurrentUser());
        if(!["SUPER_ADMIN","STAFF"].includes(this.role)) return navigation.toRoleDashboard(this.role,{replace:true});
        const keys=["view_financials","manage_invoices","assign_invoices"];
        this.permissions=this.role==="SUPER_ADMIN"?Object.fromEntries(keys.map(k=>[k,true])):Object.fromEntries(await Promise.all(keys.map(async k=>[k,await this.permission(k)])));
        if(!this.permissions.view_financials) return this.message("You do not have permission to view invoices.","error");
        this.bind(); await this.load();
    }
    token(){ const t=auth.getToken(); if(!t) throw new Error("Your session has expired. Please sign in again."); return t; }
    async request(path,options={}){
        const r=await fetch(`${authConfig.supabase.url}/rest/v1/${path}`,{...options,headers:{Accept:"application/json",apikey:authConfig.supabase.publishableKey,Authorization:`Bearer ${this.token()}`,"Content-Type":"application/json",Prefer:"return=representation",...(options.headers||{})}});
        const raw=await r.text(); let body=null; try{body=raw?JSON.parse(raw):null;}catch{body=raw;}
        if(!r.ok) throw new Error(body?.message||body?.hint||body?.details||String(body||`Invoice request failed (${r.status}).`)); return body;
    }
    async rpc(name,payload){
        const r=await fetch(`${authConfig.supabase.url}/rest/v1/rpc/${name}`,{method:"POST",headers:{Accept:"application/json",apikey:authConfig.supabase.publishableKey,Authorization:`Bearer ${this.token()}`,"Content-Type":"application/json"},body:JSON.stringify(payload)});
        const raw=await r.text(); let body=null; try{body=raw?JSON.parse(raw):null;}catch{body=raw;}
        if(!r.ok) throw new Error(body?.message||body?.hint||body?.details||String(body||`Invoice operation failed (${r.status}).`)); return body;
    }
    async permission(key){try{return Boolean(await this.rpc("has_staff_permission",{p_permission_key:key}));}catch{return false;}}
    bind(){if(this.bound)return;this.bound=true;document.addEventListener("click",this.onClick);document.addEventListener("submit",this.onSubmit);document.querySelector("[data-auth-action='logout']")?.addEventListener("click",async e=>{e.preventDefault();await auth.logout({remote:true,reason:"user"});navigation.toLogin(null,{replace:true});});}
    async load(){
        try{
            const [invoices,individuals,businesses,matters]=await Promise.all([
                this.request("invoices?select=*&order=invoice_date.desc,created_at.desc"),
                this.request("profiles?role=eq.INDIVIDUAL&is_active=eq.true&select=id,first_name,last_name,email&order=first_name"),
                this.request("businesses?is_active=eq.true&select=id,legal_name,trading_name,email&order=legal_name"),
                this.request("matters?select=id,reference_number,title,status,individual_user_id,business_id&order=updated_at.desc")
            ]);
            this.rows=Array.isArray(invoices)?invoices:[]; this.clients.individuals=Array.isArray(individuals)?individuals:[]; this.clients.businesses=Array.isArray(businesses)?businesses:[]; this.matters=Array.isArray(matters)?matters:[]; this.render();
        }catch(e){console.error("[InvoiceController] load failed",e);this.message(e.message,"error");}
    }
    clientOptions(row={}){
        const i=this.clients.individuals.map(x=>`<option value="${x.id}" ${row.individual_user_id===x.id?"selected":""}>${esc(`${x.first_name||""} ${x.last_name||""}`.trim()||x.email)} — ${esc(x.email||"")}</option>`).join("");
        const b=this.clients.businesses.map(x=>`<option value="business:${x.id}" ${row.business_id===x.id?"selected":""}>${esc(x.trading_name||x.legal_name)} — ${esc(x.email||"")}</option>`).join("");
        return `<optgroup label="Individuals">${i}</optgroup><optgroup label="Businesses">${b}</optgroup>`;
    }
    matterOptions(row={}){return this.matters.map(x=>`<option value="${x.id}" ${row.matter_id===x.id?"selected":""}>${esc(x.reference_number||x.title||x.id)} — ${esc(x.title||"")}</option>`).join("");}
    itemRows(row={}){const items=row.items||[{item_name:"",description:"",quantity:1,rate:0,tax_rate:0}];return items.map((x,i)=>`<tr data-invoice-item-row><td><input name="item_name" required value="${esc(x.item_name||"")}"></td><td><input name="item_description" value="${esc(x.description||"")}"></td><td><input name="quantity" type="number" min="0.001" step="0.001" value="${esc(x.quantity??1)}"></td><td><input name="rate" type="number" min="0" step="0.01" value="${esc(x.rate??0)}"></td><td><input name="tax_rate" type="number" min="0" step="0.01" value="${esc(x.tax_rate??0)}"></td><td><button type="button" class="btn btn-small btn-danger" data-invoice-action="remove-item" ${i===0?"disabled":""}>Remove</button></td></tr>`).join("");}
    openForm(row={}){
        if(!this.permissions.manage_invoices) return this.message("You do not have permission to create or manage invoices.","error");
        this.openModal(`<div class="modal-backdrop" data-invoice-action="close"></div><section class="modal-card modal-wide" role="dialog" aria-modal="true"><div class="modal-header"><div><p class="eyebrow">${this.role} · Accounts Receivable</p><h2>${row.id?"Edit":"New"} Invoice</h2><p>Customer, invoice dates, payment terms, line items, discounts, tax and notes.</p></div><button class="icon-button" type="button" data-invoice-action="close">×</button></div><form id="invoice-form" data-id="${esc(row.id||"")}"><div class="form-grid"><label>Customer<select name="customer_id" required><option value="">Select customer</option>${this.clientOptions(row)}</select></label><label>Matter<select name="matter_id"><option value="">No matter</option>${this.matterOptions(row)}</select></label><label>Invoice #<input name="invoice_number" value="${esc(row.invoice_number||"")}" placeholder="Auto-generated"></label><label>Order / Reference #<input name="order_number" value="${esc(row.order_number||"")}"></label><label>Invoice date<input name="invoice_date" type="date" value="${esc(row.invoice_date||today())}"></label><label>Due date<input name="due_date" type="date" value="${esc(row.due_date||"")}"></label><label>Payment terms<select name="terms"><option value="DUE_ON_RECEIPT">Due on receipt</option><option value="NET_7">Net 7</option><option value="NET_15">Net 15</option><option value="NET_30">Net 30</option><option value="NET_60">Net 60</option></select></label><label class="form-wide">Subject<input name="subject" value="${esc(row.subject||"")}"></label></div><div class="transaction-table-wrap"><table class="transaction-table"><thead><tr><th>Item</th><th>Description</th><th>Qty</th><th>Rate</th><th>Tax %</th><th></th></tr></thead><tbody id="invoice-items">${this.itemRows(row)}</tbody></table><button type="button" class="btn btn-secondary" data-invoice-action="add-item">+ Add line item</button></div><div class="form-grid"><label>Discount type<select name="discount_type"><option value="PERCENT">%</option><option value="FIXED">Amount</option></select></label><label>Discount value<input name="discount_value" type="number" min="0" step="0.01" value="${esc(row.discount_value||0)}"></label><label>Tax %<input name="tax_rate" type="number" min="0" step="0.01" value="${esc(row.tax_rate||0)}"></label><label>Shipping<input name="shipping_charge" type="number" min="0" step="0.01" value="${esc(row.shipping_charge||0)}"></label><label>Adjustment<input name="adjustment" type="number" step="0.01" value="${esc(row.adjustment||0)}"></label><label class="form-wide">Customer notes<textarea name="customer_notes" rows="3">${esc(row.customer_notes||"")}</textarea></label><label class="form-wide">Terms & conditions<textarea name="terms_and_conditions" rows="4">${esc(row.terms_and_conditions||"Payment due according to the selected terms. Services remain subject to the signed engagement and retainer agreement.")}</textarea></label></div><div class="modal-footer"><button type="button" class="btn btn-secondary" data-invoice-action="close">Cancel</button><button type="submit" class="btn btn-primary">Save as Draft</button></div></form></section>`);
    }
    onClick(e){const b=e.target.closest("[data-invoice-action]");if(!b)return;const a=b.dataset.invoiceAction;if(a==="new")return this.openForm();if(a==="edit")return this.openForm(this.rows.find(x=>x.id===b.dataset.id)||{});if(a==="refresh")return this.load();if(a==="close")return this.close();if(a==="add-item")return this.addItem();if(a==="remove-item")return b.closest("tr")?.remove();if(a==="send")return this.markSent(b.dataset.id);if(a==="payment")return this.recordPayment(b.dataset.id);if(a==="void")return this.voidInvoice(b.dataset.id);}
    addItem(){const body=document.querySelector("#invoice-items");if(!body)return;const tr=document.createElement("tr");tr.dataset.invoiceItemRow="true";tr.innerHTML=`<td><input name="item_name" required></td><td><input name="item_description"></td><td><input name="quantity" type="number" min="0.001" step="0.001" value="1"></td><td><input name="rate" type="number" min="0" step="0.01" value="0"></td><td><input name="tax_rate" type="number" min="0" step="0.01" value="0"></td><td><button type="button" class="btn btn-small btn-danger" data-invoice-action="remove-item">Remove</button></td>`;body.appendChild(tr);}
    async onSubmit(e){
        if(e.target.id!=="invoice-form")return;e.preventDefault();if(!this.permissions.manage_invoices)return this.message("You do not have permission to manage invoices.","error");
        const form=e.target,fd=new FormData(form),customer=String(fd.get("customer_id")||""),business=customer.startsWith("business:")?customer.slice(9):"",individual=business?"":customer;
        const items=[...document.querySelectorAll("#invoice-items [data-invoice-item-row]")].map(row=>({item_name:row.querySelector("[name='item_name']")?.value?.trim(),description:row.querySelector("[name='item_description']")?.value?.trim()||null,quantity:Number(row.querySelector("[name='quantity']")?.value||0),rate:Number(row.querySelector("[name='rate']")?.value||0),tax_rate:Number(row.querySelector("[name='tax_rate']")?.value||0)})).filter(x=>x.item_name);
        if(!individual&&!business)return this.message("Select an individual or business customer.","error");if(!items.length)return this.message("Add at least one invoice line item.","error");
        try{
            await this.rpc("create_invoice_transaction",{p_matter_id:fd.get("matter_id")||null,p_quote_id:null,p_individual_user_id:individual||null,p_business_id:business||null,p_order_number:fd.get("order_number")||null,p_invoice_date:fd.get("invoice_date")||today(),p_terms:fd.get("terms")||"DUE_ON_RECEIPT",p_due_date:fd.get("due_date")||null,p_subject:fd.get("subject")||null,p_currency:"ZAR",p_discount_type:fd.get("discount_type")||"PERCENT",p_discount_value:Number(fd.get("discount_value")||0),p_tax_rate:Number(fd.get("tax_rate")||0),p_shipping_charge:Number(fd.get("shipping_charge")||0),p_adjustment:Number(fd.get("adjustment")||0),p_customer_notes:fd.get("customer_notes")||null,p_terms_and_conditions:fd.get("terms_and_conditions")||null,p_items:items});
            this.close();await this.load();this.message("Invoice saved as a live draft.","success");
        }catch(error){console.error("[InvoiceController] save failed",error);this.message(error.message,"error");}
    }
    async markSent(id){if(!this.permissions.manage_invoices)return this.message("Invoice management permission is required.","error");await this.request(`invoices?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify({status:"SENT",sent_at:new Date().toISOString()})});await this.load();this.message("Invoice marked as sent.","success");}
    async recordPayment(id){if(!this.permissions.manage_invoices)return this.message("Invoice management permission is required.","error");const amount=window.prompt("Payment amount received (ZAR):","0");if(amount===null)return;await this.rpc("record_invoice_payment",{p_invoice_id:id,p_amount:Number(amount)});await this.load();this.message("Payment recorded and invoice balance updated.","success");}
    async voidInvoice(id){if(!this.permissions.manage_invoices)return this.message("Invoice management permission is required.","error");if(!window.confirm("Void this invoice? This is an audit-preserving financial action."))return;await this.request(`invoices?id=eq.${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify({status:"VOID",voided_at:new Date().toISOString()})});await this.load();this.message("Invoice voided.","success");}
    render(){
        const outstanding=this.rows.filter(x=>!["PAID","VOID","CANCELLED"].includes(String(x.status||"").toUpperCase())).reduce((a,x)=>a+Number(x.balance_due??x.total??0),0);const paid=this.rows.filter(x=>String(x.status||"").toUpperCase()==="PAID").reduce((a,x)=>a+Number(x.total||0),0);
        this.set("#invoice-total",this.rows.length);this.set("#invoice-outstanding",money(outstanding));this.set("#invoice-paid",money(paid));this.set("#invoice-overdue",this.rows.filter(x=>String(x.status||"").toUpperCase()==="OVERDUE").length);
        const table=document.querySelector("#invoices-table");if(!table)return;table.innerHTML=this.rows.length?this.rows.map(x=>{const client=x.individual_user_id?(this.clients.individuals.find(v=>v.id===x.individual_user_id)?.email||x.individual_user_id):(this.clients.businesses.find(v=>v.id===x.business_id)?.trading_name||x.business_id);return `<tr><td><strong>${esc(x.invoice_number||"—")}</strong></td><td>${esc(client)}</td><td>${esc(x.subject||"—")}</td><td>${money(x.total)}</td><td>${money(x.balance_due)}</td><td>${esc(x.status)}</td><td>${esc(x.due_date||"—")}</td><td class="row-actions">${this.permissions.manage_invoices?`<button class="btn btn-small" data-invoice-action="edit" data-id="${x.id}">Edit</button>${x.status==="DRAFT"?`<button class="btn btn-small btn-primary" data-invoice-action="send" data-id="${x.id}">Send</button>`:""}${!['PAID','VOID','CANCELLED'].includes(x.status)?`<button class="btn btn-small" data-invoice-action="payment" data-id="${x.id}">Record Payment</button>`:""}${!['PAID','VOID','CANCELLED'].includes(x.status)?`<button class="btn btn-small btn-danger" data-invoice-action="void" data-id="${x.id}">Void</button>`:""}`:""}</td></tr>`;}).join(""):"<tr><td colspan=\"8\" class=\"empty-state\">No invoices found.</td></tr>";
    }
    openModal(html){const host=document.querySelector("#invoice-modal");if(host){host.innerHTML=html;host.hidden=false;host.querySelector("input,select,textarea")?.focus();}}
    close(){const host=document.querySelector("#invoice-modal");if(host){host.hidden=true;host.innerHTML="";}}
    message(text,type="success"){const node=document.querySelector("#invoice-message");if(node){node.hidden=false;node.className=`login-message ${type==="error"?"login-error":"login-success"}`;node.textContent=text;}}
    set(selector,value){const node=document.querySelector(selector);if(node)node.textContent=String(value);}
}
export default new InvoiceController();
