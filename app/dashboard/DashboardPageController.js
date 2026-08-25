/**
 * Isaacs and Partners
 * Dashboard Page Controller
 *
 * Connects rendered role dashboards to dashboard data services.
 * The authoritative dashboard role is resolved once from public.profiles.
 */

import auth from "../auth/AuthService.js";
import navigation from "../core/navigation.js";
import dashboardData from "./DashboardDataService.js";
import adminDashboardData from "./AdminDashboardDataService.js";
import { resolveUserDashboardRole, clearRoleCache } from "./DashboardAccess.js";

const PAGE_ROLES = Object.freeze({
    "client-dashboard": "INDIVIDUAL",
    "business-dashboard": "BUSINESS",
    "staff-dashboard": "STAFF",
    "super-admin": "SUPER_ADMIN"
});

class DashboardPageController {
    constructor() {
        this.initialised = false;
        this.loading = false;
        this.data = null;
        this.handleLogout = this.handleLogout.bind(this);
    }

    async initialise() {
        if (this.initialised) return this;
        if (this.loading) return this.loading;
        this.loading = this._initialise();
        try {
            await this.loading;
            return this;
        } finally {
            this.loading = false;
        }
    }

    async _initialise() {
        await auth.initialise();

        if (!auth.isAuthenticated()) {
            navigation.toLogin(this.getCurrentReturnUrl(), { replace: true });
            return this;
        }

        const user = auth.getCurrentUser();
        const role = await resolveUserDashboardRole(user);
        const pageRole = this.getPageRole();

        if (!this.canUsePage(role, pageRole)) {
            navigation.toRoleDashboard(role, { replace: true });
            return this;
        }

        try {
            if (pageRole === "SUPER_ADMIN") {
                /* Pass the role already verified above; do not perform another profile lookup. */
                this.data = await adminDashboardData.getDashboardSummary(role);
                this.data.user = user;
                this.data.role = role;
                this.data.dashboard = "SUPER_ADMIN";
            } else {
                this.data = await dashboardData.getCurrentDashboard({ limit: 10 });
            }

            this.render();
        } catch (error) {
            console.error("[DashboardPageController] Dashboard data load failed:", error);
            this.renderError(error);
        }

        this.bindEvents();
        this.initialised = true;
        return this;
    }

    getPageRole() {
        if (typeof document === "undefined") return null;
        return PAGE_ROLES[document.body?.dataset?.page] || null;
    }

    canUsePage(actualRole, pageRole) {
        if (!pageRole) return true;
        if (actualRole === "SUPER_ADMIN") return pageRole === "SUPER_ADMIN" || pageRole === "STAFF";
        return actualRole === pageRole;
    }

    getCurrentReturnUrl() {
        if (typeof window === "undefined") return "/index.html";
        return window.location.pathname + window.location.search + window.location.hash;
    }

    render() {
        if (typeof document === "undefined" || !this.data) return;
        this.renderUser();
        this.renderRoleDashboard();
        this.renderLogoutState();
    }

    renderUser() {
        const user = this.data.user || auth.getCurrentUser();
        const displayName = user?.name || user?.fullName || user?.full_name || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || user?.username || "User";
        document.querySelectorAll("#dashboard-greeting, #admin-greeting").forEach(element => {
            element.textContent = `Welcome, ${displayName}`;
        });
    }

    renderRoleDashboard() {
        const page = this.getPageRole();
        if (page === "INDIVIDUAL") return this.renderIndividual();
        if (page === "BUSINESS") return this.renderBusiness();
        if (page === "STAFF") return this.renderStaff();
        if (page === "SUPER_ADMIN") return this.renderSuperAdmin();
    }

    renderIndividual() {
        const matters = this.data.matters || [];
        const documents = this.data.documents || [];
        const appointments = this.data.appointments || [];
        const invoices = this.data.invoices || [];
        this.setStatByIndex(0, matters.length);
        this.setStatByIndex(1, documents.length);
        this.setStatByIndex(2, appointments.length);
        this.setStatByIndex(3, this.calculateOutstandingBalance(invoices));
        this.setEmptyState(0, this.collectionMessage(matters, "matter"));
        this.setEmptyState(1, this.collectionMessage(documents, "outstanding document"));
        this.setEmptyState(2, this.collectionMessage(appointments, "upcoming appointment"));
    }

    renderBusiness() {
        const matters = this.data.matters || [];
        const documents = this.data.documents || [];
        const invoices = this.data.invoices || [];
        this.setStatByIndex(0, matters.length);
        this.setStatByIndex(1, documents.length);
        this.setStatByIndex(2, this.countComplianceItems(documents));
        this.setStatByIndex(3, this.calculateOutstandingBalance(invoices));
        this.setEmptyState(0, this.collectionMessage(matters, "business matter"));
        this.setEmptyState(1, this.collectionMessage(documents, "outstanding document"));
    }

    renderStaff() {
        const matters = this.data.matters || [];
        const tasks = this.data.tasks || [];
        const staff = this.data.staff || {};
        this.setText("#staff-outstanding-tasks", tasks.length);
        this.setText("#active-staff", staff.status === "active" ? 1 : 0);
        this.setText("#online-staff", staff.online ? 1 : 0);
        this.setText("#total-staff", this.data.staff ? 1 : 0);
        this.setText("#staff-table", tasks.length ? `${tasks.length} task(s) assigned to you.` : "No tasks assigned.");
        this.setText("#staff-workload", matters.length ? `${matters.length} matter(s) currently linked to your workload.` : "No matters currently assigned.");
        this.setText("#staff-activity", tasks.length ? `${tasks.length} outstanding task(s) require attention.` : "No outstanding tasks.");
    }

    renderSuperAdmin() {
        const counts = this.data.counts || {};
        this.setText("#admin-open-matters", counts.openMatters ?? 0);
        this.setText("#admin-prequote-count", counts.pendingPreQuotes ?? 0);
        this.setText("#admin-unassigned-count", counts.unassignedMatters ?? 0);
        this.setText("#admin-staff-count", counts.staff ?? 0);
        this.setText("#admin-security-status", this.data.role === "SUPER_ADMIN" ? "Authenticated administrator session is active. Live Supabase data is connected." : "Administrator access is unavailable.");
        this.setPanelMessage("Staff administration is ready for the staff workflow/API connection.", counts.staff ?? 0, "staff");
        this.setPanelMessage("Assignment queue will appear here when the quote workflow is connected.", counts.unassignedMatters ?? 0, "unassigned matter");
    }

    setPanelMessage(defaultMessage, count, label) {
        const panels = document.querySelectorAll(".dashboard-grid .activity-list .empty-state");
        const message = count > 0 ? `${count} ${label}${count === 1 ? "" : "s"} currently require attention.` : defaultMessage;
        panels.forEach(panel => {
            if (panel.textContent?.includes(defaultMessage.slice(0, 20))) panel.textContent = message;
        });
    }

    calculateOutstandingBalance(invoices) {
        const total = invoices.reduce((sum, invoice) => {
            const value = invoice?.balance_due ?? invoice?.balanceDue ?? invoice?.amount_due ?? invoice?.amountDue ?? 0;
            const numeric = Number(value);
            return sum + (Number.isFinite(numeric) ? numeric : 0);
        }, 0);
        return `R${total.toFixed(2)}`;
    }

    countComplianceItems(documents) {
        return documents.filter(document => {
            const type = String(document?.type || document?.category || document?.document_type || "").toLowerCase();
            return type.includes("compliance") || type.includes("sars") || type.includes("uif") || type.includes("coida");
        }).length;
    }

    collectionMessage(items, label) {
        const count = items.length;
        if (!count) return `No ${label}s are currently linked to your account.`;
        return `${count} ${label}${count === 1 ? "" : "s"} currently linked to your account.`;
    }

    setStatByIndex(index, value) {
        const cards = document.querySelectorAll(".stats-grid .stat-card strong");
        if (cards[index]) cards[index].textContent = String(value);
    }

    setText(selector, value) {
        const element = document.querySelector(selector);
        if (element) element.textContent = String(value);
    }

    setEmptyState(index, value) {
        const elements = document.querySelectorAll(".dashboard-grid .empty-state");
        if (elements[index]) elements[index].textContent = value;
    }

    renderError(error) {
        const page = document.querySelector(".dashboard-page");
        if (!page) return;
        let notice = document.querySelector("#dashboard-data-error");
        if (!notice) {
            notice = document.createElement("div");
            notice.id = "dashboard-data-error";
            notice.className = "login-message login-error";
            notice.setAttribute("role", "alert");
            page.prepend(notice);
        }
        const message = error?.code === "AUTHENTICATION_REQUIRED" ? "Your session is no longer active. Please sign in again." : "Dashboard data could not be loaded. Please refresh and try again.";
        notice.textContent = message;
    }

    renderLogoutState() {
        document.querySelectorAll("[data-auth-action='logout']").forEach(button => { button.disabled = false; });
    }

    bindEvents() {
        document.querySelectorAll("[data-auth-action='logout']").forEach(button => button.addEventListener("click", this.handleLogout));
    }

    async handleLogout(event) {
        event?.preventDefault();
        try {
            const user = auth.getCurrentUser();
            clearRoleCache(user?.id || user?.user_id || user?.userId || null);
            await auth.logout({ remote: true, reason: "user" });
            navigation.toLogin(null, { replace: true });
        } catch (error) {
            console.error("[DashboardPageController] Logout failed:", error);
        }
    }

    destroy() {
        document?.querySelectorAll("[data-auth-action='logout']").forEach(button => button.removeEventListener("click", this.handleLogout));
        this.initialised = false;
        this.loading = false;
        this.data = null;
    }
}

export const dashboardPageController = new DashboardPageController();
export { DashboardPageController };
export default dashboardPageController;
