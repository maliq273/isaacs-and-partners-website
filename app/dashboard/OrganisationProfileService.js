import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";

const REST = `${authConfig.supabase.url}/rest/v1`;
const STORAGE = `${authConfig.supabase.url}/storage/v1/object/organisation-documents`;
const DEFAULTS = {
    legal_name: "Isaacs & Partners",
    trading_name: "",
    entity_type: "Private Company",
    country: "South Africa",
    default_currency: "ZAR",
    default_vat_rate: 15,
    quote_prefix: "QUO-",
    invoice_prefix: "INV-",
    receipt_prefix: "REC-",
    credit_note_prefix: "CN-",
    debit_note_prefix: "DN-",
    quote_validity_days: 7,
    vat_registered: false,
    paye_registered: false,
    uif_registered: false,
    sdl_registered: false,
    is_active: true
};

const CATEGORIES = {
    BUSINESS_OPERATION_MANUAL: ["Business Operation Manual", "STAFF"],
    CONFIDENTIALITY_NDA_NON_SOLICITATION: ["Confidentiality / NDA / Non-Solicitation", "ALL"],
    DEPOSIT_RETAINER_REPATRIATION_LIABILITY: ["Deposit, Retainer & Repatriation Liability", "CLIENT_ALL"],
    EMPLOYER_UNDERTAKINGS: ["Employer Undertakings", "BUSINESS"],
    INTERNAL_REVENUE_ALLOCATION: ["Internal Revenue Allocation", "STAFF"],
    MANDATE_AND_FEE: ["Mandate & Fee Agreement", "CLIENT_ALL"],
    MATTER_OPENING_CLIENT_ALLOCATION: ["Matter Opening & Client Allocation Agreements", "ALL"],
    TERMS_OF_SERVICE: ["Terms of Service", "CLIENT_ALL"],
    OTHER: ["Other Core Business Document", "ALL"]
};

const esc = value => String(value ?? "").replace(/[&<>\"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[c]));

class OrganisationProfileService {
    constructor() { this.profile = null; this.documents = []; this.bound = false; }
    token() { const t = auth.getToken(); if (!t) throw new Error("Your session has expired. Please sign in again."); return t; }
    async request(path, options = {}) {
        const response = await fetch(`${REST}/${path}`, { ...options, headers: { Accept: "application/json", apikey: authConfig.supabase.publishableKey, Authorization: `Bearer ${this.token()}`, "Content-Type": "application/json", Prefer: "return=representation", ...(options.headers || {}) } });
        const raw = await response.text(); let data = null; try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
        if (!response.ok) throw new Error(data?.message || data?.hint || data?.details || String(data || `Request failed (${response.status}).`));
        return data;
    }
    async initialise() {
        await auth.initialise();
        if (!auth.isAuthenticated()) return this;
        this.bind();
        await this.load();
        return this;
    }
    bind() {
        if (this.bound) return;
        this.bound = true;
        document.querySelector("#organisation-profile-form")?.addEventListener("submit", e => { e.preventDefault(); void this.saveProfile(); });
        document.querySelector("#organisation-document-form")?.addEventListener("submit", e => { e.preventDefault(); void this.uploadDocument(); });
        document.querySelector("#organisation-refresh")?.addEventListener("click", () => void this.load());
        document.querySelector("#organisation-document-list")?.addEventListener("click", e => {
            const button = e.target.closest("[data-document-action]"); if (!button) return;
            if (button.dataset.documentAction === "route") void this.routeDocument(button.dataset.id);
        });
    }
    async load() {
        try {
            const [profiles, documents] = await Promise.all([
                this.request("organisation_profiles?select=*&is_active=eq.true&limit=1"),
                this.request("organisation_documents?select=*&order=created_at.desc")
            ]);
            this.profile = Array.isArray(profiles) && profiles[0] ? profiles[0] : { ...DEFAULTS };
            this.documents = Array.isArray(documents) ? documents : [];
            this.renderProfile(); this.renderDocuments(); this.renderStatus();
        } catch (error) { this.message(error.message, true); }
    }
    renderProfile() {
        const form = document.querySelector("#organisation-profile-form"); if (!form) return;
        const p = { ...DEFAULTS, ...(this.profile || {}) };
        Object.entries(p).forEach(([key, value]) => { const el = form.elements[key]; if (!el) return; if (el.type === "checkbox") el.checked = Boolean(value); else el.value = value ?? ""; });
    }
    async saveProfile() {
        const form = document.querySelector("#organisation-profile-form"); const fd = new FormData(form); const payload = {};
        for (const [key, value] of fd.entries()) { if (form.elements[key]?.type === "checkbox") continue; payload[key] = String(value).trim() === "" ? null : value; }
        ["vat_registered","paye_registered","uif_registered","sdl_registered","is_active"].forEach(key => { payload[key] = Boolean(form.elements[key]?.checked); });
        ["default_vat_rate"].forEach(key => { payload[key] = Number(form.elements[key]?.value || 0); });
        payload.quote_validity_days = Number(form.elements.quote_validity_days?.value || 7);
        try {
            const existing = this.profile?.id;
            if (existing) await this.request(`organisation_profiles?id=eq.${encodeURIComponent(existing)}`, { method: "PATCH", body: JSON.stringify({ ...payload, updated_at: new Date().toISOString() }) });
            else await this.request("organisation_profiles", { method: "POST", body: JSON.stringify({ ...payload, created_by: auth.getCurrentUser().id }) });
            await this.load(); this.message("Organisation master record saved. Quotes and invoices can use this record as their issuer source.");
        } catch (error) { this.message(error.message, true); }
    }
    async uploadDocument() {
        const form = document.querySelector("#organisation-document-form"); const file = form.elements.file.files?.[0];
        if (!file) return this.message("Select a policy, agreement, manual or terms document first.", true);
        if (!this.profile?.id) return this.message("Save the active organisation profile before uploading core business documents.", true);
        if (file.size > 25 * 1024 * 1024) return this.message("Documents are limited to 25 MB.", true);
        const category = form.elements.category.value; const [label, defaultAudience] = CATEGORIES[category] || CATEGORIES.OTHER;
        const title = form.elements.title.value.trim() || label;
        const audience = form.elements.audience.value || defaultAudience;
        const documentId = crypto.randomUUID();
        const path = `${this.profile.id}/${documentId}/${file.name.replace(/[^A-Za-z0-9_.-]/g, "_")}`;
        try {
            this.setBusy(true, "Uploading and indexing document…");
            const storageResponse = await fetch(`${STORAGE}/${encodeURIComponent(path)}`, { method: "POST", headers: { apikey: authConfig.supabase.publishableKey, Authorization: `Bearer ${this.token()}`, "x-upsert": "false", "Content-Type": file.type || "application/octet-stream" }, body: file });
            if (!storageResponse.ok) { const text = await storageResponse.text(); throw new Error(text || `Storage upload failed (${storageResponse.status}).`); }
            let extractedText = null; let extractionStatus = "EXTRACTION_PENDING"; let extractionError = null;
            if (/^(text\/|application\/json$|application\/xml$)/i.test(file.type) || /\.(txt|md|csv|json|xml|html?)$/i.test(file.name)) {
                extractedText = await file.text(); extractionStatus = "EXTRACTED";
            } else if (/\.pdf$/i.test(file.name) || /\.docx?$/i.test(file.name)) {
                extractionError = "Binary document stored securely. Text extraction is queued for the document ingestion engine.";
            }
            await this.request("organisation_documents", { method: "POST", body: JSON.stringify({ id: documentId, organisation_profile_id: this.profile.id, title, category, audience, description: form.elements.description.value.trim() || null, file_name: file.name, mime_type: file.type || null, file_size: file.size, storage_path: path, extracted_text: extractedText, extraction_status: extractionStatus, extraction_error: extractionError, is_terms_of_service: form.elements.is_terms_of_service.checked, version: form.elements.version.value.trim() || "1.0", effective_from: form.elements.effective_from.value || new Date().toISOString().slice(0, 10), created_by: auth.getCurrentUser().id }) });
            await this.request(`rpc/organisation_route_document`, { method: "POST", body: JSON.stringify({ p_document_id: documentId }) });
            form.reset(); await this.load(); this.message(extractionStatus === "EXTRACTED" ? "Document uploaded, read and routed to the applicable audience." : "Document uploaded and securely stored. Binary text extraction is queued; its routing audience has been recorded.");
        } catch (error) { this.message(error.message, true); } finally { this.setBusy(false); }
    }
    async routeDocument(id) { try { const data = await this.request("rpc/organisation_route_document", { method: "POST", body: JSON.stringify({ p_document_id: id }) }); this.message(`Document routing completed. ${Number(data || 0)} new recipient assignments created.`); } catch (error) { this.message(error.message, true); } }
    renderDocuments() {
        const host = document.querySelector("#organisation-document-list"); if (!host) return;
        host.innerHTML = this.documents.length ? this.documents.map(d => `<article class="document-card"><div><strong>${esc(d.title)}</strong><span>${esc(CATEGORIES[d.category]?.[0] || d.category)} · ${esc(d.audience)} · v${esc(d.version)}</span><span>Extraction: ${esc(d.extraction_status)} · ${d.is_terms_of_service ? "Terms of Service" : "Core policy"}</span></div><button type="button" class="btn btn-small" data-document-action="route" data-id="${esc(d.id)}">Re-route</button></article>`).join("") : `<div class="empty-state">No organisation documents uploaded yet.</div>`;
    }
    renderStatus() { const p = this.profile; const host = document.querySelector("#organisation-profile-status"); if (!host) return; const ready = p && p.legal_name && p.registered_address && p.email; host.innerHTML = `<strong>${ready ? "Master record ready" : "Master record incomplete"}</strong><span>${esc(p?.legal_name || "No active organisation profile")}</span><span>${this.documents.length} core documents indexed</span>`; }
    message(text, error = false) { const el = document.querySelector("#organisation-message"); if (!el) return; el.hidden = !text; el.textContent = text || ""; el.className = `login-message ${error ? "login-error" : "login-success"}`; }
    setBusy(busy, text = "") { document.querySelectorAll("#organisation-profile-form button,#organisation-document-form button").forEach(b => b.disabled = busy); if (text) this.message(text); }
}

export { CATEGORIES };
export default new OrganisationProfileService();
