/**
 * Isaacs & Partners — Client AI Liaison Messages Controller
 *
 * Connects the existing authenticated client portal Messages page to the
 * browser-safe AILiaisonRuntimeService.
 *
 * Authentication remains owned by AuthService/AuthGuard.
 * AI runtime calls remain server-side through the Supabase Edge Function.
 */

import auth from "../auth/AuthService.js";
import authGuard from "../auth/AuthGuard.js";
import AILiaisonRuntimeService from "../services/AILiaisonRuntimeService.js";

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
        this.textarea = this.root.querySelector("textarea[name='message']");
        this.submitButton = this.form?.querySelector("button[type='submit']") || null;

        this.form?.addEventListener("submit", event => this.handleSubmit(event));

        await this.loadConversation();
        return this;
    }

    async loadConversation() {
        this.setListMessage("Loading messages...");

        try {
            this.conversation = await runtime.getClientConversation({
                chatId: this.chatId,
                channel: "PORTAL"
            });

            if (!this.conversation) {
                this.setListMessage("No messages yet. Send a message to begin your conversation with Isaacs & Partners.");
                return;
            }

            const messages = await runtime.listMessages(this.conversation.id);
            this.renderMessages(messages);
        } catch (error) {
            console.error("[ClientMessagesController] Unable to load conversation:", error);
            this.setListMessage(error?.message || "Unable to load your messages.");
        }
    }

    async handleSubmit(event) {
        event.preventDefault();
        if (this.loading) return;

        const body = String(this.textarea?.value || "").trim();
        if (!body) return;

        this.setLoading(true);

        try {
            const result = await runtime.sendClientMessage({
                body,
                chatId: this.chatId,
                channel: "PORTAL",
                matterId: this.matterId
            });

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
            this.setListMessage("No messages yet. Send a message to begin your conversation with Isaacs & Partners.");
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
        return ({
            CLIENT: "You",
            AI: "AI Liaison",
            STAFF: "Isaacs & Partners",
            SUPER_ADMIN: "Isaacs & Partners — Super Admin",
            SYSTEM: "System"
        })[String(senderType || "").toUpperCase()] || "Message";
    }

    formatTimestamp(value) {
        if (!value) return "";

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";

        return new Intl.DateTimeFormat("en-ZA", {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(date);
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

        this.submitButton.disabled = this.loading;
        this.submitButton.setAttribute("aria-busy", String(this.loading));
        this.submitButton.textContent = this.loading ? "Sending..." : "Send Message";
    }
}

const clientMessagesController = new ClientMessagesController();

if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        clientMessagesController.initialise().catch(error => {
            console.error("[ClientMessagesController] Initialisation failed:", error);
        });
    });
}

export { ClientMessagesController };
export default clientMessagesController;
