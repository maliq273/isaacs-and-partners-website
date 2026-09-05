/**
 * Isaacs & Partners — Client AI Liaison Messages Controller
 *
 * Client communication is available only after Super Admin approval.
 * All AI responses still travel through the server-side AI Liaison runtime.
 */

import auth from "../auth/AuthService.js";
import authGuard from "../auth/AuthGuard.js";
import AILiaisonRuntimeService from "../services/AILiaisonRuntimeService.js";
import clientPortalAccess from "../services/ClientPortalAccessService.js";

const runtime = new AILiaisonRuntimeService();

class ClientMessagesController {
    constructor() {
        this.root = null;
        this.list = null;
        this.form = null;
        this.textarea = null;
        this.submitButton = null;
        this.conversation = null;
        this.chatId = null;
        this.matterId = null;
        this.loading = false;
        this.approved = false;
    }

    async initialise() {
        this.root = document.querySelector("[data-messages]");
        if (!this.root) return this;

        const access = await authGuard.requireAuthentication();
        if (!access?.allowed) return this;

        const user = auth.getCurrentUser();
        if (!user?.id) throw new Error("Authenticated client identity is unavailable.");

        this.chatId = `portal:${user.id}`;
        this.matterId = new URLSearchParams(window.location.search).get("matterId") || null;
        this.list = this.root.querySelector("[data-message-list]");
        this.form = this.root.querySelector("[data-message-form]");
        this.textarea = this.form?.querySelector("textarea[name='message']");
        this.submitButton = this.form?.querySelector("button[type='submit']") || null;

        try {
            this.approved = (await clientPortalAccess.getStatus()) === "APPROVED";
        } catch (error) {
            console.error("[ClientMessagesController] Access check failed:", error);
            this.approved = false;
        }

        this.applyAccessGate();
        if (!this.approved) return this;

        this.form?.addEventListener("submit", event => this.handleSubmit(event));
        await this.loadConversation();
        return this;
    }

    applyAccessGate() {
        if (this.approved) return;

        const banner = document.querySelector("[data-client-message-gate]");
        if (banner) banner.hidden = false;

        this.setListMessage("Client communication is locked until Isaacs & Partners approves your portal access.");
        if (this.textarea) {
            this.textarea.disabled = true;
            this.textarea.placeholder = "Messaging will be enabled after approval.";
        }
        if (this.submitButton) this.submitButton.disabled = true;
        if (this.form) this.form.setAttribute("aria-disabled", "true");
    }

    async loadConversation() {
        this.setListMessage("Loading messages...");

        try {
            this.conversation = await runtime.getClientConversation({ chatId: this.chatId, channel: "PORTAL" });
            if (!this.conversation) {
                this.setListMessage("No messages yet. Your AI Liaison is ready when you are.");
                return;
            }

            this.renderMessages(await runtime.listMessages(this.conversation.id));
        } catch (error) {
            console.error("[ClientMessagesController] Unable to load conversation:", error);
            this.setListMessage(error?.message || "Unable to load your messages.");
        }
    }

    async handleSubmit(event) {
        event.preventDefault();
        if (this.loading || !this.approved) return;

        const body = String(this.textarea?.value || "").trim();
        if (!body) return;

        this.setLoading(true);
        try {
            const result = await runtime.sendClientMessage({ body, chatId: this.chatId, channel: "PORTAL", matterId: this.matterId });
            this.conversation = result.conversation || this.conversation;
            this.textarea.value = "";

            const messages = await runtime.listMessages(this.conversation.id);
            this.renderMessages(messages);
        } catch (error) {
            console.error("[ClientMessagesController] Unable to send message:", error);
            this.showFormError(error?.message || "Unable to send your message. Please try again.");
        } finally {
            this.setLoading(false);
        }
    }

    renderMessages(messages = []) {
        if (!this.list) return;
        this.list.replaceChildren();

        if (!messages.length) {
            this.setListMessage("No messages yet. Your AI Liaison is ready when you are.");
            return;
        }

        for (const message of messages) {
            const article = document.createElement("article");
            article.className = "ip-message";

            const header = document.createElement("div");
            header.className = "ip-message__header";

            const sender = document.createElement("strong");
            sender.textContent = this.senderLabel(message.sender_type);

            const timestamp = document.createElement("time");
            timestamp.dateTime = message.created_at || "";
            timestamp.textContent = this.formatTimestamp(message.created_at);
            header.append(sender, timestamp);

            const body = document.createElement("p");
            body.className = "ip-message__body";
            body.textContent = message.body || "";

            article.append(header, body);
            this.list.appendChild(article);
        }

        this.list.scrollTop = this.list.scrollHeight;
    }

    senderLabel(senderType) {
        return ({ CLIENT: "You", AI: "AI Liaison", STAFF: "Isaacs & Partners", SUPER_ADMIN: "Isaacs & Partners — Super Admin", SYSTEM: "System" })[
            String(senderType || "").toUpperCase()
        ] || "Message";
    }

    formatTimestamp(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(date);
    }

    setListMessage(message) {
        if (!this.list) return;
        this.list.replaceChildren();
        const element = document.createElement("p");
        element.className = "ip-empty-state";
        element.textContent = message;
        this.list.appendChild(element);
    }

    showFormError(message) {
        let element = this.root?.querySelector("[data-message-error]");
        if (!element) {
            element = document.createElement("p");
            element.dataset.messageError = "true";
            element.className = "ip-form-message ip-form-message--error";
            this.form?.prepend(element);
        }
        element.textContent = message;
    }

    setLoading(loading) {
        this.loading = Boolean(loading);
        if (!this.submitButton) return;
        this.submitButton.disabled = this.loading || !this.approved;
        this.submitButton.setAttribute("aria-busy", String(this.loading));
        this.submitButton.textContent = this.loading ? "Sending..." : "Send Message";
    }
}

const clientMessagesController = new ClientMessagesController();

if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        clientMessagesController.initialise().catch(error => console.error("[ClientMessagesController] Initialisation failed:", error));
    });
}

export { ClientMessagesController };
export default clientMessagesController;
