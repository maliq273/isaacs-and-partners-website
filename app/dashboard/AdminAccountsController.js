import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";
import adminAccountsData from "./AdminAccountsDataService.js";

const esc = value => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");

class AdminAccountsController {
    constructor() {
        this.individuals = [];
        this.businesses = [];
        this.mode = "individuals";
        this.initialised = false;
        this.onClick = this.onClick.bind(this);
        this.onSubmit = this.onSubmit.bind(this);
        this.onSearch = this.onSearch.bind(this);
    }

    async initialise() {
        if (this.initialised) return this;
        await auth.initialise();
        if (!auth.isAuthenticated()) {
            window.location.href = "../auth/login.html?return=" + encodeURIComponent(window.location.pathname);
            return this;
        }
        const role = await this.resolveRole();
        if (role !== "SUPER_ADMIN") {
            window.location.href = "./";
            return this;
        }
        this.bind();
        await this.load();
        this.initialised = true;
        return this;
    }

    async resolveRole() {
        const token = this.accessToken();
        if (!token) return null;
        const response = await fetch(`${authConfig.supabase.url}/rest/v1/profiles?id=eq.${encodeURIComponent(this.userId())}&select=role,is_active`, {
            headers: { apikey: authConfig.supabase.publishableKey, Authorization: `Bearer ${token}` }
        });
        const rows = await response.json().catch(() => []);
        const profile = rows[0];
        if (!profile?.is_active) return null;
        return String(profile.role || "").toUpperCase();
    }

    accessToken() {
        const session = auth.getSession?.() || auth.session || null;
        if (session?.access_token) return session.access_token;
        const direct = auth.getAccessToken?.();
        if (direct) return direct;
        try {
            const raw = localStorage.getItem(authConfig.storageKeys.session);
            const parsed = raw ? JSON.parse(raw) : null;
            return parsed?.access_token || null;
        } catch { return null; }
    }

    userId() {
        const user = auth.getCurrentUser?.() || auth.user || null;
        return user?.id || user?.user_id || user?.userId || "";
    }

    async rest(path, options = {}) {
        const token = this.accessToken();
        const response = await fetch(`${authConfig.supabase.url}/rest/v1/${path}`, {
            ...options,
            headers: {
                apikey: authConfig.supabase.publishableKey,
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                Prefer: "return=representation",
                ...(options.headers || {})
            }
        });
        const body = await response.json().catch(() => []);
        if (!response.ok) throw new Error(body?.message || body?.error || `Supabase request failed (${response.status}).`);
        return body;
    }

    async load() {
        this.setBusy(true);
        try {
            const [profiles, businesses] = await Promise.all([
                this.rest("profiles?role=eq.INDIVIDUAL&order=created_at.desc&select=id,email,first_name,last_name,phone,is_active,created_at,updated_at"),
                this.rest("businesses?order=created_at.desc&select=id,owner_user_id,legal_name,trading_name,registration_number,tax_number,email,phone,is_active,created_at,updated_at")
            ]);
            this.individuals = Array.isArray(profiles) ? profiles : [];
            this.businesses = Array.isArray(businesses) ? businesses : [];
            this.render();
        } catch (error) {
            console.error("[AdminAccountsController] Load failed", error);
            this.message(error.message || "Account data could not be loaded.", "error");
        } finally {
            this.setBusy(false);
        }
    }

    bind() {
        document.addEventListener("click", this.onClick);
        document.addEventListener("submit", this.onSubmit);
        document.querySelector("#account-search")?.addEventListener("input", this.onSearch);
        document.querySelector("[data-auth-action='logout']")?.addEventListener("click", async event => {
            event.preventDefault();
            await auth.logout({ remote: true, reason: "user" });
            window.location.href = "../auth/login.html";
        });
    }

    onSearch() { this.renderTable(); }

    onClick(event) {
        const action = event.target.closest("[data-account-action]")?.dataset.accountAction;
        if (!action) return;
        const button = event.target.closest("[data-account-action]");
        const id = button?.dataset.id;
        const role = button?.dataset.role;
        if (action === "individuals" || action === "businesses") {
            this.mode = action;
            document.querySelectorAll("[data-account-action='individuals'],[data-account-action='businesses']").forEach(el => el.classList.toggle("active", el.dataset.accountAction === action));
            this.renderTable();
            return;
        }
        if (action === "new-individual") return this.openForm("create", "INDIVIDUAL");
        if (action === "new-business") return this.openForm("create", "BUSINESS");
        if (action === "edit") return this.openForm("edit", role, id);
        if (action === "toggle") return this.toggle(id, role, button.dataset.active === "true");
        if (action === "password") return this.openPassword(id, role);
        if (action === "close-modal") return this.closeModal();
    }

    async toggle(id, role, active) {
        const verb = active ? "deactivate" : "activate";
        if (!window.confirm(`Are you sure you want to ${verb} this ${role.toLowerCase()} account?`)) return;
        try {
            await adminAccountsData.setActive(id, !active, role);
            await this.load();
            this.message(`Account ${verb}d successfully.`, "success");
        } catch (error) { this.message(error.message, "error"); }
    }

    openForm(action, role, id = "") {
        const record = role === "INDIVIDUAL" ? this.individuals.find(item => item.id === id) : this.businesses.find(item => item.owner_user_id === id);
        const isBusiness = role === "BUSINESS";
        const isEdit = action === "edit";
        const form = document.querySelector("#account-modal");
        if (!form) return;
        form.innerHTML = `
            <div class="modal-backdrop" data-account-action="close-modal"></div>
            <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="account-modal-title">
              <div class="modal-header"><div><p class="eyebrow">Super Admin</p><h2 id="account-modal-title">${isEdit ? "Edit" : "Create"} ${isBusiness ? "Business" : "Individual"}</h2></div><button type="button" class="icon-button" data-account-action="close-modal" aria-label="Close">×</button></div>
              <form id="account-form" data-action="${action}" data-role="${role}" data-id="${esc(id)}">
                <div class="form-grid">
                  <label>Email<input name="email" type="email" required value="${esc(record?.email || "")}"></label>
                  <label>Phone<input name="phone" type="tel" value="${esc(record?.phone || "")}"></label>
                  <label>First name<input name="first_name" required value="${esc(record?.first_name || "")}"></label>
                  <label>Last name<input name="last_name" value="${esc(record?.last_name || "")}"></label>
                  ${isBusiness ? `<label>Legal name<input name="legal_name" required value="${esc(record?.legal_name || "")}"></label><label>Trading name<input name="trading_name" value="${esc(record?.trading_name || "")}"></label><label>Registration number<input name="registration_number" value="${esc(record?.registration_number || "")}"></label><label>Tax number<input name="tax_number" value="${esc(record?.tax_number || "")}"></label>` : ""}
                  ${!isEdit ? `<label>Temporary password<input name="password" type="password" minlength="8" required autocomplete="new-password"></label>` : ""}
                </div>
                <div class="modal-footer"><button type="button" class="btn btn-secondary" data-account-action="close-modal">Cancel</button><button class="btn btn-primary" type="submit">${isEdit ? "Save Changes" : "Create Account"}</button></div>
              </form>
            </section>`;
        form.hidden = false;
        form.querySelector("input")?.focus();
    }

    openPassword(id, role) {
        const form = document.querySelector("#account-modal");
        if (!form) return;
        form.innerHTML = `<div class="modal-backdrop" data-account-action="close-modal"></div><section class="modal-card" role="dialog" aria-modal="true"><div class="modal-header"><div><p class="eyebrow">Security</p><h2>Reset Password</h2></div><button type="button" class="icon-button" data-account-action="close-modal">×</button></div><form id="password-form" data-role="${role}" data-id="${esc(id)}"><label>New temporary password<input name="password" type="password" minlength="8" required autocomplete="new-password"></label><div class="modal-footer"><button type="button" class="btn btn-secondary" data-account-action="close-modal">Cancel</button><button class="btn btn-primary">Reset Password</button></div></form></section>`;
        form.hidden = false;
        form.querySelector("input")?.focus();
    }

    async onSubmit(event) {
        if (event.target.id !== "account-form" && event.target.id !== "password-form") return;
        event.preventDefault();
        const form = event.target;
        const data = Object.fromEntries(new FormData(form).entries());
        const action = form.dataset.action;
        const role = form.dataset.role;
        const id = form.dataset.id;
        try {
            this.setBusy(true);
            if (form.id === "password-form") await adminAccountsData.resetPassword(id, data.password, role);
            else if (action === "create") role === "INDIVIDUAL" ? await adminAccountsData.createIndividual(data) : await adminAccountsData.createBusiness(data);
            else role === "INDIVIDUAL" ? await adminAccountsData.updateIndividual(id, data) : await adminAccountsData.updateBusiness(id, data);
            this.closeModal();
            await this.load();
            this.message("Account saved successfully.", "success");
        } catch (error) { this.message(error.message || "The account operation failed.", "error"); }
        finally { this.setBusy(false); }
    }

    render() {
        const individualCount = this.individuals.length;
        const businessCount = this.businesses.length;
        document.querySelector("#account-individual-count").textContent = individualCount;
        document.querySelector("#account-business-count").textContent = businessCount;
        document.querySelector("#account-active-count").textContent = [...this.individuals, ...this.businesses].filter(item => item.is_active).length;
        this.renderTable();
    }

    renderTable() {
        const tbody = document.querySelector("#accounts-table");
        if (!tbody) return;
        const search = String(document.querySelector("#account-search")?.value || "").toLowerCase();
        const records = this.mode === "individuals" ? this.individuals.map(item => ({ ...item, accountRole: "INDIVIDUAL", displayName: `${item.first_name || ""} ${item.last_name || ""}`.trim() })) : this.businesses.map(item => ({ ...item, accountRole: "BUSINESS", displayName: item.trading_name || item.legal_name }));
        const filtered = records.filter(item => `${item.displayName} ${item.email || ""} ${item.phone || ""} ${item.registration_number || ""}`.toLowerCase().includes(search));
        tbody.innerHTML = filtered.length ? filtered.map(item => `<tr><td><strong>${esc(item.displayName || "Unnamed")}</strong><small>${esc(item.email || "")}</small></td><td>${esc(item.phone || "—")}</td><td>${item.accountRole === "BUSINESS" ? esc(item.registration_number || "—") : "Individual"}</td><td><span class="status-badge ${item.is_active ? "active" : "inactive"}">${item.is_active ? "Active" : "Inactive"}</span></td><td>${this.formatDate(item.updated_at || item.created_at)}</td><td class="row-actions"><button class="btn btn-small" data-account-action="edit" data-role="${item.accountRole}" data-id="${esc(item.accountRole === "BUSINESS" ? item.owner_user_id : item.id)}">Edit</button><button class="btn btn-small btn-secondary" data-account-action="password" data-role="${item.accountRole}" data-id="${esc(item.accountRole === "BUSINESS" ? item.owner_user_id : item.id)}">Password</button><button class="btn btn-small ${item.is_active ? "btn-danger" : "btn-primary"}" data-account-action="toggle" data-role="${item.accountRole}" data-id="${esc(item.accountRole === "BUSINESS" ? item.owner_user_id : item.id)}" data-active="${item.is_active}">${item.is_active ? "Deactivate" : "Activate"}</button></td></tr>`).join("") : `<tr><td colspan="6" class="empty-state">No ${this.mode === "individuals" ? "individual" : "business"} accounts found.</td></tr>`;
    }

    formatDate(value) { if (!value) return "—"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(date); }
    closeModal() { const modal = document.querySelector("#account-modal"); if (modal) { modal.hidden = true; modal.innerHTML = ""; } }
    setBusy(busy) { document.body.classList.toggle("is-busy", busy); }
    message(text, type) { const el = document.querySelector("#account-message"); if (!el) return; el.hidden = false; el.className = `login-message ${type === "error" ? "login-error" : "login-success"}`; el.textContent = text; window.setTimeout(() => { el.hidden = true; }, 5000); }
}

export const adminAccountsController = new AdminAccountsController();
export default adminAccountsController;
