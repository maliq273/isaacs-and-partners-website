import auth from "../auth/AuthService.js";
import navigation from "../core/navigation.js";
import { resolveUserDashboardRole } from "./DashboardAccess.js";
import staffAdminData from "./StaffAdminDataService.js";

class StaffAdminController {
    constructor() {
        this.staff = [];
        this.initialised = false;
        this.handleLogout = this.handleLogout.bind(this);
    }

    async initialise() {
        if (this.initialised) return this;
        await auth.initialise();
        if (!auth.isAuthenticated()) return navigation.toLogin(window.location.pathname, { replace: true });
        const role = await resolveUserDashboardRole(auth.getCurrentUser());
        if (role !== "SUPER_ADMIN") return navigation.toRoleDashboard(role, { replace: true });
        this.bindEvents();
        await this.load();
        this.initialised = true;
    }

    async load() {
        this.setStatus("Loading staff...");
        try {
            this.staff = await staffAdminData.list();
            this.render();
        } catch (error) {
            console.error("[StaffAdminController] Load failed", error);
            this.setStatus(error.message || "Staff data could not be loaded.", true);
        }
    }

    render() {
        const tbody = document.querySelector("#staff-admin-table");
        if (!tbody) return;
        if (!this.staff.length) {
            tbody.innerHTML = '<tr><td colspan="6">No staff members have been created yet.</td></tr>';
            return;
        }
        tbody.innerHTML = this.staff.map(member => {
            const name = [member.first_name, member.last_name].filter(Boolean).join(" ") || member.email || member.user_id || member.id;
            const status = String(member.status || "active").toLowerCase();
            return `<tr>
                <td><strong>${this.escape(name)}</strong></td>
                <td>${this.escape(member.role || "STAFF")}</td>
                <td>${this.escape(member.department || "—")}</td>
                <td><span class="status-badge ${status}">${this.escape(status)}</span></td>
                <td>${this.escape(member.user_id || "—")}</td>
                <td class="table-actions">
                    <button class="btn btn-sm" data-action="edit" data-id="${this.escape(member.id)}">Edit</button>
                    ${status === "active" ? `<button class="btn btn-sm" data-action="deactivate" data-id="${this.escape(member.id)}">Deactivate</button>` : `<button class="btn btn-sm btn-primary" data-action="activate" data-id="${this.escape(member.id)}">Activate</button>`}
                </td>
            </tr>`;
        }).join("");
    }

    bindEvents() {
        document.querySelector("#staff-create-form")?.addEventListener("submit", event => this.create(event));
        document.querySelector("#staff-admin-table")?.addEventListener("click", event => this.handleTableAction(event));
        document.querySelector("#staff-refresh")?.addEventListener("click", () => this.load());
        document.querySelectorAll("[data-auth-action='logout']").forEach(button => button.addEventListener("click", this.handleLogout));
    }

    async create(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const submit = form.querySelector("button[type='submit']");
        const data = Object.fromEntries(new FormData(form).entries());
        if (submit) submit.disabled = true;
        this.setStatus("Creating staff account...");
        try {
            await staffAdminData.createStaffAccount(data);
            form.reset();
            this.closeCreatePanel();
            await this.load();
            this.setStatus("Staff account created successfully.");
        } catch (error) {
            console.error("[StaffAdminController] Create failed", error);
            this.setStatus(error.message || "Staff account could not be created.", true);
        } finally {
            if (submit) submit.disabled = false;
        }
    }

    async handleTableAction(event) {
        const button = event.target.closest("button[data-action]");
        if (!button) return;
        const id = button.dataset.id;
        const action = button.dataset.action;
        if (action === "edit") return this.edit(id);
        button.disabled = true;
        try {
            if (action === "deactivate") await staffAdminData.deactivate(id);
            if (action === "activate") await staffAdminData.activate(id);
            await this.load();
        } catch (error) {
            this.setStatus(error.message || "Staff status could not be updated.", true);
        } finally { button.disabled = false; }
    }

    async edit(id) {
        const member = this.staff.find(item => String(item.id) === String(id));
        if (!member) return;
        const department = window.prompt("Department", member.department || "");
        if (department === null) return;
        try {
            await staffAdminData.updateStaff(id, { department });
            await this.load();
        } catch (error) {
            this.setStatus(error.message || "Staff member could not be updated.", true);
        }
    }

    closeCreatePanel() {
        const panel = document.querySelector("#staff-create-panel");
        if (panel) panel.hidden = true;
    }

    setStatus(message, error = false) {
        const element = document.querySelector("#staff-admin-status");
        if (!element) return;
        element.textContent = message;
        element.classList.toggle("login-error", error);
    }

    escape(value) {
        return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
    }

    async handleLogout(event) {
        event.preventDefault();
        await auth.logout({ remote: true, reason: "user" });
        navigation.toLogin(null, { replace: true });
    }
}

export const staffAdminController = new StaffAdminController();
export default staffAdminController;
