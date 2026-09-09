import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import auth from "../auth/AuthService.js";
import OpenWACommunicationService from "../services/OpenWACommunicationService.js";
import { supabase as configuredSupabase } from "../core/supabase.js";

const serviceClient = configuredSupabase;

class WhatsAppCommunicationsController {
    constructor() {
        this.contacts = [];
        this.messages = [];
        this.selectedChatId = null;
        this.loading = false;
    }

    async initialise() {
        await auth.initialise();
        if (!auth.isAuthenticated()) {
            window.location.assign("../auth/login.html?returnUrl=" + encodeURIComponent(window.location.pathname));
            return;
        }

        const user = auth.getCurrentUser();
        const role = String(user?.role || user?.app_role || user?.user_role || "").toUpperCase();
        if (role && role !== "SUPER_ADMIN" && role !== "STAFF") {
            throw new Error("WhatsApp Communications is restricted to Super Admin and authorised staff.");
        }

        this.bindEvents();
        await this.refreshContacts();
        await this.refreshMessages();
        await this.refreshQueueStatus();
    }

    bindEvents() {
        document.querySelector("[data-auth-action='logout']")?.addEventListener("click", async () => {
            await auth.logout({ remote: true, reason: "user" });
            window.location.assign("../auth/login.html");
        });
        document.getElementById("message-form")?.addEventListener("submit", e => this.sendMessage(e));
        document.getElementById("contact-form")?.addEventListener("submit", e => this.saveContact(e));
        document.getElementById("refresh-contacts")?.addEventListener("click", () => this.refreshContacts());
    }

    async refreshContacts() {
        const list = document.getElementById("contact-list");
        try {
            const { data, error } = await serviceClient.from("communication_contacts").select("*").eq("is_active", true).order("created_at", { ascending: false });
            if (error) throw error;
            this.contacts = data || [];
            document.getElementById("contact-status").textContent = `Contacts: ${this.contacts.length}`;
            list.replaceChildren();
            if (!this.contacts.length) {
                list.innerHTML = '<div class="empty-state">No WhatsApp contacts are mapped yet. Use the contact mapping form below.</div>';
                return;
            }
            for (const contact of this.contacts) {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "contact-item" + (contact.chat_id === this.selectedChatId ? " active" : "");
                button.innerHTML = `<strong>${this.escape(contact.phone_number || contact.chat_id || "WhatsApp contact")}</strong><small>${this.escape(contact.chat_id || "No chat ID")}</small><small>${this.escape(contact.user_id || "")}</small>`;
                button.addEventListener("click", () => this.selectContact(contact));
                list.appendChild(button);
            }
        } catch (error) {
            list.innerHTML = `<div class="empty-state">Unable to load WhatsApp contacts: ${this.escape(error.message || error)}</div>`;
            this.showError(error);
        }
    }

    selectContact(contact) {
        this.selectedChatId = contact.chat_id;
        document.getElementById("chat-id").value = contact.chat_id || "";
        document.getElementById("phone-number").value = contact.phone_number || "";
        document.getElementById("conversation-title").textContent = contact.phone_number || contact.chat_id || "WhatsApp contact";
        document.getElementById("conversation-subtitle").textContent = `User: ${contact.user_id || "unassigned"} · OpenWA chat: ${contact.chat_id || "—"}`;
        document.querySelectorAll(".contact-item").forEach(button => button.classList.toggle("active", button.querySelector("small")?.textContent === contact.chat_id));
        this.renderMessages();
    }

    async refreshMessages() {
        try {
            const { data, error } = await serviceClient.from("communication_messages").select("*").eq("channel", "WHATSAPP").order("created_at", { ascending: true }).limit(500);
            if (error) throw error;
            this.messages = data || [];
            document.getElementById("message-status").textContent = `Messages: ${this.messages.length}`;
            this.renderMessages();
        } catch (error) {
            this.showError(error);
        }
    }

    renderMessages() {
        const list = document.getElementById("message-list");
        list.replaceChildren();
        if (!this.selectedChatId) {
            list.innerHTML = '<div class="empty-state">Select a contact to view its WhatsApp conversation.</div>';
            return;
        }
        const rows = this.messages.filter(row => String(row.chat_id || "") === String(this.selectedChatId));
        if (!rows.length) {
            list.innerHTML = '<div class="empty-state">No WhatsApp messages recorded for this contact yet.</div>';
            return;
        }
        for (const row of rows) {
            const article = document.createElement("article");
            article.className = `message ${String(row.direction || "").toUpperCase() === "OUTBOUND" ? "outbound" : "inbound"}`;
            article.innerHTML = `<strong>${String(row.direction || "").toUpperCase() === "OUTBOUND" ? "Isaacs & Partners" : "Client / Staff"}</strong><p>${this.escape(row.body || "")}</p><time>${this.formatDate(row.created_at)} · ${this.escape(row.status || "")}</time>`;
            list.appendChild(article);
        }
        list.scrollTop = list.scrollHeight;
    }

    async sendMessage(event) {
        event.preventDefault();
        if (this.loading) return;
        const form = event.currentTarget;
        const chatId = String(form.chatId.value || "").trim();
        const phoneNumber = String(form.phoneNumber.value || "").trim() || null;
        const body = String(form.body.value || "").trim();
        if (!chatId || !body) return;
        this.loading = true;
        const button = document.getElementById("send-button");
        button.disabled = true;
        try {
            const transport = new OpenWACommunicationService(serviceClient);
            await transport.queueWhatsAppMessage({ chatId, body, phoneNumber });
            form.body.value = "";
            this.selectedChatId = chatId;
            document.getElementById("conversation-title").textContent = phoneNumber || chatId;
            await this.refreshMessages();
            await this.refreshQueueStatus();
        } catch (error) {
            this.showError(error);
        } finally {
            this.loading = false;
            button.disabled = false;
        }
    }

    async saveContact(event) {
        event.preventDefault();
        const form = event.currentTarget;
        try {
            const userId = String(form.userId.value || "").trim();
            const phoneNumber = String(form.phoneNumber.value || "").trim();
            const chatId = String(form.chatId.value || "").trim();
            if (!userId || !phoneNumber || !chatId) throw new Error("User ID, phone number and OpenWA chat ID are required.");
            const { error } = await serviceClient.from("communication_contacts").upsert({ user_id: userId, phone_number: phoneNumber, chat_id: chatId, is_active: true }, { onConflict: "chat_id" });
            if (error) throw error;
            form.reset();
            await this.refreshContacts();
        } catch (error) {
            this.showError(error);
        }
    }

    async refreshQueueStatus() {
        try {
            const { count, error } = await serviceClient.from("communication_outbox").select("id", { count: "exact", head: true }).eq("status", "QUEUED");
            if (error) throw error;
            document.getElementById("queue-status").textContent = `Queue: ${count || 0} queued`;
            document.getElementById("communication-status").textContent = "WhatsApp workspace active";
        } catch (error) {
            document.getElementById("queue-status").textContent = "Queue: unavailable";
            document.getElementById("communication-status").textContent = "Transport status unavailable";
        }
    }

    showError(error) {
        const element = document.getElementById("communication-error");
        if (!element) return;
        element.hidden = false;
        element.textContent = error?.message || String(error || "Communication operation failed.");
    }

    escape(value) {
        return String(value ?? "").replace(/[&<>\"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[c]);
    }

    formatDate(value) {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? String(value || "") : new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short" }).format(date);
    }
}

const controller = new WhatsAppCommunicationsController();
document.addEventListener("DOMContentLoaded", () => controller.initialise().catch(error => controller.showError(error)));
export default controller;
