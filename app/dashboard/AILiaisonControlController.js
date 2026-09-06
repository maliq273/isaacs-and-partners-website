import aiLiaisonControl from "./AILiaisonControlService.js";

class AILiaisonControlController {
    constructor() { this.root = null; this.profile = null; this.rows = []; }

    async initialise() {
        this.root = document.querySelector("[data-ai-intervention-console]"); if (!this.root) return this;
        try {
            this.profile = await aiLiaisonControl.getCurrentProfile();
            const role = String(this.profile?.role || "").toUpperCase();
            if (!["STAFF","SUPER_ADMIN"].includes(role) || this.profile?.is_active === false) { this.root.hidden = true; return this; }
            await this.refresh();
            this.root.addEventListener("click", event => this.handleClick(event));
        } catch (error) { this.renderError(error?.message || "Unable to load AI intervention console."); }
        return this;
    }

    async refresh() { this.rows = await aiLiaisonControl.listInterventions(); this.render(); }

    render() {
        const list = this.root.querySelector("[data-ai-intervention-list]"); if (!list) return;
        list.replaceChildren();
        if (!this.rows.length) { this.empty(list, "No AI interventions are currently waiting for human review."); return; }
        this.rows.forEach(row => {
            const card = document.createElement("article"); card.className = "ai-intervention-card";
            const header = document.createElement("header"); header.className = "ai-intervention-card__header";
            const title = document.createElement("div"); const strong = document.createElement("strong"); strong.textContent = row.question || row.reason || "AI intervention"; const meta = document.createElement("span"); meta.textContent = `${row.status} · ${row.priority} · ${this.format(row.created_at)}`; title.append(strong, meta);
            const badge = document.createElement("span"); badge.className = "control-plane-badge"; badge.textContent = row.super_admin_required ? "Super Admin oversight" : "Staff review"; header.append(title, badge); card.appendChild(header);
            const reason = document.createElement("p"); reason.textContent = row.reason || "AI requested human review."; card.appendChild(reason);
            const response = document.createElement("textarea"); response.rows = 3; response.placeholder = "Authorised response..."; response.dataset.responseFor = row.id; card.appendChild(response);
            const actions = document.createElement("div"); actions.className = "form-actions";
            if (!row.assigned_staff_id && String(this.profile?.role).toUpperCase() === "STAFF") actions.append(this.button("Assign to me", "assign", row.id));
            if (String(this.profile?.role).toUpperCase() === "SUPER_ADMIN" && !row.assigned_staff_id) actions.append(this.button("Assign to me", "assign", row.id));
            if (["PENDING","ASSIGNED","SUPER_ADMIN_REVIEW"].includes(String(row.status).toUpperCase())) actions.append(this.button("Respond", "respond", row.id));
            if (["STAFF_RESPONDED","ANSWERED","SUPER_ADMIN_REVIEW"].includes(String(row.status).toUpperCase())) actions.append(this.button("Relay to client", "relay", row.id));
            card.appendChild(actions); list.appendChild(card);
        });
    }

    async handleClick(event) {
        const button = event.target.closest("button[data-ai-action]"); if (!button) return;
        const id = button.dataset.id; const action = button.dataset.aiAction; const textarea = this.root.querySelector(`textarea[data-response-for="${CSS.escape(id)}"]`); const text = String(textarea?.value || "").trim();
        button.disabled = true;
        try {
            if (action === "assign") await aiLiaisonControl.assign(id, this.profile.id);
            if (action === "respond") { if (!text) throw new Error("Enter a response first."); const isAdmin = String(this.profile.role).toUpperCase() === "SUPER_ADMIN"; const result = isAdmin ? await aiLiaisonControl.superAdminRespond(id, text, false) : await aiLiaisonControl.staffRespond(id, text, false); await aiLiaisonControl.appendMessage(result.conversation_id, isAdmin ? "SUPER_ADMIN" : "STAFF", text); }
            if (action === "relay") { if (!text) throw new Error("Enter the client message first."); const row = this.rows.find(item => item.id === id); if (!row) throw new Error("Intervention not found."); await aiLiaisonControl.appendMessage(row.conversation_id, String(this.profile.role).toUpperCase() === "SUPER_ADMIN" ? "SUPER_ADMIN" : "STAFF", text); await aiLiaisonControl.relay(id, text); }
            await this.refresh();
        } catch (error) { this.renderError(error?.message || "AI intervention action failed."); }
        finally { button.disabled = false; }
    }

    button(label, action, id) { const button = document.createElement("button"); button.type = "button"; button.className = "ip-button ip-button--secondary"; button.dataset.aiAction = action; button.dataset.id = id; button.textContent = label; return button; }
    empty(container, text) { const p = document.createElement("p"); p.className = "empty-state"; p.textContent = text; container.appendChild(p); }
    renderError(text) { const element = this.root.querySelector("[data-ai-intervention-error]"); if (element) { element.hidden = false; element.textContent = text; } }
    format(value) { if (!value) return ""; const d = new Date(value); return Number.isNaN(d.getTime()) ? "" : new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(d); }
}

const controller = new AILiaisonControlController();
if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", () => controller.initialise().catch(console.error));
export { AILiaisonControlController };
export default controller;
