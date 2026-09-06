import auth from "../auth/AuthService.js";
import authGuard from "../auth/AuthGuard.js";
import clientPortalAccess from "../services/ClientPortalAccessService.js";
import clientPortalData from "../services/ClientPortalDataService.js";

class ClientDashboardController {
    constructor() { this.root = null; this.snapshot = null; }

    async initialise() {
        this.root = document.querySelector(".client-portal");
        if (!this.root) return this;
        const access = await authGuard.requireAuthentication();
        if (!access?.allowed) return this;

        const user = auth.getCurrentUser() || {};
        const name = user.user_metadata?.first_name || user.first_name || "Client";
        const nameElement = this.root.querySelector("[data-client-name]");
        if (nameElement) nameElement.textContent = name;

        try {
            this.snapshot = await clientPortalData.getDashboard();
            this.render();
        } catch (error) {
            console.error("[ClientDashboardController]", error);
            this.renderError(error?.message || "Unable to load your client dashboard.");
        }
        return this;
    }

    render() {
        const s = this.snapshot || {};
        const matters = Array.isArray(s.matters) ? s.matters : [];
        const documents = Array.isArray(s.documents) ? s.documents : [];
        const appointments = Array.isArray(s.appointments) ? s.appointments : [];
        const notifications = Array.isArray(s.notifications) ? s.notifications : [];
        const invoices = Array.isArray(s.invoices) ? s.invoices : [];
        const activeMatters = matters.filter(m => !["CLOSED","COMPLETED","CANCELLED","ARCHIVED"].includes(String(m.status || "").toUpperCase())).length;
        const outstandingDocuments = documents.filter(d => d.required !== false && ["OUTSTANDING","REJECTED","UNDER_REVIEW"].includes(String(d.status || "").toUpperCase())).length;
        const unread = notifications.filter(n => !n.read_at && String(n.status || "").toUpperCase() !== "READ").length;
        const outstandingInvoices = invoices.filter(i => Number(i.authoritative_paid_amount || 0) < Number(i.amount || 0) && !["CANCELLED","PAID"].includes(String(i.status || "").toUpperCase())).length;

        this.setStat("active-matters", activeMatters);
        this.setStat("outstanding-documents", outstandingDocuments);
        this.setStat("appointments", appointments.length);
        this.setStat("messages", unread);
        this.renderMatters(matters);
        this.renderActions({ outstandingDocuments, outstandingInvoices, unread, accessStatus: s.access_status });
        this.renderActivity({ matters, documents, appointments, notifications });

        const messagesLink = this.root.querySelector("[data-client-messages-link]");
        if (messagesLink && String(s.access_status).toUpperCase() !== "APPROVED") messagesLink.setAttribute("aria-disabled", "true");
    }

    setStat(name, value) { const element = this.root.querySelector(`[data-stat="${name}"]`); if (element) element.textContent = String(value); }

    renderMatters(matters) {
        const container = this.root.querySelector("[data-matters-list]");
        if (!container) return;
        container.replaceChildren();
        if (!matters.length) { this.empty(container, "No matters are currently linked to your account."); return; }
        matters.slice(0, 8).forEach(matter => {
            const item = document.createElement("article"); item.className = "client-dashboard-item";
            const title = document.createElement("strong"); title.textContent = matter.title || matter.reference || matter.matter_number || `Matter ${String(matter.id || "").slice(0,8)}`;
            const meta = document.createElement("span"); meta.textContent = `${matter.service || matter.department || "Matter"} · ${matter.status || "ACTIVE"}`;
            item.append(title, meta); container.appendChild(item);
        });
    }

    renderActions({ outstandingDocuments, outstandingInvoices, unread, accessStatus }) {
        const container = this.root.querySelector("[data-action-required]");
        if (!container) return;
        container.replaceChildren();
        const actions = [];
        if (outstandingDocuments) actions.push(`${outstandingDocuments} document item${outstandingDocuments === 1 ? "" : "s"} require attention.`);
        if (outstandingInvoices) actions.push(`${outstandingInvoices} invoice${outstandingInvoices === 1 ? "" : "s"} have an outstanding balance.`);
        if (unread) actions.push(`${unread} unread communication${unread === 1 ? "" : "s"}.`);
        if (String(accessStatus).toUpperCase() !== "APPROVED") actions.push("AI Liaison and client messaging remain locked until portal approval.");
        if (!actions.length) { this.empty(container, "Nothing currently requires your attention."); return; }
        actions.forEach(text => { const p = document.createElement("p"); p.className = "client-dashboard-action"; p.textContent = text; container.appendChild(p); });
    }

    renderActivity({ matters, documents, appointments, notifications }) {
        const container = this.root.querySelector("[data-recent-activity]");
        if (!container) return;
        container.replaceChildren();
        const events = [];
        matters.slice(0, 5).forEach(m => events.push({ date: m.updated_at || m.created_at, text: `Matter updated: ${m.title || m.reference || m.matter_number || "matter"}` }));
        documents.slice(0, 5).forEach(d => events.push({ date: d.updated_at || d.created_at, text: `Document: ${d.name || d.document_type || "document"} · ${d.status || ""}` }));
        appointments.slice(0, 5).forEach(a => events.push({ date: a.starts_at, text: `Appointment: ${a.title || a.appointment_type || "appointment"}` }));
        notifications.slice(0, 5).forEach(n => events.push({ date: n.created_at, text: n.message || n.subject || "New notification" }));
        events.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
        if (!events.length) { this.empty(container, "No recent activity yet."); return; }
        events.slice(0, 10).forEach(event => { const item = document.createElement("article"); item.className = "client-dashboard-item"; const strong = document.createElement("strong"); strong.textContent = event.text; const time = document.createElement("time"); time.textContent = this.formatDate(event.date); item.append(strong, time); container.appendChild(item); });
    }

    renderError(message) {
        ["active-matters","outstanding-documents","appointments","messages"].forEach(key => this.setStat(key, "—"));
        const action = this.root.querySelector("[data-action-required]"); if (action) { action.replaceChildren(); this.empty(action, message); }
    }

    empty(container, message) { const p = document.createElement("p"); p.className = "ip-empty-state"; p.textContent = message; container.appendChild(p); }
    formatDate(value) { if (!value) return ""; const d = new Date(value); return Number.isNaN(d.getTime()) ? "" : new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(d); }
}

const controller = new ClientDashboardController();
if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", () => controller.initialise().catch(console.error));
export { ClientDashboardController };
export default controller;
