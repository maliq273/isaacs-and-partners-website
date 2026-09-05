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

const CATEGORY_ICONS = {
    immigration: "fa-passport",
    "hr-industrial-relations": "fa-people-group",
    "business-compliance": "fa-building-shield",
    legal: "fa-scale-balanced"
};

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
                <span class="public-ai-liaison__launcher-icon" aria-hidden="true"><i class="fa-solid fa-comments"></i><b>👋</b></span>
                <span class="public-ai-liaison__launcher-copy"><strong>AI Liaison</strong><small>Free 15-minute preliminary consultation</small></span>
                <span class="public-ai-liaison__pulse" aria-hidden="true"></span>
                <span class="public-ai-liaison__hint" aria-hidden="true">Need help? I’m here.</span>
            </button>
            <div class="public-ai-liaison__panel" data-ai-panel hidden>
                <header class="public-ai-liaison__header">
                    <div class="public-ai-liaison__identity"><span class="public-ai-liaison__avatar"><i class="fa-solid fa-scale-balanced"></i></span><div><strong>Isaacs &amp; Partners</strong><span>AI Liaison · Free 15 min</span></div></div>
                    <div class="public-ai-liaison__controls"><button type="button" class="public-ai-liaison__minimise" data-ai-minimise aria-label="Minimise">−</button><button type="button" class="public-ai-liaison__close" data-ai-close aria-label="Close">&times;</button></div>
                </header>
                <div class="public-ai-liaison__welcome" data-ai-welcome>
                    <div class="public-ai-liaison__welcome-avatar"><i class="fa-solid fa-scale-balanced"></i><b>👋</b></div>
                    <div class="public-ai-liaison__welcome-copy"><span>Welcome</span><h2>How can we help you today?</h2><p>I’m your AI Liaison. Start with one of our four main service areas and I’ll guide you through a free 15-minute preliminary consultation.</p></div>
                    <div class="public-ai-liaison__category-grid" data-ai-categories>
                        ${PUBLIC_SERVICE_DIRECTORY.map(category => `<button type="button" class="public-ai-liaison__category" data-category-id="${category.id}"><span><i class="fa-solid ${CATEGORY_ICONS[category.id] || "fa-circle-question"}"></i></span><strong>${category.name}</strong><small>${category.services.length} services</small></button>`).join("")}
                    </div>
                </div>
                <div class="public-ai-liaison__service-selector" data-ai-service-selector hidden>
                    <div class="public-ai-liaison__selector-heading"><div><label for="public-ai-category">Service area</label><strong data-ai-selected-category>Choose a category</strong></div><button type="button" data-ai-change-category>Change</button></div>
                    <select id="public-ai-category" data-ai-category aria-label="Choose service category"><option value="">Select category</option>${PUBLIC_SERVICE_DIRECTORY.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}</select>
                    <label class="sr-only" for="public-ai-service">Specific service</label>
                    <select id="public-ai-service" data-ai-service disabled><option value="">Choose a specific service</option></select>
                </div>
                <div class="public-ai-liaison__body" data-ai-list aria-live="polite"></div>
                <div class="public-ai-liaison__cta" data-ai-cta hidden><strong>Your free AI consultation is complete.</strong><span>Your enquiry is prepared. Create an account so Isaacs &amp; Partners can securely capture your details and move it toward the appropriate professional consultation or quotation.</span><div class="public-ai-liaison__cta-actions"><a href="/signup.html?type=individual&source=website-ai" data-ai-signup class="gold-btn">Create Client Account</a><a href="/signup.html?type=business&source=website-ai" data-ai-business class="outline-btn">Business Account</a></div></div>
                <form class="public-ai-liaison__composer" data-ai-form><label class="sr-only" for="public-ai-message">Ask the AI Liaison</label><textarea id="public-ai-message" rows="2" maxlength="3000" placeholder="Tell me what you need help with..." required></textarea><button type="submit" class="gold-btn" data-ai-send><i class="fa-solid fa-arrow-up"></i><span>Ask</span></button></form>
                <footer class="public-ai-liaison__footer"><span><i class="fa-solid fa-shield-halved"></i> General information only</span><span>AI uses the Isaacs &amp; Partners service structure.</span></footer>
            </div>`;
        document.body.appendChild(root);
        this.root = root;
        this.list = root.querySelector("[data-ai-list]");
        this.panel = root.querySelector("[data-ai-panel]");
        this.form = root.querySelector("[data-ai-form]");
        this.input = root.querySelector("textarea");
        this.sendButton = root.querySelector("[data-ai-send]");
        this.cta = root.querySelector("[data-ai-cta]");
        this.welcome = root.querySelector("[data-ai-welcome]");
        this.serviceSelector = root.querySelector("[data-ai-service-selector]");
        this.categoryGrid = root.querySelector("[data-ai-categories]");
        this.categorySelect = root.querySelector("[data-ai-category]");
        this.serviceSelect = root.querySelector("[data-ai-service]");
        this.selectedCategoryLabel = root.querySelector("[data-ai-selected-category]");
    }

    bind() {
        this.root.querySelector("[data-ai-launcher]")?.addEventListener("click", () => this.toggle());
        this.root.querySelector("[data-ai-minimise]")?.addEventListener("click", () => this.minimise());
        this.root.querySelector("[data-ai-close]")?.addEventListener("click", () => this.close());
        this.root.querySelector("[data-ai-change-category]")?.addEventListener("click", () => this.showCategoryPicker());
        this.categoryGrid?.addEventListener("click", event => {
            const button = event.target.closest("[data-category-id]");
            if (button) this.selectCategory(button.dataset.categoryId);
        });
        this.form?.addEventListener("submit", event => this.send(event));
        this.categorySelect?.addEventListener("change", () => this.populateServices());
        this.serviceSelect?.addEventListener("change", () => this.selectServiceFromMenu());
    }

    open(reason = "manual") {
        if (!this.panel) return;
        this.opened = true;
        this.panel.hidden = false;
        this.root.classList.remove("is-minimised");
        this.root.classList.add("is-open");
        this.root.querySelector("[data-ai-launcher]")?.setAttribute("aria-expanded", "true");
        if (reason === "greeting" && !this.list.children.length && !this.serviceId) {
            this.appendMessage("AI", "Hi! Welcome to Isaacs & Partners. I’m your AI Liaison. I can help you identify the right service and guide you through a free 15-minute preliminary consultation.");
        }
        this.input?.focus();
    }

    close() {
        this.opened = false;
        this.panel.hidden = true;
        this.root.classList.remove("is-open", "is-minimised");
        this.root.querySelector("[data-ai-launcher]")?.setAttribute("aria-expanded", "false");
    }

    minimise() {
        this.opened = false;
        this.panel.hidden = true;
        this.root.classList.remove("is-open");
        this.root.classList.add("is-minimised");
        this.root.querySelector("[data-ai-launcher]")?.setAttribute("aria-expanded", "false");
    }

    toggle() { this.opened ? this.close() : this.open(); }

    showCategoryPicker() {
        this.serviceSelector.hidden = true;
        this.welcome.hidden = false;
        this.categoryGrid?.querySelectorAll(".public-ai-liaison__category").forEach(button => button.classList.toggle("is-selected", button.dataset.categoryId === this.categorySelect.value));
    }

    selectCategory(categoryId) {
        const category = PUBLIC_SERVICE_DIRECTORY.find(item => item.id === categoryId);
        if (!category) return;
        this.categorySelect.value = category.id;
        this.populateServices();
        this.welcome.hidden = true;
        this.serviceSelector.hidden = false;
        this.selectedCategoryLabel.textContent = category.name;
        this.categoryGrid?.querySelectorAll(".public-ai-liaison__category").forEach(button => button.classList.toggle("is-selected", button.dataset.categoryId === category.id));
        this.serviceSelect.focus();
    }

    populateServices() {
        const category = PUBLIC_SERVICE_DIRECTORY.find(item => item.id === this.categorySelect.value);
        this.serviceSelect.innerHTML = `<option value="">Choose a specific service</option>`;
        this.serviceSelect.disabled = !category;
        category?.services.forEach(service => {
            const option = document.createElement("option");
            option.value = service.id;
            option.textContent = service.name;
            this.serviceSelect.appendChild(option);
        });
        if (category) this.selectedCategoryLabel.textContent = category.name;
    }

    selectServiceFromMenu() {
        const category = PUBLIC_SERVICE_DIRECTORY.find(item => item.id === this.categorySelect.value);
        const service = category?.services.find(item => item.id === this.serviceSelect.value);
        if (!service) return;
        this.serviceId = service.id;
        this.serviceName = service.name;
        this.context = this.context || {};
        this.context.publicLead = { stage: 0, qualified: false, answers: [] };
        this.persistState();
        this.appendMessage("AI", `I have selected ${service.name} under ${category.name}. Tell me what has happened and I’ll take you through the free 15-minute preliminary consultation.`);
        this.input?.focus();
    }

    restoreSelectedService() {
        for (const category of PUBLIC_SERVICE_DIRECTORY) {
            const service = category.services.find(item => item.id === this.serviceId);
            if (!service) continue;
            this.selectCategory(category.id);
            this.serviceSelect.value = service.id;
            return;
        }
    }

    restoreSession() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
            if (!saved) return;
            this.serviceId = saved.serviceId || null;
            this.serviceName = saved.serviceName || null;
            this.context = saved.context || null;
            (saved.messages || []).slice(-MAX_REMEMBERED_MESSAGES).forEach(message => this.appendMessage(message.sender, message.body, false));
            if (this.serviceId) this.restoreSelectedService();
            if (this.context?.publicLead?.qualified) this.showCta();
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
        const item = document.createElement("article");
        const visualSender = sender === "CLIENT" ? "client" : String(sender).toLowerCase();
        item.className = `public-ai-liaison__message public-ai-liaison__message--${visualSender}`;
        const label = document.createElement("strong");
        label.textContent = sender === "AI" ? "AI Liaison" : "You";
        const content = document.createElement("p");
        content.textContent = body;
        item.append(label, content);
        this.list.appendChild(item);
        this.list.scrollTop = this.list.scrollHeight;
        if (persist) this.persistState();
    }

    async send(event) {
        event.preventDefault();
        if (this.busy) return;
        const originalBody = String(this.input?.value || "").trim();
        if (!originalBody) return;
        const body = correctCommonWords(originalBody);
        this.busy = true;
        this.sendButton.disabled = true;
        this.sendButton.querySelector("span").textContent = "...";
        this.appendMessage("CLIENT", originalBody);
        if (body !== originalBody) this.appendMessage("AI", `I understood the wording as: “${body}”. I’ll use the closest service reference.`);
        this.input.value = "";
        try {
            const result = await this.agent.handleInbound({ chatId: `public-web:${this.getSessionId()}`, body, conversation: this.context });
            this.context = result.context || this.context;
            this.serviceId = result.servicePlan?.service?.id || this.serviceId;
            this.serviceName = result.servicePlan?.service?.name || this.serviceName;
            if (result.reply) this.appendMessage("AI", result.reply);
            if (result.context?.publicLead?.qualified) this.showCta();
            if (this.serviceId) this.restoreSelectedService();
            this.persistState();
        } catch (error) {
            console.error("[PublicLeadLiaison]", error);
            this.appendMessage("AI", "I’m unable to complete that enquiry right now. Please create an account or use the consultation/contact options on this website so our team can assist you.");
        } finally {
            this.busy = false;
            this.sendButton.disabled = false;
            this.sendButton.querySelector("span").textContent = "Ask";
        }
    }

    showCta() {
        if (!this.cta) return;
        this.cta.hidden = false;
        const service = encodeURIComponent(this.serviceName || "");
        this.root.querySelector("[data-ai-signup]")?.setAttribute("href", `/signup.html?type=individual&source=website-ai${service ? `&service=${service}` : ""}`);
        this.root.querySelector("[data-ai-business]")?.setAttribute("href", `/signup.html?type=business&source=website-ai${service ? `&service=${service}` : ""}`);
    }

    getSessionId() {
        try {
            let id = sessionStorage.getItem("ip_public_ai_session");
            if (!id) {
                id = `lead-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
                sessionStorage.setItem("ip_public_ai_session", id);
            }
            return id;
        } catch {
            return `lead-${Date.now()}`;
        }
    }
}

if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", () => new PublicLeadLiaison().initialise());
