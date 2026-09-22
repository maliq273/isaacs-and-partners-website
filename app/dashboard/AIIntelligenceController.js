import auth from "../auth/AuthService.js";
import adminDashboardData from "./AdminDashboardDataService.js";
import { analysisEngine } from "../ai/AnalysisEngine.js";

class AIIntelligenceController {
    constructor() {
        this.data = null;
        this.results = [];
        this.running = false;
    }

    async initialise() {
        await auth.initialise();
        if (!auth.isAuthenticated()) return this;

        const user = auth.getCurrentUser();
        const role = String(user?.role || "").toUpperCase();
        if (role && role !== "SUPER_ADMIN") return this;

        this.bind();
        await this.load();
        return this;
    }

    bind() {
        const button = document.querySelector("#run-ai-analysis");
        if (button && !button.dataset.bound) {
            button.dataset.bound = "true";
            button.addEventListener("click", () => this.run());
        }
    }

    async load() {
        try {
            this.data = await adminDashboardData.getDashboardSummary("SUPER_ADMIN");
            this.renderBase();
        } catch (error) {
            console.error("[AI Intelligence] Load failed:", error);
            this.renderError(error);
        }
    }

    async run() {
        if (this.running) return;

        const button = document.querySelector("#run-ai-analysis");
        this.running = true;
        if (button) {
            button.disabled = true;
            button.textContent = "Analysing…";
        }

        try {
            if (!this.data) {
                this.data = await adminDashboardData.getDashboardSummary("SUPER_ADMIN");
            }

            analysisEngine.initialise();

            const matters = Array.isArray(this.data?.matters) ? this.data.matters : [];
            this.results = [];

            if (!matters.length) {
                this.renderResults();
                return;
            }

            for (const matter of matters) {
                const result = await analysisEngine.analyseCase({
                    matterId: matter.id,
                    referenceNumber: matter.reference_number,
                    title: matter.title,
                    service: matter.service_type,
                    department: matter.department,
                    description: matter.description,
                    status: matter.status,
                    priority: matter.priority,
                    portalRequestStatus: matter.portal_request_status,
                    documents: (this.data.documents || []).filter(d => String(d.matter_id) === String(matter.id))
                }, {
                    continueOnError: true,
                    emitEvents: true,
                    updateState: true
                });

                this.results.push({
                    matter,
                    result
                });
            }

            this.renderResults();
        } catch (error) {
            console.error("[AI Intelligence] Analysis failed:", error);
            this.renderError(error);
        } finally {
            this.running = false;
            if (button) {
                button.disabled = false;
                button.textContent = "Run Analysis";
            }
        }
    }

    renderBase() {
        const matters = this.data?.matters || [];
        const documents = this.data?.documents || [];

        this.setText("#cases-analysed", "0");
        this.setText("#high-risk-matters", "0");
        this.setText("#pending-documents", String(documents.filter(d => ["OUTSTANDING", "PENDING", "REJECTED", "UNDER_REVIEW"].includes(String(d.status || "").toUpperCase())).length));
        this.setText("#ai-recommendations", "0");

        const body = document.querySelector("#ai-matters-table");
        if (body) {
            body.innerHTML = matters.length
                ? matters.slice(0, 25).map(m => `
                    <tr>
                        <td>${this.escape(m.reference_number || m.title || m.id)}</td>
                        <td>${this.escape(m.individual_user_id || m.business_id || "—")}</td>
                        <td>${this.escape(m.service_type || "—")}</td>
                        <td>Not analysed</td>
                        <td>—</td>
                        <td>—</td>
                    </tr>`).join("")
                : "<tr><td colspan=\"6\">No matters available for analysis.</td></tr>";
        }
    }

    renderResults() {
        const rows = this.results || [];
        const highRisk = rows.filter(x => String(x.result?.risk?.riskLevel || "").toUpperCase() === "HIGH").length;
        const recommendations = rows.reduce((count, x) => {
            const value = x.result?.recommendations;
            if (Array.isArray(value)) return count + value.length;
            if (value && typeof value === "object") return count + (Array.isArray(value.items) ? value.items.length : 1);
            return count;
        }, 0);

        this.setText("#cases-analysed", String(rows.length));
        this.setText("#high-risk-matters", String(highRisk));
        this.setText("#ai-recommendations", String(recommendations));

        const body = document.querySelector("#ai-matters-table");
        if (body) {
            body.innerHTML = rows.length
                ? rows.map(x => {
                    const risk = x.result?.risk?.riskLevel || "LOW";
                    const completed = x.result?.completedModules?.length || 0;
                    const total = x.result?.completedModules?.length || 0;
                    return `
                        <tr>
                            <td>${this.escape(x.matter.reference_number || x.matter.title || x.matter.id)}</td>
                            <td>${this.escape(x.matter.individual_user_id || x.matter.business_id || "—")}</td>
                            <td>${this.escape(x.matter.service_type || "—")}</td>
                            <td>${this.escape(risk)}</td>
                            <td>${completed ? Math.round((completed / Math.max(total, 1)) * 100) + "%" : "—"}</td>
                            <td>${this.escape(x.result.completedAt || "—")}</td>
                        </tr>`;
                }).join("")
                : "<tr><td colspan=\"6\">No matters available for analysis.</td></tr>";
        }

        const activity = document.querySelector("#ai-activity");
        if (activity) {
            activity.innerHTML = rows.length
                ? rows.slice(0, 10).map(x => `
                    <div class="activity-row">
                        <strong>${this.escape(x.matter.reference_number || x.matter.title || x.matter.id)}</strong>
                        <span>Analysis completed · ${this.escape(x.result.status || "completed")}</span>
                    </div>`).join("")
                : "<div class=\"empty-state\">No analysis executed.</div>";
        }

        const rec = document.querySelector("#recommendations-list");
        if (rec) {
            const items = [];
            rows.forEach(x => {
                const value = x.result?.recommendations;
                if (Array.isArray(value)) value.forEach(v => items.push(v));
                else if (value?.items && Array.isArray(value.items)) value.items.forEach(v => items.push(v));
            });
            rec.innerHTML = items.length
                ? items.slice(0, 12).map(v => `<div class="admin-list-row"><div><strong>${this.escape(typeof v === "string" ? v : v.title || v.action || "Recommendation")}</strong></div></div>`).join("")
                : "<div class=\"empty-state\">No recommendations generated.</div>";
        }

        const eligibility = document.querySelector("#eligibility-summary");
        if (eligibility) {
            const eligible = rows.filter(x => x.result?.eligibility).length;
            eligibility.innerHTML = `<div class="admin-list-row"><strong>${eligible}</strong><span>matter eligibility analyses completed</span></div>`;
        }
    }

    renderError(error) {
        const body = document.querySelector("#ai-matters-table");
        if (body) body.innerHTML = `<tr><td colspan="6">AI analysis could not be completed: ${this.escape(error?.message || "Unknown error.")}</td></tr>`;
    }

    setText(selector, value) {
        const node = document.querySelector(selector);
        if (node) node.textContent = String(value);
    }

    escape(value) {
        return String(value ?? "").replace(/[&<>"']/g, c => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[c]));
    }
}

const controller = new AIIntelligenceController();
if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => controller.initialise().catch(console.error));
}

export { AIIntelligenceController };
export default controller;
