/**
 * Client dashboard AI Liaison widget.
 *
 * The widget is deliberately available only after Super Admin approval.
 * It uses the same authenticated runtime as the Messages page, so there is
 * one communication path: CLIENT -> AI Liaison -> STAFF/SUPER ADMIN.
 */

import auth from "../auth/AuthService.js";
import AILiaisonRuntimeService from "../services/AILiaisonRuntimeService.js";
import clientPortalAccess from "../services/ClientPortalAccessService.js";

class ClientLiaisonWidget {
    constructor() {
        this.root = null;
        this.panel = null;
        this.list = null;
        this.form = null;
        this.input = null;
        this.button = null;
        this.runtime = new AILiaisonRuntimeService();
        this.conversation = null;
        this.chatId = null;
        this.loading = false;
        this.approved = false;
    }

    async initialise() {
        this.root = document.querySelector("[data-ai-liaison-widget]");
        if (!this.root) return this;

        await auth.initialise();
        if (!auth.isAuthenticated()) return this;

        const user = auth.getCurrentUser();
        if (!user?.id) return this;

        this.chatId = `portal:${user.id}`;

        try {
            const status = await clientPortalAccess.getStatus();
            this.approved = status === "APPROVED";
        } catch (error) {
            console.error("[ClientLiaisonWidget] Access check failed:", error);
            this.approved = false;
        }

        this.renderGate();
        if (!this.approved) return this;

        this.bind();
        await this.loadConversation();
        return this;
    }

    renderGate() {
        const status = this.approved ? "APPROVED" : "PENDING";
        this.root.dataset.access = status.toLowerCase();

        if (!this.approved) {
            this.root.querySelector("[data-ai-status]").textContent =
                "Your secure AI Liaison will become available after Isaacs & Partners approves your portal access.";
            this.root.querySelector("[data-ai-locked]").hidden = false;
            this.root.querySelector("[data-ai-chat]").hidden = true;
            return;
        }

        this.root.querySelector("[data-ai-status]").textContent =
            "I connect you directly with Isaacs & Partners staff and Super Admin.";
        this.root.querySelector("[data-ai-locked]").hidden = true;
        this.root.querySelector("[data-ai-chat]").hidden = false;
    }

    bind() {
        this.panel = this.root.querySelector("[data-ai-chat]");
        this.list = this.root.querySelector("[data-ai-message-list]");
        this.form = this.root.querySelector("[data-ai-message-form]");
        this.input = this.form?.querySelector("textarea[name='message']");
        this.button = this.form?.querySelector("button[type='submit']");
        this.form?.addEventListener("submit", event => this.send(event));
    }

    async loadConversation() {
        try {
            this.conversation = await this.runtime.getClientConversation({
                chatId: this.chatId,
                channel: "PORTAL"
            });
            if (!this.conversation) {
                this.setListMessage("No conversation yet. I am ready when you are.");
                return;
            }
            this.renderMessages(await this.runtime.listMessages(this.conversation.id));
        } catch (error) {
            console.error("[ClientLiaisonWidget] Conversation load failed:", error);
            this.setListMessage("Your secure conversation could not be loaded. Please try again.");
        }
    }

    async send(event) {
        event.preventDefault();
        if (this.loading || !this.approved) return;

        const body = String(this.input?.value || "").trim();
        if (!body) return;

        this.setLoading(true);
        try {
            const result = await this.runtime.sendClientMessage({
                body,
                chatId: this.chatId,
                channel: "PORTAL"
            });
            this.conversation = result.conversation || this.conversation;
            this.input.value = "";
            if (this.conversation?.id) {
                this.renderMessages(await this.runtime.listMessages(this.conversation.id));
            }
        } catch (error) {
            console.error("[ClientLiaisonWidget] Send failed:", error);
            this.setListMessage(error?.message || "Unable to send your message. Please try again.");
        } finally {
            this.setLoading(false);
        }
    }

    renderMessages(messages = []) {
        if (!this.list) return;
        this.list.replaceChildren();
        if (!messages.length) {
            this.setListMessage("No conversation yet. I am ready when you are.");
            return;
        }

        messages.slice(-6).forEach(message => {
            const item = document.createElement("article");
            item.className = `ai-widget-message ai-widget-message--${String(message.sender_type || "system").toLowerCase()}`;

            const header = document.createElement("div");
            header.className = "ai-widget-message__header";

            const sender = document.createElement("strong");
            sender.textContent = this.senderLabel(message.sender_type);

            const time = document.createElement("time");
            time.textContent = this.formatTimestamp(message.created_at);
            header.append(sender, time);

            const body = document.createElement("p");
            body.textContent = message.body || "";
            item.append(header, body);
            this.list.appendChild(item);
        });

        this.list.scrollTop = this.list.scrollHeight;
    }

    senderLabel(type) {
        return ({
            CLIENT: "You",
            AI: "AI Liaison",
            STAFF: "Isaacs & Partners",
            SUPER_ADMIN: "Super Admin",
            SYSTEM: "Isaacs & Partners"
        })[String(type || "").toUpperCase()] || "Isaacs & Partners";
    }

    formatTimestamp(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return new Intl.DateTimeFormat("en-ZA", { timeStyle: "short" }).format(date);
    }

    setListMessage(message) {
        if (!this.list) return;
        this.list.replaceChildren();
        const p = document.createElement("p");
        p.className = "ai-widget-empty";
        p.textContent = message;
        this.list.appendChild(p);
    }

    setLoading(loading) {
        this.loading = Boolean(loading);
        if (!this.button) return;
        this.button.disabled = this.loading;
        this.button.textContent = this.loading ? "Sending…" : "Send";
    }
}

const clientLiaisonWidget = new ClientLiaisonWidget();

if (typeof document !== "undefined") {
    document.addEventListener("DOMContentLoaded", () => {
        clientLiaisonWidget.initialise().catch(error => {
            console.error("[ClientLiaisonWidget] Initialisation failed:", error);
        });
    });
}

export { ClientLiaisonWidget };
export default clientLiaisonWidget;
