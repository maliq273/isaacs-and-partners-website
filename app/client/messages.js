import auth from "../auth/AuthService.js";
import authGuard from "../auth/AuthGuard.js";
import AILiaisonRuntimeService from "../services/AILiaisonRuntimeService.js";
import clientPortalAccess from "../services/ClientPortalAccessService.js";

const runtime = new AILiaisonRuntimeService();

class ClientMessagesController {
    constructor() { this.root = null; this.list = null; this.form = null; this.textarea = null; this.submitButton = null; this.conversation = null; this.chatId = null; this.matterId = null; this.loading = false; this.approved = false; this.pollTimer = null; }

    async initialise() {
        this.root = document.querySelector("[data-messages]"); if (!this.root) return this;
        const access = await authGuard.requireAuthentication(); if (!access?.allowed) return this;
        const user = auth.getCurrentUser(); if (!user?.id) throw new Error("Authenticated client identity is unavailable.");
        this.chatId = `portal:${user.id}`; this.matterId = new URLSearchParams(window.location.search).get("matterId") || null;
        this.list = this.root.querySelector("[data-message-list]"); this.form = this.root.querySelector("[data-message-form]"); this.textarea = this.form?.querySelector("textarea[name='message']"); this.submitButton = this.form?.querySelector("button[type='submit']") || null;
        await this.refreshAccess();
        if (!this.approved) return this;
        this.form?.addEventListener("submit", event => this.handleSubmit(event));
        await this.loadConversation();
        this.pollTimer = window.setInterval(() => this.refreshConversation().catch(console.error), 10000);
        window.addEventListener("beforeunload", () => window.clearInterval(this.pollTimer));
        return this;
    }

    async refreshAccess() {
        try { this.approved = (await clientPortalAccess.getStatus()) === "APPROVED"; } catch (error) { console.error(error); this.approved = false; }
        this.applyAccessGate();
    }

    applyAccessGate() {
        const banner = document.querySelector("[data-client-message-gate]");
        if (banner) banner.hidden = this.approved;
        if (this.textarea) { this.textarea.disabled = !this.approved || this.loading; this.textarea.placeholder = this.approved ? "Type your message to the AI Liaison or team..." : "Messaging will be enabled after approval."; }
        if (this.submitButton) this.submitButton.disabled = !this.approved || this.loading;
        if (!this.approved) this.setListMessage("Client communication is locked until Isaacs & Partners approves your portal access.");
    }

    async loadConversation() {
        this.setListMessage("Loading messages...");
        try { this.conversation = await runtime.getClientConversation({ chatId: this.chatId, channel: "PORTAL" }); if (!this.conversation) { this.setListMessage("No messages yet. Your AI Liaison is ready when you are."); return; } await this.refreshConversation(); }
        catch (error) { console.error(error); this.setListMessage(error?.message || "Unable to load your messages."); }
    }

    async refreshConversation() {
        if (!this.conversation) return;
        try { const current = await runtime.getConversation(this.conversation.id); this.conversation = current; this.renderMessages(await runtime.listMessages(current.id)); this.renderConversationState(current.state); }
        catch (error) { console.error("[ClientMessagesController] refresh failed", error); }
    }

    renderConversationState(state) {
        let banner = this.root.querySelector("[data-conversation-state]");
        if (!banner) { banner = document.createElement("p"); banner.dataset.conversationState = "true"; banner.className = "ip-form-message"; this.root.prepend(banner); }
        const value = String(state || "AI_ACTIVE").toUpperCase();
        banner.textContent = ({ AI_ACTIVE: "AI Liaison is active.", AI_ESCALATED: "Your enquiry is with an authorised team member for human review.", HUMAN_ACTIVE: "An authorised team member is handling this conversation.", HUMAN_RESOLVED: "Human review has been completed.", AI_RESUMED: "AI Liaison has resumed this conversation." })[value] || "Conversation status updated.";
    }

    async handleSubmit(event) {
        event.preventDefault(); if (this.loading || !this.approved) return;
        const body = String(this.textarea?.value || "").trim(); if (!body) return;
        if (["AI_ESCALATED","HUMAN_ACTIVE"].includes(String(this.conversation?.state || "").toUpperCase())) { this.showFormError("This conversation is currently with an authorised team member."); return; }
        this.setLoading(true);
        try { const result = await runtime.sendClientMessage({ body, chatId: this.chatId, channel: "PORTAL", matterId: this.matterId }); this.conversation = result.conversation || this.conversation; this.textarea.value = ""; await this.refreshConversation(); }
        catch (error) { console.error(error); this.showFormError(error?.message || "Unable to send your message. Please try again."); }
        finally { this.setLoading(false); }
    }

    renderMessages(messages = []) {
        if (!this.list) return; this.list.replaceChildren(); if (!messages.length) { this.setListMessage("No messages yet. Your AI Liaison is ready when you are."); return; }
        for (const message of messages) { const article = document.createElement("article"); article.className = `ip-message ip-message--${String(message.sender_type || "message").toLowerCase()}`; const header = document.createElement("div"); header.className = "ip-message__header"; const sender = document.createElement("strong"); sender.textContent = this.senderLabel(message.sender_type); const timestamp = document.createElement("time"); timestamp.dateTime = message.created_at || ""; timestamp.textContent = this.formatTimestamp(message.created_at); header.append(sender, timestamp); const body = document.createElement("p"); body.className = "ip-message__body"; body.textContent = message.body || ""; article.append(header, body); this.list.appendChild(article); }
        this.list.scrollTop = this.list.scrollHeight;
    }

    senderLabel(type) { return ({ CLIENT: "You", AI: "AI Liaison", STAFF: "Isaacs & Partners", SUPER_ADMIN: "Isaacs & Partners — Super Admin", SYSTEM: "System" })[String(type || "").toUpperCase()] || "Message"; }
    formatTimestamp(value) { if (!value) return ""; const date = new Date(value); return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(date); }
    setListMessage(message) { if (!this.list) return; this.list.replaceChildren(); const element = document.createElement("p"); element.className = "ip-empty-state"; element.textContent = message; this.list.appendChild(element); }
    showFormError(message) { let element = this.root?.querySelector("[data-message-error]"); if (!element) { element = document.createElement("p"); element.dataset.messageError = "true"; element.className = "ip-form-message ip-form-message--error"; this.form?.prepend(element); } element.textContent = message; }
    setLoading(loading) { this.loading = Boolean(loading); this.applyAccessGate(); if (this.submitButton) this.submitButton.setAttribute("aria-busy", String(this.loading)); }
}

const clientMessagesController = new ClientMessagesController();
if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", () => clientMessagesController.initialise().catch(error => console.error("[ClientMessagesController]", error)));
export { ClientMessagesController };
export default clientMessagesController;
