import WhatsAppAgent from "../agents/WhatsAppAgent.js";
import publicLeadResponseGenerator from "../agents/PublicLeadResponseGenerator.js";
import { PUBLIC_SERVICE_DIRECTORY } from "./PublicServiceDirectory.js";

const STORAGE_KEY = "ip_public_ai_lead_session";
const MAX_REMEMBERED_MESSAGES = 30;

function correctCommonWords(text) {
    const corrections = [["ccm", "ccma"], ["cma", "ccma"], ["ccmaa", "ccma"], ["retrenchmant", "retrenchment"], ["disciplnary", "disciplinary"], ["disciplinery", "disciplinary"], ["grievnce", "grievance"], ["employement", "employment"], ["immigartion", "immigration"], ["citizanship", "citizenship"], ["complaince", "compliance"], ["compilance", "compliance"], ["notery", "notary"], ["affidavid", "affidavit"]];
    let corrected = String(text || "");
    for (const [from, to] of corrections) corrected = corrected.replace(new RegExp(`\\b${from}\\b`, "gi"), to);
    return corrected;
}

class PublicLeadLiaison {
    constructor() {
        this.agent = new WhatsAppAgent({ mode: "PUBLIC_LEAD", responseGenerator: publicLeadResponseGenerator });
        this.context = null;
        this.serviceName = null;
        this.serviceId = null;
        this.opened = false;
        this.busy = false;
    }

    initialise() {
        if (!document.body || document.querySelector("[data-public-ai-liaison]")) return;
        this.render();
        this.restoreSession();
        this.bind();
        window.setTimeout(() => this.open("greeting"), 700);
    }

    render() {
        const root = document.createElement("section");
        root.className = "public-ai-liaison";
        root.dataset.publicAiLiaison = "true";
        root.setAttribute("aria-label", "Isaacs & Partners AI Liaison");
        root.innerHTML = `
            <button class="public-ai-liaison__launcher" type="button" data-ai-launcher aria-label="Open AI Liaison" aria-expanded="false">
                <span class="public-ai-liaison__launcher-lawyer" aria-hidden="true"><i class="fa-solid fa-user-tie"></i><b>👋</b></span>
                <span class="public-ai-liaison__launcher-icon"><i class="fa-solid fa-comments"></i></span>
                <span class="public-ai-liaison__launcher-copy"><strong>AI Liaison</strong><small>How can we assist?</small></span>
                <span class="public-ai-liaison__pulse" aria-hidden="true"></span>
            </button>
            <div class="public-ai-liaison__panel" data-ai-panel hidden>
                <header class="public-ai-liaison__header">
                    <div class="public-ai-liaison__identity"><span class="public-ai-liaison__avatar"><i class="fa-solid fa-scale-balanced"></i></span><div><strong>Isaacs &amp; Partners</strong><span>AI Liaison</span></div></div>
                    <div class="public-ai-liaison__controls"><button type="button" class="public-ai-liaison__minimise" data-ai-minimise aria-label="Minimise">−</button><button type="button" class="public-ai-liaison__close" data-ai-close aria-label="Close">&times;</button></div>
                </header>
                <div class="public-ai-liaison__service-selector">
                    <label for="public-ai-category">Choose one of our 4 main categories</label>
                    <select id="public-ai-category" data-ai-category><option value="">Select category</option>${PUBLIC_SERVICE_DIRECTORY.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}</select>
                    <select data-ai-service disabled aria-label="Choose a specific service"><option value="">Choose sub-category / service</option></select>
                </div>
                <div class="public-ai-liaison__body" data-ai-list aria-live="polite"></div>
                <div class="public-ai-liaison__cta" data-ai-cta hidden><strong>Ready to take the next step?</strong><span>Create your account so Isaacs &amp; Partners can capture the enquiry and move it toward the appropriate consultation or quotation.</span><div class="public-ai-liaison__cta-actions"><a href="/signup.html?type=individual&source=website-ai" data-ai-signup class="gold-btn">Create Client Account</a><a href="/signup.html?type=business&source=website-ai" data-ai-business class="outline-btn">Business Account</a></div></div>
                <form class="public-ai-liaison__composer" data-ai-form><label class="sr-only" for="public-ai-message">Ask the AI Liaison</label><textarea id="public-ai-message" rows="2" maxlength="3000" placeholder="Tell me what you need help with..." required></textarea><button type="submit" class="gold-btn" data-ai-send><i class="fa-solid fa-arrow-up"></i><span>Ask</span></button></form>
                <footer class="public-ai-liaison__footer"><span><i class="fa-solid fa-shield-halved"></i> General information only</span><span>AI uses the Isaacs &amp; Partners service structure.</span></footer>
            </div>`;
        document.body.appendChild(root);
        this.root = root; this.list = root.querySelector("[data-ai-list]"); this.panel = root.querySelector("[data-ai-panel]"); this.form = root.querySelector("[data-ai-form]"); this.input = root.querySelector("textarea"); this.sendButton = root.querySelector("[data-ai-send]"); this.cta = root.querySelector("[data-ai-cta]"); this.categorySelect = root.querySelector("[data-ai-category]"); this.serviceSelect = root.querySelector("[data-ai-service]");
    }

    bind() {
        this.root.querySelector("[data-ai-launcher]")?.addEventListener("click", () => this.toggle());
        this.root.querySelector("[data-ai-minimise]")?.addEventListener("click", () => this.minimise());
        this.root.querySelector("[data-ai-close]")?.addEventListener("click", () => this.close());
        this.form?.addEventListener("submit", event => this.send(event));
        this.categorySelect?.addEventListener("change", () => this.populateServices());
        this.serviceSelect?.addEventListener("change", () => this.selectServiceFromMenu());
    }

    open(reason = "manual") {
        if (!this.panel) return;
        this.opened = true; this.panel.hidden = false; this.root.classList.remove("is-minimised"); this.root.classList.add("is-open");
        this.root.querySelector("[data-ai-launcher]")?.setAttribute("aria-expanded", "true");
        if (reason === "greeting" && !this.list.children.length) this.appendMessage("AI", "Hi! Welcome to Isaacs & Partners. We have four main service categories: Immigration, HR & Industrial Relations, Business Compliance, and Legal Services. You can choose a category and sub-category above, or type what you need in your own words.");
        this.input?.focus();
    }

    close() {
        this.opened = false; this.panel.hidden = true; this.root.classList.remove("is-open", "is-minimised"); this.root.querySelector("[data-ai-launcher]")?.setAttribute("aria-expanded", "false");
    }

    minimise() {
        this.opened = false; this.panel.hidden = true; this.root.classList.remove("is-open"); this.root.classList.add("is-minimised"); this.root.querySelector("[data-ai-launcher]")?.setAttribute("aria-expanded", "false");
    }

    toggle() { this.opened ? this.close() : this.open(); }

    populateServices() {
        const category = PUBLIC_SERVICE_DIRECTORY.find(item => item.id === this.categorySelect.value);
        this.serviceSelect.innerHTML = `<option value="">Choose sub-category / service</option>`;
        this.serviceSelect.disabled = !category;
        category?.services.forEach(service => { const option = document.createElement("option"); option.value = service.id; option.textContent = service.name; this.serviceSelect.appendChild(option); });
    }

    selectServiceFromMenu() {
        const category = PUBLIC_SERVICE_DIRECTORY.find(item => item.id === this.categorySelect.value);
        const service = category?.services.find(item => item.id === this.serviceSelect.value);
        if (!service) return;
        this.serviceId = service.id; this.serviceName = service.name;
        this.showCta(); this.persistState();
        this.appendMessage("AI", `I have selected ${service.name} under ${category.name}. Tell me what has happened and what you need help with. I will use this service as the reference for the conversation.`);
    }

    restoreSelectedService() {
        for (const category of PUBLIC_SERVICE_DIRECTORY) {
            const service = category.services.find(item => item.id === this.serviceId);
            if (!service) continue;
            this.categorySelect.value = category.id; this.populateServices(); this.serviceSelect.value = service.id; return;
        }
    }

    restoreSession() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
            if (!saved) return;
            this.serviceId = saved.serviceId || null; this.serviceName = saved.serviceName || null; this.context = saved.context || null;
            (saved.messages || []).slice(-MAX_REMEMBERED_MESSAGES).forEach(message => this.appendMessage(message.sender, message.body, false));
            if (this.serviceId) this.restoreSelectedService(); if (this.serviceName) this.showCta();
        } catch { /* optional local memory */ }
    }

    persistState() {
        try {
            const messages = Array.from(this.list?.children || []).map(item => ({ sender: item.classList.contains("public-ai-liaison__message--client") ? "CLIENT" : "AI", body: item.querySelector("p")?.textContent || "" })).filter(item => item.body).slice(-MAX_REMEMBERED_MESSAGES);
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ serviceId: this.serviceId, serviceName: this.serviceName, context: this.context, messages, updatedAt: new Date().toISOString() }));
        } catch { /* optional local memory */ }
    }

    appendMessage(sender, body, persist = true) {
        if (!this.list || !body) return;
        const item = document.createElement("article"); const visualSender = sender === "CLIENT" ? "client" : String(sender).toLowerCase(); item.className = `public-ai-liaison__message public-ai-liaison__message--${visualSender}`;
        const label = document.createElement("strong"); label.textContent = sender === "AI" ? "AI Liaison" : "You"; const content = document.createElement("p"); content.textContent = body; item.append(label, content); this.list.appendChild(item); this.list.scrollTop = this.list.scrollHeight; if (persist) this.persistState();
    }

    async send(event) {
        event.preventDefault(); if (this.busy) return; const originalBody = String(this.input?.value || "").trim(); if (!originalBody) return;
        const body = correctCommonWords(originalBody); this.busy = true; this.sendButton.disabled = true; this.sendButton.querySelector("span").textContent = "..."; this.appendMessage("CLIENT", originalBody); if (body !== originalBody) this.appendMessage("AI", `I understood the wording as: “${body}”. I’ll use the closest service reference.`); this.input.value = "";
        try {
            const result = await this.agent.handleInbound({ chatId: `public-web:${this.getSessionId()}`, body, conversation: this.context });
            this.context = result.context || this.context; this.serviceId = result.servicePlan?.service?.id || this.serviceId; this.serviceName = result.servicePlan?.service?.name || this.serviceName;
            if (result.reply) this.appendMessage("AI", result.reply); if (this.serviceId || result.servicePlan?.service || result.lead?.readyForStaff) { this.showCta(); this.restoreSelectedService(); } this.persistState();
        } catch (error) { console.error("[PublicLeadLiaison]", error); this.appendMessage("AI", "I’m unable to complete that enquiry right now. Please create an account or use the consultation/contact options on this website so our team can assist you."); this.showCta(); }
        finally { this.busy = false; this.sendButton.disabled = false; this.sendButton.querySelector("span").textContent = "Ask"; }
    }

    showCta() {
        if (!this.cta) return; this.cta.hidden = false; const service = encodeURIComponent(this.serviceName || ""); this.root.querySelector("[data-ai-signup]")?.setAttribute("href", `/signup.html?type=individual&source=website-ai${service ? `&service=${service}` : ""}`); this.root.querySelector("[data-ai-business]")?.setAttribute("href", `/signup.html?type=business&source=website-ai${service ? `&service=${service}` : ""}`);
    }

    getSessionId() { try { let id = sessionStorage.getItem("ip_public_ai_session"); if (!id) { id = `lead-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; sessionStorage.setItem("ip_public_ai_session", id); } return id; } catch { return `lead-${Date.now()}`; } }
}

if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", () => new PublicLeadLiaison().initialise());
