import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";

const FUNCTION_URL = `${authConfig.supabase.url}/functions/v1/admin-github-config`;

class AdminGithubIntegrationService {
    constructor() { this.form = null; this.status = null; this.message = null; this.saveButton = null; this.testButton = null; this.bound = false; }
    async initialise() {
        this.form = document.querySelector("#github-integration-form"); this.status = document.querySelector("#github-integration-status"); this.message = document.querySelector("#github-integration-message"); this.saveButton = document.querySelector("#github-integration-save"); this.testButton = document.querySelector("#github-integration-test");
        if (!this.form) return this;
        await auth.initialise(); if (!auth.isAuthenticated()) return this;
        if (!this.bound) this.bindEvents(); await this.refresh(); return this;
    }
    bindEvents() {
        this.bound = true;
        this.form.addEventListener("submit", event => { event.preventDefault(); void this.save(); });
        this.testButton?.addEventListener("click", () => void this.test());
    }
    async request(method = "GET", body = null) {
        const token = auth.getToken(); if (!token) throw new Error("Administrator access token is missing.");
        let response;
        try {
            response = await fetch(FUNCTION_URL, { method, headers: { Accept: "application/json", "Content-Type": "application/json", apikey: authConfig.supabase.publishableKey, Authorization: `Bearer ${token}` }, ...(body ? { body: JSON.stringify(body) } : {}) });
        } catch (error) { throw new Error(`GitHub integration service is unreachable. Check that the Supabase Edge Function is deployed. ${error?.message || ""}`.trim()); }
        const raw = await response.text(); let data = {}; try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
        if (!response.ok) throw new Error(data?.error || `GitHub integration request failed (${response.status}).`); return data;
    }
    async refresh() { try { const data = await this.request("GET"); const repository = this.form.elements.repository; if (repository && data.repository) repository.value = data.repository; this.renderStatus(data); } catch (error) { this.renderMessage(error.message, true); } }
    async save() {
        const token = this.form.elements.token?.value?.trim(); const repository = this.form.elements.repository?.value?.trim();
        if (!token) { this.renderMessage("Enter the GitHub token before saving.", true); return; }
        this.setBusy(true, "Saving securely…");
        try { const data = await this.request("POST", { action: "save", token, repository }); this.form.elements.token.value = ""; this.renderStatus({ configured: true, repository: data.repository, configured_at: new Date().toISOString(), last_test_status: null, last_tested_at: null }); this.renderMessage("GitHub token saved securely in Supabase Vault. The token is not stored in browser storage or source code."); }
        catch (error) { this.renderMessage(error.message, true); } finally { this.setBusy(false); }
    }
    async test() {
        this.setBusy(true, "Testing GitHub connection…");
        try { const data = await this.request("POST", { action: "test" }); this.renderMessage(data.message, !data.success); await this.refresh(); }
        catch (error) { this.renderMessage(error.message, true); } finally { this.setBusy(false); }
    }
    renderStatus(data = {}) { if (!this.status) return; const state = data.last_test_status === "PASS" ? "Connected" : data.configured ? "Configured · Not tested" : "Not configured"; const tested = data.last_tested_at ? new Date(data.last_tested_at).toLocaleString("en-ZA") : "Never"; this.status.innerHTML = `<strong>${state}</strong><span>Repository: ${this.escape(data.repository || "maliq273/isaacs-and-partners-website")}</span><span>Last test: ${this.escape(tested)}</span>`; }
    renderMessage(message, isError = false) { if (!this.message) return; this.message.hidden = !message; this.message.textContent = message || ""; this.message.className = `login-message ${isError ? "login-error" : "login-success"}`; }
    setBusy(busy, message = "") { if (this.saveButton) this.saveButton.disabled = busy; if (this.testButton) this.testButton.disabled = busy; if (message) this.renderMessage(message); }
    escape(value) { return String(value ?? "").replace(/[&<>\"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[char])); }
}
export default new AdminGithubIntegrationService();
