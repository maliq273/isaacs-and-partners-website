import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";
import { resolveUserDashboardRole } from "./DashboardAccess.js";

class StaffLivePermissionController {
    constructor() {
        this.baseUrl = `${authConfig.supabase.url}/rest/v1`;
        this.key = authConfig.supabase.publishableKey;
        this.timeout = authConfig.request.timeout;
    }

    async request(path, options = {}) {
        await auth.initialise();
        const token = auth.getToken();
        if (!token || !auth.isAuthenticated()) {
            throw new Error("STAFF_AUTH_REQUIRED");
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(`${this.baseUrl}/${path}`, {
                ...options,
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    apikey: this.key,
                    Authorization: `Bearer ${token}`,
                    ...(options.headers || {})
                },
                signal: controller.signal
            });

            const raw = await response.text();
            let data = [];

            try {
                data = raw ? JSON.parse(raw) : [];
            } catch {
                data = raw;
            }

            if (!response.ok) {
                const error = new Error(
                    data?.message ||
                    data?.hint ||
                    `Request failed (${response.status}).`
                );
                error.status = response.status;
                error.details = data;
                throw error;
            }

            return data;
        } finally {
            clearTimeout(timer);
        }
    }

    async rpc(name, payload) {
        return this.request(`rpc/${encodeURIComponent(name)}`, {
            method: "POST",
            body: JSON.stringify(payload)
        });
    }

    async initialise() {
        await auth.initialise();
        if (!auth.isAuthenticated()) return;

        const role = await resolveUserDashboardRole(auth.getCurrentUser());
        if (role !== "STAFF") return;

        const userId = auth.getCurrentUser()?.id;
        if (!userId) return;

        try {
            const staffRows = await this.request(
                `staff?select=id,user_id,employee_number,department,job_title,is_active&user_id=eq.${encodeURIComponent(userId)}&limit=1`
            );
            const staff = Array.isArray(staffRows) ? staffRows[0] : staffRows;
            if (!staff) return;

            // Do not filter matters by a browser-supplied user_id. The live
            // RLS policy decides which matters this staff member may see.
            const matters = await this.request(
                "matters?select=id,reference_number,title,status,priority,updated_at&order=updated_at.desc&limit=50"
            );

            const assignments = await this.request(
                `assignments?select=id,matter_id,case_id,quote_id,status,assigned_at&staff_id=eq.${encodeURIComponent(staff.id)}&order=assigned_at.desc&limit=50`
            );

            const [viewScope, editScope] = await Promise.all([
                this.safeScope("view_matters"),
                this.safeScope("edit_matters")
            ]);

            this.render({
                staff,
                matters: Array.isArray(matters) ? matters : [],
                assignments: Array.isArray(assignments) ? assignments : [],
                viewScope,
                editScope
            });
        } catch (error) {
            console.error(
                "[StaffLivePermissionController] Live staff load failed:",
                error
            );
            this.renderFailure(error);
        }
    }

    async safeScope(permissionKey) {
        try {
            const result = await this.rpc("staff_permission_scope", {
                p_permission_key: permissionKey
            });
            return String(result || "NONE");
        } catch (error) {
            console.warn(
                `[StaffLivePermissionController] Could not resolve ${permissionKey} scope.`,
                error
            );
            return "UNKNOWN";
        }
    }

    render({ staff, matters, assignments, viewScope, editScope }) {
        this.setText("#total-staff", "1");
        this.setText("#active-staff", staff.is_active === true ? "1" : "0");
        this.setText("#online-staff", "—");
        this.setText("#staff-outstanding-tasks", "0");

        const activeAssignments = assignments.filter(
            item => String(item.status || "").toUpperCase() === "ACTIVE"
        );

        this.setText(
            "#staff-workload",
            matters.length
                ? `${matters.length} matter(s) visible through live Supabase RLS. ${activeAssignments.length} active assignment(s).`
                : "No matters are visible to this account under the current permission scope."
        );

        this.setText(
            "#staff-activity",
            `Live access — View Matters: ${viewScope}; Edit Matters: ${editScope}.`
        );

        const table = document.querySelector("#staff-table");
        if (!table) return;

        if (!matters.length) {
            table.innerHTML = `
                <tr>
                    <td colspan="8">
                        No matters are visible to this staff account under the current RLS permission scope.
                    </td>
                </tr>
            `;
            return;
        }

        table.innerHTML = matters.map(matter => `
            <tr>
                <td>
                    <strong>${this.escape(matter.reference_number || matter.title || matter.id)}</strong>
                </td>
                <td>STAFF</td>
                <td>${this.escape(staff.department || "—")}</td>
                <td>${this.escape(matter.title || "—")}</td>
                <td>—</td>
                <td>
                    <span class="status-badge active">
                        ${this.escape(matter.status || "OPEN")}
                    </span>
                </td>
                <td>${this.formatDate(matter.updated_at)}</td>
                <td></td>
            </tr>
        `).join("");
    }

    renderFailure(error) {
        const activity = document.querySelector("#staff-activity");
        if (activity) {
            activity.textContent =
                "Live permission data could not be loaded. Supabase RLS remains the enforcement authority.";
        }

        if (error?.status === 401 || error?.status === 403) {
            this.setText("#active-staff", "0");
        }
    }

    setText(selector, value) {
        const element = document.querySelector(selector);
        if (element) element.textContent = String(value);
    }

    formatDate(value) {
        if (!value) return "—";
        const date = new Date(value);
        return Number.isNaN(date.getTime())
            ? "—"
            : date.toLocaleString("en-ZA");
    }

    escape(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
}

export const staffLivePermissionController =
    new StaffLivePermissionController();

export default staffLivePermissionController;
