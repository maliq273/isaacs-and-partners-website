import auth from "../auth/AuthService.js";
import navigation from "../core/navigation.js";
import { resolveUserDashboardRole } from "./DashboardAccess.js";
import authorityPeopleData from "./AuthorityPeopleDataService.js";

const PERMISSIONS = [
    ["can_liaise_with_ai", "Liaise with Anthony"],
    ["can_answer_ai_queries", "Answer Anthony queries"],
    ["can_relay_to_clients", "Relay approved responses to clients"],
    ["can_handle_appointments", "Handle appointments"],
    ["can_provide_pricing", "Provide pricing"],
    ["can_approve_quotes", "Approve quotes"],
    ["can_handle_immigration", "Handle immigration"],
    ["can_handle_hr", "Handle HR / IR"],
    ["can_handle_business_compliance", "Handle business compliance"],
    ["can_handle_legal", "Handle legal"]
];

class AuthorityPeopleController {
    constructor() { this.rows = []; this.editing = null; }
    async initialise() {
        await auth.initialise();
        if (!auth.isAuthenticated()) return navigation.toLogin(window.location.pathname, { replace: true });
        const role = await resolveUserDashboardRole(auth.getCurrentUser());
        if (role !== "SUPER_ADMIN") return navigation.toRoleDashboard(role, { replace: true });
        this.bind();
        await this.load();
    }
    bind() {
        document.querySelector("#authority-refresh")?.addEventListener("click", () => this.load());
        document.querySelector("#authority-new")?.addEventListener("click", () => this.openEditor(null));
        document.querySelector("#authority-cancel")?.addEventListener("click", () => this.closeEditor());
        document.querySelector("#authority-form")?.addEventListener("submit", e => this.save(e));
        document.querySelector("#authority-table")?.addEventListener("click", e => {
            const button = e.target.closest("button[data-action]"); if (!button) return;
            const row = this.rows.find(item => item.id === button.dataset.id); if (!row) return;
            if (button.dataset.action === "edit") this.openEditor(row);
            if (button.dataset.action === "deactivate") this.deactivate(row);
        });
        document.querySelector("#authority-role")?.addEventListener("change", e => this.toggleStaffPermissions(e.target.value));
    }
    async load() {
        this.status("Loading Authority & People…");
        try { const result = await authorityPeopleData.list(); this.rows = result.rows || []; this.render(); this.status(`${this.rows.length} authority record(s) loaded.`); }
        catch (error) { console.error(error); this.status(error.message || "Unable to load authority records.", true); }
    }
    render() {
        const tbody = document.querySelector("#authority-table"); if (!tbody) return;
        tbody.replaceChildren();
        if (!this.rows.length) { const tr = document.createElement("tr"); tr.innerHTML = `<td colspan="7">No authority records found.</td>`; tbody.appendChild(tr); return; }
        this.rows.forEach(row => {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td><strong>${this.escape(row.full_name)}</strong><small>${this.escape(row.phone_number)}</small></td><td>${this.escape(row.authority_role)}</td><td>${this.escape(row.job_title || "—")}</td><td>${this.escape(row.department || "—")}</td><td><span class="status-badge ${row.is_active ? "active" : "inactive"}">${row.is_active ? "Active" : "Inactive"}</span></td><td>${row.authority_role === "STAFF" ? this.permissionSummary(row.ai_permissions) : row.authority_role === "SUPER_ADMIN" ? "All authority" : "Role authority"}</td><td><button class="btn btn-sm" data-action="edit" data-id="${this.escape(row.id)}">Edit</button>${row.is_active ? `<button class="btn btn-sm btn-danger" data-action="deactivate" data-id="${this.escape(row.id)}">Deactivate</button>` : ""}</td>`;
            tbody.appendChild(tr);
        });
    }
    permissionSummary(p) { if (!p) return "Not configured"; const count = PERMISSIONS.filter(([key]) => p[key] === true).length; return `${count}/${PERMISSIONS.length} enabled`; }
    openEditor(row) {
        this.editing = row;
        const form = document.querySelector("#authority-form"); if (!form) return;
        form.reset();
        document.querySelector("#authority-id").value = row?.id || "";
        document.querySelector("#authority-name").value = row?.full_name || "";
        document.querySelector("#authority-phone").value = row?.phone_number || "";
        document.querySelector("#authority-role").value = row?.authority_role || "STAFF";
        document.querySelector("#authority-title").value = row?.job_title || "";
        document.querySelector("#authority-department").value = row?.department || "";
        document.querySelector("#authority-user-id").value = row?.user_id || "";
        document.querySelector("#authority-notes").value = row?.notes || "";
        document.querySelector("#authority-active").checked = row ? row.is_active !== false : true;
        const p = row?.ai_permissions || {};
        PERMISSIONS.forEach(([key]) => { const input = document.querySelector(`[data-permission="${key}"]`); if (input) input.checked = p[key] === true; });
        this.toggleStaffPermissions(document.querySelector("#authority-role").value);
        document.querySelector("#authority-editor").hidden = false;
        document.querySelector("#authority-editor").scrollIntoView({ behavior: "smooth", block: "start" });
    }
    toggleStaffPermissions(role) { const box = document.querySelector("#authority-permissions"); if (box) box.hidden = role !== "STAFF"; }
    closeEditor() { document.querySelector("#authority-editor").hidden = true; this.editing = null; }
    async save(event) {
        event.preventDefault();
        const payload = { id: document.querySelector("#authority-id").value || null, full_name: document.querySelector("#authority-name").value.trim(), phone_number: document.querySelector("#authority-phone").value.trim(), authority_role: document.querySelector("#authority-role").value, job_title: document.querySelector("#authority-title").value.trim(), department: document.querySelector("#authority-department").value.trim(), user_id: document.querySelector("#authority-user-id").value.trim() || null, notes: document.querySelector("#authority-notes").value.trim(), is_active: document.querySelector("#authority-active").checked, ai_permissions: Object.fromEntries(PERMISSIONS.map(([key]) => [key, document.querySelector(`[data-permission="${key}"]`)?.checked === true])) };
        const button = document.querySelector("#authority-save"); if (button) button.disabled = true;
        try { await authorityPeopleData.save(payload); this.closeEditor(); await this.load(); this.status("Authority record saved."); }
        catch (error) { this.status(error.message || "Authority record could not be saved.", true); }
        finally { if (button) button.disabled = false; }
    }
    async deactivate(row) { if (!confirm(`Deactivate ${row.full_name}? This removes the number from active WhatsApp authority matching.`)) return; try { await authorityPeopleData.deactivate(row.id); await this.load(); } catch (error) { this.status(error.message || "Authority record could not be deactivated.", true); } }
    permissionSummaryText() {}
    status(text, error = false) { const el = document.querySelector("#authority-status"); if (el) { el.textContent = text; el.classList.toggle("error", error); } }
    escape(value) { return String(value ?? "").replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#039;"}[c])); }
}
const controller = new AuthorityPeopleController();
if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", () => controller.initialise().catch(console.error));
export { AuthorityPeopleController };
export default controller;