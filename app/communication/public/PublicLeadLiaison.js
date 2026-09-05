import WhatsAppAgent from "../agents/WhatsAppAgent.js";
import publicLeadResponseGenerator from "../agents/PublicLeadResponseGenerator.js";
import { PUBLIC_SERVICE_DIRECTORY } from "./PublicServiceDirectory.js";

const STORAGE_KEY = "ip_public_ai_liaison_session_v2";
const STORAGE_VERSION = 2;
const MAX_REMEMBERED_MESSAGES = 12;

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
        this.selectedCategoryId = null;
        this.opened = false;
        this.busy = false;
    }

    initialise() {
        if (!document.body || document.querySelector("[data-public-ai-liaison]")) return;
        this.render();
        this.restoreSession();
        this.bind();
        window.setTimeout(() => this.open(), 700);
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
                    <div class="public-ai-liaison__controls"><button type="button" class="public-ai-liaison__minimise" data-ai-minimise aria-label="Minimise AI Liaison">−</button><button type="button" class="public-ai-liaison__close" data-ai-close aria-label="Close AI Liaison">&times;</button></div>
                </header>
                <div class="public-ai-liaison__welcome" data-ai-welcome>
                    <div class="public-ai-liaison__welcome-avatar"><i class="fa-solid fa-scale-balanced"></i><b>👋</b></div>
                    <div class="public-ai-liaison__welcome-copy"><span>Welcome</span><h2>How can we help you today?</h2><p>Choose a service area, then select the service you need. I’ll guide you through a free 15-minute preliminary consultation.</p></div>
                    <div class="public-ai-liaison__category-grid" data-ai-categories>
                        ${PUBLIC_SERVICE_DIRECTORY.map(category => `<button type="button" class="public-ai-liaison__category" data-category-id="${category.id}" aria-expanded="false"><span><i class="fa-solid ${CATEGORY_ICONS[category.id] || "fa-circle-question"}"></i></span><strong>${category.name}</strong><small>${category.services.length} services</small><i class="public-ai-liaison__category-chevron fa-solid fa-chevron-right" aria-hidden="true"></i></button>`).join("")}
                    </div>
                </div>
                <div class="public-ai-liaison__service-selector" data-ai-service-selector hidden>
                    <div class="public-ai-liaison__selector-heading"><div><label>Service area</label><strong data-ai-selected-category>Choose a category</strong></div><button type="button" data-ai-change-category><i class="fa-solid fa-arrow-left"></i> Back</button></div>
                    <p class="public-ai-liaison__selector-help">Select one service to begin.</p>
                    <div class="public-ai-liaison__subcategory-list" data-ai-subcategories></div>
                </div>
                <div class="public-ai-liaison__selected-service" data-ai-selected-service hidden></div>
                <div class="public-ai-liaison__body" data-ai-list aria-live="polite"></div>
                <div class="public-ai-liaison__cta" data-ai-cta hidden><strong>Your preliminary consultation is complete.</strong><span>Your enquiry is ready for secure client onboarding and professional follow-up.</span><div class="public-ai-liaison__cta-actions"><a href="/signup.html?type=individual&source=website-ai" data-ai-signup class="gold-btn">Create Client Account</a><a href="/signup.html?type=business&source=website-ai" data-ai-business class="outline-btn">Business Account</a></div></div>
                <form class="public-ai-liaison__composer" data-ai-form><label class="sr-only" for="public-ai-message">Ask the AI Liaison</label><textarea id="public-ai-message" rows="1" maxlength="3000" placeholder="Tell me what you need help with..." required></textarea><button type="submit" class="gold-btn" data-ai-send><i class="fa-solid fa-arrow-up"></i><span>Ask</span></button></form>
                <footer class="public-ai-liaison__footer"><span><i class="fa-solid fa-shield-halved"></i> General information only</span><span>Isaacs &amp; Partners service structure</span></footer>
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
        this.subcategoryList = root.querySelector("[data-ai-subcategories]");
        this.selectedCategoryLabel = root.querySelector("[data-ai-selected-category]");
        this.selectedService = root.querySelector("[data-ai-selected-service]");
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
        this.subcategoryList?.addEventListener("click", event => {
            const button = event.target.closest("[data-service-id]");
            if (button) this.selectService(button.dataset.serviceId);
        });
        this.form?.addEventListener("submit", event => this.send(event));
        this.input?.addEventListener("input", () => this.autoSizeInput());
        this.input?.addEventListener("keydown", event => {
            if (event.key === "Enter" && !event.shiftKey && window.innerWidth > 600) {
                event.preventDefault();
                this.form?.requestSubmit();
            }
        });
    }

    autoSizeInput() {
        if (!this.input) return;
        this.input.style.height = "auto";
        this.input.style.height = `${Math.min(this.input.scrollHeight, 96)}px`;
    }

    open() {
        if (!this.panel) return;
        this.opened = true;
        this.panel.hidden = false;
        this.root.classList.remove("is-minimised");
        this.root.classList.add("is-open");
        this.root.querySelector("[data-ai-launcher]")?.setAttribute("aria-expanded", "true");
        if (!this.serviceId) this.showCategoryPicker();
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

    resetConversation() {
        this.serviceId = null;
        this.serviceName = null;
        this.selectedCategoryId = null;
        this.context = null;
        this.list?.replaceChildren();
        if (this.cta) this.cta.hidden = true;
        if (this.selectedService) {
            this.selectedService.hidden = true;
            this.selectedService.replaceChildren();
        }
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* optional local memory */ }
    }

    showCategoryPicker() {
        this.resetConversation();
        this.serviceSelector.hidden = true;
        this.welcome.hidden = false;
        this.categoryGrid?.querySelectorAll("[data-category-id]").forEach(button => {
            button.classList.remove("is-selected");
            button.setAttribute("aria-expanded", "false");
        });
        this.persistState();
    }

    selectCategory(categoryId) {
        const category = PUBLIC_SERVICE_DIRECTORY.find(item => item.id === categoryId);
        if (!category) return;

        this.selectedCategoryId = category.id;
        this.serviceId = null;
        this.serviceName = null;
        this.context = null;
        this.list?.replaceChildren();
        if (this.cta) this.cta.hidden = true;
        if (this.selectedService) this.selectedService.hidden = true;
        this.welcome.hidden = true;
        this.serviceSelector.hidden = false;
        this.selectedCategoryLabel.textContent = category.name;
        this.subcategoryList.replaceChildren();

        category.services.forEach(service => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "public-ai-liaison__subcategory";
            button.dataset.serviceId = service.id;
            const label = document.createElement("span");
            const name = document.createElement("strong");
            name.textContent = service.name;
            label.appendChild(name);
            const arrow = document.createElement("i");
            arrow.className = "fa-solid fa-chevron-right";
            arrow.setAttribute("aria-hidden", "true");
            button.append(label, arrow);
            this.subcategoryList.appendChild(button);
        });

        this.categoryGrid?.querySelectorAll("[data-category-id]").forEach(button => {
            const selected = button.dataset.categoryId === category.id;
            button.classList.toggle("is-selected", selected);
            button.setAttribute("aria-expanded", selected ? "true" : "false");
        });
        this.persistState();
        this.subcategoryList.querySelector("[data-service-id]")?.focus();
    }

    selectService(serviceId) {
        const category = PUBLIC_SERVICE_DIRECTORY.find(item => item.id === this.selectedCategoryId);
        const service = category?.services.find(item => item.id === serviceId);
        if (!service || !category) return;

        this.serviceId = service.id;
        this.serviceName = service.name;
        this.context = { publicLead: { stage: 0, qualified: false, answers: [] } };
        this.list?.replaceChildren();
        if (this.cta) this.cta.hidden = true;
        this.serviceSelector.hidden = true;

        if (this.selectedService) {
            this.selectedService.hidden = false;
            this.selectedService.innerHTML = `<span><i class="fa-solid ${CATEGORY_ICONS[category.id] || "fa-circle-question"}"></i></span><div><small>${category.name}</small><strong>${service.name}</strong></div><button type="button" data-ai-change-category aria-label="Change service"><i class="fa-solid fa-pen"></i></button>`;
            this.selectedService.querySelector("[data-ai-change-category]")?.addEventListener("click", () => this.showCategoryPicker());
        }

        this.appendMessage("AI", `You selected ${service.name}. Let’s start your free 15-minute preliminary consultation. What do you need help with?`);
        this.persistState();
        this.input?.focus();
    }

    restoreSelectedService() {
        const category = PUBLIC_SERVICE_DIRECTORY.find(item => item.services.some(service => service.id === this.serviceId));
        const service = category?.services.find(item => item.id === this.serviceId);
        if (!category || !service) return false;
        this.selectedCategoryId = category.id;
        this.welcome.hidden = true;
        this.serviceSelector.hidden = true;
        if (this.selectedService) {
            this.selectedService.hidden = false;
            this.selectedService.innerHTML = `<span><i class="fa-solid ${CATEGORY_ICONS[category.id] || "fa-circle-question"}"></i></span><div><small>${category.name}</small><strong>${service.name}</strong></div><button type="button" data-ai-change-category aria-label="Change service"><i class="fa-solid fa-pen"></i></button>`;
            this.selectedService.querySelector("[data-ai-change-category]")?.addEventListener("click", () => this.showCategoryPicker());
        }
        return true;
    }

    restoreSession() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
            if (!saved || saved.version !== STORAGE_VERSION) {
                localStorage.removeItem(STORAGE_KEY);
                return;
            }
            this.serviceId = saved.serviceId || null;
            this.serviceName = saved.serviceName || null;
            this.context = saved.context || null;
            if (!this.serviceId || !this.restoreSelectedService()) {
                this.resetConversation();
                return;
            }
            (saved.messages || []).slice(-MAX_REMEMBERED_MESSAGES).forEach(message => this.appendMessage(message.sender, message.body, false));
            if (this.context?.publicLead?.qualified) this.showCta();
        } catch {
            this.resetConversation();
        }
    }

    persistState() {
        try {
            const messages = Array.from(this.list?.children || []).map(item => ({ sender: item.classList.contains("public-ai-liaison__message--client") ? "CLIENT" : "AI", body: item.querySelector("p")?.textContent || "" })).filter(item => item.body).slice(-MAX_REMEMBERED_MESSAGES);
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, serviceId: this.serviceId, serviceName: this.serviceName, context: this.context, messages, updatedAt: new Date().toISOString() }));
        } catch { /* optional local memory */ }
    }

    appendMessage(sender, body, persist = true) {
        if (!this.list || !body) return;
        const item = document.createElement("article");
        const visualSender = sender === "CLIENT" ? "client" : "ai";
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
        if (!this.serviceId) {
            this.showCategoryPicker();
            return;
        }

        const body = correctCommonWords(originalBody);
        this.busy = true;
        this.sendButton.disabled = true;
        this.sendButton.querySelector("span").textContent = "…";
        this.appendMessage("CLIENT", originalBody);
        this.input.value = "";
        this.autoSizeInput();

        try {
            const result = await this.agent.handleInbound({ chatId: `public-web:${this.getSessionId()}`, body, conversation: this.context });
            this.context = result.context || this.context;
            this.serviceId = result.servicePlan?.service?.id || this.serviceId;
            this.serviceName = result.servicePlan?.service?.name || this.serviceName;
            if (result.reply) this.appendMessage("AI", result.reply);
            if (result.context?.publicLead?.qualified) this.showCta();
            this.persistState();
        } catch (error) {
            console.error("[PublicLeadLiaison]", error);
            this.appendMessage("AI", "I’m unable to process that right now. Please use the consultation or contact options on the website.");
        } finally {
            this.busy = false;
            this.sendButton.disabled = false;
            this.sendButton.querySelector("span").textContent = "Ask";
            this.input?.focus();
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