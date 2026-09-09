import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";
import OpenWACommunicationService from "../services/OpenWACommunicationService.js";

class WhatsAppCommunicationsController {
    constructor() {
        this.contacts = [];
        this.messages = [];
        this.selectedChatId = null;
        this.loading = false;
        this.supabase = null;
    }

    async initialise() {
        await auth.initialise();
        if (!auth.isAuthenticated()) {
            window.location.assign("../auth/login.html?returnUrl=" + encodeURIComponent(window.location.pathname));
            return;
        }
        const token = auth.getToken();
        if (!token) throw new Error("Authenticated session token is unavailable.");
        this.supabase = createClient(authConfig.supabase.url, authConfig.supabase.publishableKey, {
            auth: { persistSession: false, autoRefreshToken: false },
            global: { headers: { Authorization: `Bearer ${token}` } }
        });
        const { data: role, error: roleError } = await this.supabase.rpc("current_user_role");
        if (roleError) throw roleError;
        const actualRole = String(Array.isArray(role) ? role[0] : role || "").toUpperCase();
        if (!["SUPER_ADMIN", "STAFF"].includes(actualRole)) throw new Error("WhatsApp Communications is restricted to Super Admin and authorised staff.");
        if (actualRole === "STAFF") {
            const { data: allowed, error } = await this.supabase.rpc("has_staff_permission", { p_permission: "view_communications" });
            if (error) throw error;
            if (!allowed) throw new Error("You are not authorised to view WhatsApp Communications.");
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
            const { data, error } = await this.supabase.from("communication_contacts")
                .select("*").eq("is_active", true).order("created_at", { ascending: false });
            if (error) throw error;
            const rows = data || [];
            const ids = [...new Set(rows.map(row => row.user_id).filter(Boolean))];
            let profiles = [];
            if (ids.length) {
                const result = await this.supabase.from("profiles")
                    .select("id,first_name,last_name,email,phone,role,is_active").in("id", ids);
                if (result.error) throw result.error;
                profiles = result.data || [];
            }
            const profileMap = new Map(profiles.map(profile => [profile.id, profile]));
            this.contacts = rows.map(contact => ({ ...contact, profile: profileMap.get(contact.user_id) || null }));
            document.getElementById("contact-status").textContent = `Contacts: ${this.contacts.length}`;
            list.replaceChildren();
            if (!this.contacts.length) {
                list.innerHTML = '<div class="empty-state">No WhatsApp contacts are mapped yet. Approved clients are provisioned automatically; Super Admin can map a staff contact below.</div>';
                return;
            }
            for (const contact of this.contacts) {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "contact-item" + (contact.chat_id === this.selectedChatId ? " active" : "");
                const profile = contact.profile || {};
                const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email || "Mapped account";
                const role = this.roleLabel(profile.role);
                button.innerHTML = `<strong>${this.escape(name)}</strong><small>${this.escape(role)} · ${this.escape(contact.phone_number || "No phone")}</small><small>${this.escape(contact.chat_id || "No chat ID")}</small>`;
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
        const profile = contact.profile || {};
        const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email || "WhatsApp contact";
        const role = this.roleLabel(profile.role);
        document.getElementById("phone-number").value = contact.phone_number || "";
        document.getElementById("conversation-title").textContent = name;
        document.getElementById("conversation-subtitle").textContent = `${role} · ${contact.phone_number || "No phone"} · OpenWA mapped`;
        document.querySelectorAll(".contact-item").forEach(button => button.classList.toggle("active", button === [...document.querySelectorAll(".contact-item")].find(item => item.textContent.includes(contact.chat_id))));
        document.getElementById("send-button").disabled = false;
        this.renderMessages();
    }

    async refreshMessages() {
        try {
            const { data, error } = await this.supabase.from("communication_messages")
                .select("*").eq("channel", "WHATSAPP").order("created_at", { ascending: true }).limit(500);
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
            article.innerHTML = `<strong>${String(row.direction || "").toUpperCase() === "OUTBOUND" ? "Isaacs & Partners" : "WhatsApp contact"}</strong><p>${this.escape(row.body || "")}</p><time>${this.formatDate(row.created_at)} · ${this.escape(row.status || "")}</time>`;
            list.appendChild(article);
        }
        list.scrollTop = list.scrollHeight;
    }

    async sendMessage(event) {
        event.preventDefault();
        if (this.loading || !this.selectedChatId) return;
        const form = event.currentTarget;
        const body = String(form.body.value || "").trim();
        const phoneNumber = String(form.phoneNumber.value || "").trim() || null;
        if (!body) return;
        this.loading = true;
        const button = document.getElementById("send-button");
        button.disabled = true;
        try {
            const transport = new OpenWACommunicationService(this.supabase);
            await transport.queueWhatsAppMessage({ chatId: this.selectedChatId, body, phoneNumber });
            form.body.value = "";
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
            if (!userId || !phoneNumber) throw new Error("User ID and phone number are required.");
            const { data, error } = await this.supabase.rpc("map_whatsapp_contact", {
                p_user_id: userId,
                p_phone_number: phoneNumber
            });
            if (error) throw error;
            if (!data) throw new Error("WhatsApp contact could not be mapped.");
            form.reset();
            await this.refreshContacts();
            this.showSuccess("WhatsApp contact mapped successfully.");
        } catch (error) {
            this.showError(error);
        }
    }

    async refreshQueueStatus() {
        try {
            const { count, error } = await this.supabase.from("communication_outbox")
                .select("id", { count: "exact", head: true }).eq("status", "QUEUED");
            if (error) throw error;
            document.getElementById("queue-status").textContent = `Queue: ${count || 0} queued`;
            document.getElementById("communication-status").textContent = "WhatsApp workspace active";
        } catch {
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

    showSuccess(message) {
        const element = document.getElementById("communication-error");
        if (!element) return;
        element.hidden = false;
        element.classList.remove("error");
        element.textContent = message;
        setTimeout(() => { element.hidden = true; element.classList.add("error"); }, 3500);
    }

    roleLabel(role) {
        return ({ SUPER_ADMIN: "SUPER ADMIN", STAFF: "STAFF", BUSINESS: "CLIENT · BUSINESS", INDIVIDUAL: "CLIENT · INDIVIDUAL" })[String(role || "").toUpperCase()] || String(role || "ACCOUNT");
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
