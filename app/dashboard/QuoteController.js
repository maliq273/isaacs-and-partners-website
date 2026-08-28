import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";
import navigation from "../core/navigation.js";
import { resolveUserDashboardRole } from "./DashboardAccess.js";

const esc = v => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
const money = v => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(v || 0));
const today = () => new Date().toISOString().slice(0, 10);

class QuoteController {
    constructor() {
        this.role = null;
        this.rows = [];
        this.clients = { individuals: [], businesses: [] };
        this.matters = [];
        this.permissions = {};
        this.bound = false;
        this.onClick = this.onClick.bind(this);
        this.onSubmit = this.onSubmit.bind(this);
    }

    async initialise() {
        await auth.initialise();
        if (!auth.isAuthenticated()) return navigation.toLogin(location.pathname, { replace: true });
        this.role = await resolveUserDashboardRole(auth.getCurrentUser());
        if (!["SUPER_ADMIN", "STAFF"].includes(this.role)) return navigation.toRoleDashboard(this.role, { replace: true });
        const keys = ["view_quotes", "create_quotes", "edit_quotes", "approve_quotes"];
        this.permissions = this.role === "SUPER_ADMIN"
            ? Object.fromEntries(keys.map(k => [k, true]))
            : Object.fromEntries(await Promise.all(keys.map(async k => [k, await this.permission(k)])));
        if (!this.permissions.view_quotes) return this.message("You do not have permission to view quotes.", "error");
        this.bind();
        await this.load();
    }

    token() {
        const token = auth.getToken();
        if (!token) throw new Error("Your session has expired. Please sign in again.");
        return token;
    }

    async request(path, options = {}) {
        const response = await fetch(`${authConfig.supabase.url}/rest/v1/${path}`, {
            ...options,
            headers: {
                Accept: "application/json",
                apikey: authConfig.supabase.publishableKey,
                Authorization: `Bearer ${this.token()}`,
                "Content-Type": "application/json",
                Prefer: "return=representation",
                ...(options.headers || {})
            }
        });
        const raw = await response.text();
        let body = null;
        try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }
        if (!response.ok) {
            const detail = body && typeof body === "object"
                ? [body.message, body.hint, body.details, body.error_description, body.code].filter(Boolean).join(" — ")
                : String(body || "");
            throw new Error(detail || `Quote request failed (${response.status}).`);
        }
        return body;
    }

    async rpc(name, payload) {
        const response = await fetch(`${authConfig.supabase.url}/rest/v1/rpc/${name}`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                apikey: authConfig.supabase.publishableKey,
                Authorization: `Bearer ${this.token()}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
        const raw = await response.text();
        let body = null;
        try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }
        if (!response.ok) throw new Error(body?.message || body?.hint || body?.details || String(body || `Quote operation failed (${response.status}).`));
        return body;
    }

    async permission(key) {
        try { return Boolean(await this.rpc("has_staff_permission", { p_permission_key: key })); }
        catch { return false; }
    }

    async load() {
        try {
            const [quotes, individuals, businesses, matters] = await Promise.all([
                this.request("quotes?select=*&order=created_at.desc"),
                this.request("profiles?role=eq.INDIVIDUAL&is_active=eq.true&select=id,first_name,last_name,email&order=first_name"),
                this.request("businesses?is_active=eq.true&select=id,legal_name,trading_name,email&order=legal_name"),
                this.request("matters?select=id,reference_number,title,status,individual_user_id,business_id&order=updated_at.desc")
            ]);
            this.rows = Array.isArray(quotes) ? quotes : [];
            this.clients.individuals = Array.isArray(individuals) ? individuals : [];
            this.clients.businesses = Array.isArray(businesses) ? businesses : [];
            this.matters = Array.isArray(matters) ? matters : [];
            this.render();
        } catch (error) {
            console.error("[QuoteController] load failed", error);
            this.message(error.message, "error");
        }
    }

    bind() {
        if (this.bound) return;
        this.bound = true;
        document.addEventListener("click", this.onClick);
        document.addEventListener("submit", this.onSubmit);
        document.querySelector("[data-auth-action='logout']")?.addEventListener("click", async e => {
            e.preventDefault();
            await auth.logout({ remote: true, reason: "user" });
            navigation.toLogin(null, { replace: true });
        });
    }

    clientLabel(id, business = false) {
        if (business) {
            const x = this.clients.businesses.find(v => v.id === id);
            return x ? `${x.trading_name || x.legal_name} — ${x.email || ""}` : id || "Business";
        }
        const x = this.clients.individuals.find(v => v.id === id);
        return x ? `${`${x.first_name || ""} ${x.last_name || ""}`.trim()} — ${x.email || ""}` : id || "Individual";
    }

    clientOptions(row = {}) {
        const individuals = this.clients.individuals.map(x => `<option value="${x.id}" ${row.individual_user_id === x.id ? "selected" : ""}>${esc(`${x.first_name || ""} ${x.last_name || ""}`.trim() || x.email)} — ${esc(x.email || "")}</option>`).join("");
        const businesses = this.clients.businesses.map(x => `<option value="${x.id}" ${row.business_id === x.id ? "selected" : ""}>${esc(x.trading_name || x.legal_name)} — ${esc(x.email || "")}</option>`).join("");
        return `<optgroup label="Individuals">${individuals}</optgroup><optgroup label="Businesses">${businesses}</optgroup>`;
    }

    matterOptions(row = {}) {
        return this.matters.map(x => `<option value="${x.id}" ${row.matter_id === x.id ? "selected" : ""}>${esc(x.reference_number || x.title || x.id)} — ${esc(x.title || "")}</option>`).join("");
    }

    itemRows(row = {}) {
        const items = row.items || [{ item_name: "", description: "", quantity: 1, rate: 0, tax_rate: 0, discount_type: "PERCENT", discount_value: 0 }];
        return items.map((x, i) => `<tr data-quote-item-row><td><input name="item_name" required value="${esc(x.item_name || "")}"></td><td><input name="item_description" value="${esc(x.description || "")}"></td><td><input name="quantity" type="number" min="0.001" step="0.001" value="${esc(x.quantity ?? 1)}"></td><td><input name="rate" type="number" min="0" step="0.01" value="${esc(x.rate ?? 0)}"></td><td><input name="tax_rate" type="number" min="0" step="0.01" value="${esc(x.tax_rate ?? 0)}"></td><td><button type="button" class="btn btn-small btn-danger" data-quote-action="remove-item" ${i === 0 ? "disabled" : ""}>Remove</button></td></tr>`).join("");
    }

    openForm(row = {}) {
        const edit = Boolean(row.id);
        if (edit && !this.permissions.edit_quotes) return this.message("You do not have permission to edit quotes.", "error");
        if (!edit && !this.permissions.create_quotes) return this.message("You do not have permission to create quotes.", "error");
        const individual = row.individual_user_id ? row.individual_user_id : "";
        const business = row.business_id ? row.business_id : "";
        const discountType = row.discount_type || "PERCENT";
        this.openModal(`<div class="modal-backdrop" data-quote-action="close"></div><section class="modal-card modal-wide" role="dialog" aria-modal="true">
            <div class="modal-header"><div><p class="eyebrow">${this.role} · Sales</p><h2>${edit ? "Edit" : "New"} Quote</h2><p>Customer, dates, line items, discounts, tax and terms.</p></div><button class="icon-button" type="button" data-quote-action="close">×</button></div>
            <form id="quote-form" data-id="${esc(row.id || "")}">
                <div class="form-grid">
                    <label>Customer<select name="customer_id" required><option value="">Select customer</option>${this.clientOptions(row)}</select></label>
                    <label>Matter<select name="matter_id"><option value="">No matter</option>${this.matterOptions(row)}</select></label>
                    <label>Quote #<input name="reference_number" value="${esc(row.reference_number || "")}" placeholder="Auto-generated"></label>
                    <label>Reference #<input name="external_reference" value="${esc(row.external_reference || "")}"></label>
                    <label>Quote date<input name="quote_date" type="date" value="${esc(row.quote_date || today())}"></label>
                    <label>Expiry date<input name="expiry_date" type="date" value="${esc(row.expiry_date || "")}"></label>
                    <label class="form-wide">Subject<input name="subject" required maxlength="200" value="${esc(row.subject || row.description || "")}"></label>
                    <label class="form-wide">Description<textarea name="description" rows="3">${esc(row.description || "")}</textarea></label>
                </div>
                <div class="transaction-table-wrap"><table class="transaction-table"><thead><tr><th>Item</th><th>Description</th><th>Qty</th><th>Rate</th><th>Tax %</th><th></th></tr></thead><tbody id="quote-items">${this.itemRows(row)}</tbody></table><button type="button" class="btn btn-secondary" data-quote-action="add-item">+ Add line item</button></div>
                <div class="form-grid">
                    <label>Discount type<select name="discount_type"><option value="PERCENT" ${discountType === "PERCENT" ? "selected" : ""}>%</option><option value="FIXED" ${discountType === "FIXED" ? "selected" : ""}>Amount</option></select></label>
                    <label>Discount value<input name="discount_value" type="number" min="0" step="0.01" value="${esc(row.discount_value || 0)}"></label>
                    <label>Tax %<input name="tax_rate" type="number" min="0" step="0.01" value="${esc(row.tax_rate || 0)}"></label>
                    <label>Shipping<input name="shipping_charge" type="number" min="0" step="0.01" value="${esc(row.shipping_charge || 0)}"></label>
                    <label>Adjustment<input name="adjustment" type="number" step="0.01" value="${esc(row.adjustment || 0)}"></label>
                    <label class="form-wide">Customer notes<textarea name="customer_notes" rows="3">${esc(row.customer_notes || "Looking forward to your business.")}</textarea></label>
                    <label class="form-wide">Terms & conditions<textarea name="terms" rows="4">${esc(row.terms || "Payment terms as agreed in the retainer and service agreement.")}</textarea></label>
                </div>
                <div class="modal-footer"><button type="button" class="btn btn-secondary" data-quote-action="close">Cancel</button><button class="btn btn-primary" type="submit">${edit ? "Save Quote" : "Save as Draft"}</button></div>
            </form></section>`);
        const select = document.querySelector("#quote-form [name='customer_id']");
        if (select && individual) select.value = individual;
        if (select && business) select.value = `business:${business}`;
    }

    onClick(e) {
        const b = e.target.closest("[data-quote-action]");
        if (!b) return;
        const a = b.dataset.quoteAction;
        if (a === "new") return this.openForm();
        if (a === "edit") return this.openForm(this.rows.find(x => x.id === b.dataset.id) || {});
        if (a === "refresh") return this.load();
        if (a === "close") return this.close();
        if (a === "add-item") return this.addItem();
        if (a === "remove-item") return b.closest("tr")?.remove();
        if (a === "approve") return this.setApproved(b.dataset.id);
        if (a === "send") return this.markSent(b.dataset.id);
        if (a === "accept") return this.accept(b.dataset.id);
        if (a === "decline") return this.decline(b.dataset.id);
        if (a === "convert") return this.convert(b.dataset.id);
    }

    addItem() {
        const body = document.querySelector("#quote-items");
        if (!body) return;
        const tr = document.createElement("tr");
        tr.dataset.quoteItemRow = "true";
        tr.innerHTML = `<td><input name="item_name" required></td><td><input name="item_description"></td><td><input name="quantity" type="number" min="0.001" step="0.001" value="1"></td><td><input name="rate" type="number" min="0" step="0.01" value="0"></td><td><input name="tax_rate" type="number" min="0" step="0.01" value="0"></td><td><button type="button" class="btn btn-small btn-danger" data-quote-action="remove-item">Remove</button></td>`;
        body.appendChild(tr);
    }

    async onSubmit(e) {
        if (e.target.id !== "quote-form") return;
        e.preventDefault();
        const form = e.target;
        const fd = new FormData(form);
        const customer = String(fd.get("customer_id") || "");
        const business = customer.startsWith("business:") ? customer.slice(9) : "";
        const individual = business ? "" : customer;
        if (!individual && !business) return this.message("Select an individual or business customer.", "error");
        const items = [...document.querySelectorAll("#quote-items [data-quote-item-row]")].map(row => ({
            item_name: row.querySelector("[name='item_name']")?.value?.trim(),
            description: row.querySelector("[name='item_description']")?.value?.trim() || null,
            quantity: Number(row.querySelector("[name='quantity']")?.value || 0),
            rate: Number(row.querySelector("[name='rate']")?.value || 0),
            tax_rate: Number(row.querySelector("[name='tax_rate']")?.value || 0)
        })).filter(x => x.item_name);
        if (!items.length) return this.message("Add at least one quoted item or service.", "error");
        try {
            if (form.dataset.id) {
                if (!this.permissions.edit_quotes) throw new Error("You do not have permission to edit quotes.");
                const patch = {
                    individual_user_id: individual || null,
                    business_id: business || null,
                    matter_id: fd.get("matter_id") || null,
                    reference_number: fd.get("external_reference") || null,
                    quote_date: fd.get("quote_date") || today(),
                    expiry_date: fd.get("expiry_date") || null,
                    subject: fd.get("subject") || null,
                    description: fd.get("description") || fd.get("subject") || "Quote",
                    discount_type: fd.get("discount_type") || "PERCENT",
                    discount_value: Number(fd.get("discount_value") || 0),
                    tax_rate: Number(fd.get("tax_rate") || 0),
                    shipping_charge: Number(fd.get("shipping_charge") || 0),
                    adjustment: Number(fd.get("adjustment") || 0),
                    customer_notes: fd.get("customer_notes") || null,
                    terms: fd.get("terms") || null,
                    updated_by: auth.getCurrentUser().id
                };
                await this.request(`quotes?id=eq.${encodeURIComponent(form.dataset.id)}`, { method: "PATCH", body: JSON.stringify(patch) });
                await this.request(`quote_items?quote_id=eq.${encodeURIComponent(form.dataset.id)}`, { method: "DELETE" });
                for (const [index, item] of items.entries()) await this.request("quote_items", { method: "POST", body: JSON.stringify({ quote_id: form.dataset.id, item_order: index + 1, ...item, discount_type: "PERCENT", discount_value: 0, amount: Number(item.quantity * item.rate).toFixed(2) }) });
            } else {
                if (!this.permissions.create_quotes) throw new Error("You do not have permission to create quotes.");
                await this.rpc("create_quote_transaction", {
                    p_matter_id: fd.get("matter_id") || null,
                    p_individual_user_id: individual || null,
                    p_business_id: business || null,
                    p_reference_number: fd.get("external_reference") || null,
                    p_quote_date: fd.get("quote_date") || today(),
                    p_expiry_date: fd.get("expiry_date") || null,
                    p_subject: fd.get("subject") || null,
                    p_description: fd.get("description") || fd.get("subject") || null,
                    p_currency: "ZAR",
                    p_discount_type: fd.get("discount_type") || "PERCENT",
                    p_discount_value: Number(fd.get("discount_value") || 0),
                    p_tax_rate: Number(fd.get("tax_rate") || 0),
                    p_shipping_charge: Number(fd.get("shipping_charge") || 0),
                    p_adjustment: Number(fd.get("adjustment") || 0),
                    p_customer_notes: fd.get("customer_notes") || null,
                    p_terms: fd.get("terms") || null,
                    p_items: items
                });
            }
            this.close();
            await this.load();
            this.message("Quote saved successfully as a live Supabase transaction.", "success");
        } catch (error) {
            console.error("[QuoteController] save failed", error);
            this.message(error.message, "error");
        }
    }

    async setApproved(id) {
        if (!this.permissions.approve_quotes) return this.message("You do not have permission to approve quotes.", "error");
        await this.request(`quotes?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status: "APPROVED", approved_by: auth.getCurrentUser().id, approved_at: new Date().toISOString() }) });
        await this.load();
        this.message("Quote approved and ready to send.", "success");
    }

    async markSent(id) {
        if (!this.permissions.edit_quotes && !this.permissions.approve_quotes) return this.message("You do not have permission to send quotes.", "error");
        await this.request(`quotes?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ delivery_status: "SENT", sent_at: new Date().toISOString(), status: "APPROVED" }) });
        await this.load();
        this.message("Quote marked as sent.", "success");
    }

    async accept(id) {
        if (!this.permissions.edit_quotes && !this.permissions.approve_quotes) return this.message("You do not have permission to update quote decisions.", "error");
        await this.request(`quotes?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ customer_decision: "ACCEPTED", accepted_at: new Date().toISOString(), status: "APPROVED" }) });
        await this.load();
        this.message("Quote accepted.", "success");
    }

    async decline(id) {
        if (!this.permissions.edit_quotes && !this.permissions.approve_quotes) return this.message("You do not have permission to update quote decisions.", "error");
        await this.request(`quotes?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ customer_decision: "DECLINED", declined_at: new Date().toISOString(), status: "REJECTED" }) });
        await this.load();
        this.message("Quote declined and retained for audit.", "success");
    }

    async convert(id) {
        if (!this.permissions.approve_quotes) return this.message("Quote approval permission is required to convert a quote into an invoice.", "error");
        try {
            const invoiceId = await this.rpc("convert_quote_to_invoice", { p_quote_id: id });
            await this.load();
            this.message(`Quote converted to invoice ${invoiceId}.`, "success");
        } catch (error) { this.message(error.message, "error"); }
    }

    render() {
        const pending = this.rows.filter(x => !["REJECTED", "EXPIRED"].includes(String(x.status || "").toUpperCase()) && String(x.customer_decision || "PENDING").toUpperCase() === "PENDING").length;
        const approved = this.rows.filter(x => String(x.status || "").toUpperCase() === "APPROVED").length;
        const value = this.rows.reduce((sum, x) => sum + Number(x.total ?? x.amount ?? 0), 0);
        this.set("#quote-total", this.rows.length);
        this.set("#quote-pending", pending);
        this.set("#quote-approved", approved);
        this.set("#quote-value", money(value));
        const table = document.querySelector("#quotes-table");
        if (!table) return;
        table.innerHTML = this.rows.length ? this.rows.map(x => {
            const client = x.individual_user_id ? this.clientLabel(x.individual_user_id) : this.clientLabel(x.business_id, true);
            const status = String(x.status || "DRAFT").toUpperCase();
            const decision = String(x.customer_decision || "PENDING").toUpperCase();
            const lifecycle = decision === "ACCEPTED" ? "Accepted" : decision === "DECLINED" ? "Declined" : String(x.delivery_status || "NOT_SENT").replaceAll("_", " ");
            return `<tr><td><strong>${esc(x.quote_number || x.reference_number || "—")}</strong></td><td>${esc(client)}</td><td>${esc(x.subject || x.description || "—")}</td><td>${money(x.total ?? x.amount)}</td><td>${esc(status)}</td><td>${esc(lifecycle)}</td><td>${this.date(x.quote_date || x.created_at)}</td><td class="row-actions">${this.permissions.edit_quotes ? `<button class="btn btn-small" data-quote-action="edit" data-id="${x.id}">Edit</button>` : ""}${this.permissions.approve_quotes && status !== "APPROVED" && status !== "REJECTED" ? `<button class="btn btn-small btn-primary" data-quote-action="approve" data-id="${x.id}">Approve</button>` : ""}${this.permissions.approve_quotes && status === "APPROVED" && String(x.delivery_status || "NOT_SENT") !== "SENT" ? `<button class="btn btn-small" data-quote-action="send" data-id="${x.id}">Mark Sent</button>` : ""}${this.permissions.edit_quotes && decision === "PENDING" && String(x.delivery_status || "") === "SENT" ? `<button class="btn btn-small" data-quote-action="accept" data-id="${x.id}">Accept</button><button class="btn btn-small btn-danger" data-quote-action="decline" data-id="${x.id}">Decline</button>` : ""}${this.permissions.approve_quotes && (decision === "ACCEPTED" || status === "APPROVED") ? `<button class="btn btn-small btn-primary" data-quote-action="convert" data-id="${x.id}">Convert to Invoice</button>` : ""}</td></tr>`;
        }).join("") : `<tr><td colspan="8" class="empty-state">No quotes found.</td></tr>`;
        document.querySelector("[data-quote-action='new']")?.toggleAttribute("disabled", !this.permissions.create_quotes);
    }

    openModal(html) { const host = document.querySelector("#quote-modal"); if (host) { host.innerHTML = html; host.hidden = false; host.querySelector("input,select,textarea")?.focus(); } }
    close() { const host = document.querySelector("#quote-modal"); if (host) { host.hidden = true; host.innerHTML = ""; } }
    message(text, type = "success") { const node = document.querySelector("#quote-message"); if (node) { node.hidden = false; node.className = `login-message ${type === "error" ? "login-error" : "login-success"}`; node.textContent = text; } }
    set(selector, value) { const node = document.querySelector(selector); if (node) node.textContent = String(value); }
    date(value) { if (!value) return "—"; const d = new Date(value); return Number.isNaN(d.getTime()) ? "—" : new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(d); }
}

export default new QuoteController();
