import WhatsAppAgent from "../agents/WhatsAppAgent.js";
import publicLeadResponseGenerator from "../agents/PublicLeadResponseGenerator.js";

const STORAGE_KEY = "ip_public_ai_lead_session";

class PublicLeadLiaison {
    constructor() {
        this.agent = new WhatsAppAgent({
            mode: "PUBLIC_LEAD",
            responseGenerator: publicLeadResponseGenerator
        });
        this.context = null;
        this.serviceName = null;
        this.opened = false;
        this.busy = false;
    }

    initialise() {
        if (!document.body || document.querySelector("[data-public-ai-liaison]")) return;

        this.render();
        this.restoreSession();
        this.bind();

        window.setTimeout(() => {
            this.open("greeting");
        }, 2200);
    }

    render() {
        const root = document.createElement("section");
        root.className = "public-ai-liaison";
        root.dataset.publicAiLiaison = "true";
        root.setAttribute("aria-label", "Isaacs & Partners AI Liaison");
        root.innerHTML = `
            <button class="public-ai-liaison__launcher" type="button" data-ai-launcher aria-label="Open AI Liaison">
                <span class="public-ai-liaison__launcher-icon"><i class="fa-solid fa-comments"></i></span>
                <span class="public-ai-liaison__launcher-copy">
                    <strong>AI Liaison</strong>
                    <small>How can we assist?</small>
                </span>
                <span class="public-ai-liaison__pulse" aria-hidden="true"></span>
            </button>

            <div class="public-ai-liaison__panel" data-ai-panel hidden>
                <header class="public-ai-liaison__header">
                    <div class="public-ai-liaison__identity">
                        <span class="public-ai-liaison__avatar"><i class="fa-solid fa-scale-balanced"></i></span>
                        <div>
                            <strong>Isaacs &amp; Partners</strong>
                            <span>AI Liaison</span>
                        </div>
                    </div>
                    <button type="button" class="public-ai-liaison__close" data-ai-close aria-label="Close AI Liaison">&times;</button>
                </header>

                <div class="public-ai-liaison__body" data-ai-list aria-live="polite"></div>

                <div class="public-ai-liaison__cta" data-ai-cta hidden>
                    <strong>Ready to take the next step?</strong>
                    <span>Create your account and let Isaacs &amp; Partners turn your enquiry into a secure client matter.</span>
                    <div class="public-ai-liaison__cta-actions">
                        <a href="/signup.html?type=individual&source=website-ai" data-ai-signup class="gold-btn">Create Client Account</a>
                        <a href="/signup.html?type=business&source=website-ai" data-ai-business class="outline-btn">Business Account</a>
                    </div>
                </div>

                <form class="public-ai-liaison__composer" data-ai-form>
                    <label class="sr-only" for="public-ai-message">Ask the AI Liaison</label>
                    <textarea id="public-ai-message" name="message" rows="2" maxlength="3000" placeholder="Tell me what you need help with..." required></textarea>
                    <button type="submit" class="gold-btn" data-ai-send><i class="fa-solid fa-arrow-up"></i><span>Ask</span></button>
                </form>

                <footer class="public-ai-liaison__footer">
                    <span><i class="fa-solid fa-shield-halved"></i> General information only</span>
                    <span>Need professional help? Create an account.</span>
                </footer>
            </div>
        `;
        document.body.appendChild(root);
        this.root = root;
        this.list = root.querySelector("[data-ai-list]");
        this.panel = root.querySelector("[data-ai-panel]");
        this.form = root.querySelector("[data-ai-form]");
        this.input = root.querySelector("textarea");
        this.sendButton = root.querySelector("[data-ai-send]");
        this.cta = root.querySelector("[data-ai-cta]");
    }

    bind() {
        this.root.querySelector("[data-ai-launcher]")?.addEventListener("click", () => this.toggle());
        this.root.querySelector("[data-ai-close]")?.addEventListener("click", () => this.close());
        this.form?.addEventListener("submit", event => this.send(event));
    }

    open(reason = "manual") {
        if (!this.panel) return;
        this.opened = true;
        this.panel.hidden = false;
        this.root.classList.add("is-open");
        this.root.querySelector("[data-ai-launcher]")?.setAttribute("aria-expanded", "true");

        if (reason === "greeting" && !this.context) {
            this.appendMessage("AI", "Hi! Welcome to Isaacs & Partners. Having an issue or looking for a service? I can explain what we do, help identify the service you may need and guide you toward the right next step.");
        }
        this.input?.focus();
    }

    close() {
        this.opened = false;
        this.panel.hidden = true;
        this.root.classList.remove("is-open");
        this.root.querySelector("[data-ai-launcher]")?.setAttribute("aria-expanded", "false");
    }

    toggle() {
        this.opened ? this.close() : this.open();
    }

    restoreSession() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
            if (!saved?.messages?.length) return;
            saved.messages.slice(-6).forEach(message => this.appendMessage(message.sender, message.body, false));
            this.serviceName = saved.serviceName || null;
            if (this.serviceName) this.showCta();
        } catch {
            // Public lead session is optional; never block the website.
        }
    }

    persistMessage(sender, body) {
        try {
            const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{});
            const messages = Array.isArray(current.messages) ? current.messages : [];
            messages.push({ sender, body, createdAt: new Date().toISOString() });
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                messages: messages.slice(-12),
                serviceName: this.serviceName
            }));
        } catch {
            // Ignore optional local storage failures.
        }
    }

    appendMessage(sender, body, persist = true) {
        if (!this.list) return;
        const item = document.createElement("article");
        item.className = `public-ai-liaison__message public-ai-liaison__message--${String(sender).toLowerCase()}`;

        const label = document.createElement("strong");
        label.textContent = sender === "AI" ? "AI Liaison" : "You";

        const content = document.createElement("p");
        content.textContent = body;
        item.append(label, content);
        this.list.appendChild(item);
        this.list.scrollTop = this.list.scrollHeight;

        if (persist) this.persistMessage(sender, body);
    }

    async send(event) {
        event.preventDefault();
        if (this.busy) return;
        const body = String(this.input?.value || "").trim();
        if (!body) return;

        this.busy = true;
        this.sendButton.disabled = true;
        this.sendButton.querySelector("span").textContent = "...";
        this.appendMessage("CLIENT", body);
        this.input.value = "";

        try {
            const result = await this.agent.handleInbound({
                chatId: `public-web:${this.getSessionId()}`,
                body,
                conversation: this.context
            });
            this.context = result.context || this.context;
            this.serviceName = result.servicePlan?.service?.name || this.serviceName;

            if (result.reply) this.appendMessage("AI", result.reply);
            if (result.servicePlan?.service || result.lead?.readyForStaff) this.showCta();
            this.persistMessage("AI", result.reply || "");
        } catch (error) {
            console.error("[PublicLeadLiaison]", error);
            this.appendMessage("AI", "I’m unable to complete that enquiry right now. Please create an account or use the consultation/contact options on this website so our team can assist you.");
            this.showCta();
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

if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        new PublicLeadLiaison().initialise();
    });
}
