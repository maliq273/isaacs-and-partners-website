/**
 * Isaacs & Partners — AI Liaison Runtime Service
 *
 * Browser-safe client facade for the Supabase-backed AI liaison runtime.
 *
 * IMPORTANT:
 * The application already has a central AuthService. This service MUST use
 * that authenticated session rather than creating a second Supabase auth
 * client. The access token is sent only as a Bearer token to Supabase.
 *
 * No service-role key, OpenWA key, GitHub token, or other privileged secret
 * belongs in this browser-side service.
 */

import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";

const SUPABASE_URL = authConfig.supabase.url;
const SUPABASE_PUBLISHABLE_KEY = authConfig.supabase.publishableKey;
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/ai-liaison-runtime`;
const REST_URL = `${SUPABASE_URL}/rest/v1`;

export default class AILiaisonRuntimeService {
    constructor({ authService = auth } = {}) {
        if (!authService) throw new Error("AuthService is required.");
        this.auth = authService;
        this.functionUrl = FUNCTION_URL;
        this.restUrl = REST_URL;
    }

    async sendClientMessage({
        body,
        chatId = null,
        phoneNumber = null,
        channel = "PORTAL",
        matterId = null,
        messageId = null,
        intent = null,
        serviceDomain = null
    } = {}) {
        const text = String(body || "").trim();
        if (!text) throw new Error("Message body is required.");

        const token = await this._getAccessToken();
        const user = this.auth.getCurrentUser();

        const resolvedChatId =
            String(chatId || `portal:${user.id}`).trim();

        const response = await fetch(this.functionUrl, {
            method: "POST",
            headers: this._headers(token),
            body: JSON.stringify({
                body: text,
                chatId: resolvedChatId,
                phoneNumber,
                channel,
                matterId,
                messageId,
                intent,
                serviceDomain
            })
        });

        const data = await this._readJson(response);

        if (!response.ok) {
            throw this._createHttpError(response.status, data);
        }

        if (!data?.ok) {
            throw new Error(data?.error || "AI liaison runtime failed.");
        }

        return data;
    }

    async getClientConversation({
        chatId = null,
        channel = "PORTAL"
    } = {}) {
        const token = await this._getAccessToken();
        const user = this.auth.getCurrentUser();
        const resolvedChatId = String(chatId || `portal:${user.id}`).trim();
        const resolvedChannel = String(channel || "PORTAL").trim().toUpperCase();

        const params = new URLSearchParams({
            select: "*",
            chat_id: `eq.${resolvedChatId}`,
            channel: `eq.${resolvedChannel}`,
            order: "updated_at.desc",
            limit: "1"
        });

        const response = await fetch(
            `${this.restUrl}/ai_conversations?${params.toString()}`,
            {
                method: "GET",
                headers: this._headers(token)
            }
        );

        const data = await this._readJson(response);

        if (!response.ok) {
            throw this._createHttpError(response.status, data);
        }

        return Array.isArray(data) ? (data[0] || null) : null;
    }

    async getConversation(conversationId) {
        if (!conversationId) throw new Error("Conversation ID is required.");

        const token = await this._getAccessToken();
        const params = new URLSearchParams({
            select: "*",
            id: `eq.${conversationId}`,
            limit: "1"
        });

        const response = await fetch(
            `${this.restUrl}/ai_conversations?${params.toString()}`,
            {
                method: "GET",
                headers: this._headers(token)
            }
        );

        const data = await this._readJson(response);

        if (!response.ok) {
            throw this._createHttpError(response.status, data);
        }

        if (!Array.isArray(data) || !data[0]) {
            throw new Error("AI conversation not found.");
        }

        return data[0];
    }

    async listMessages(conversationId, limit = 100) {
        if (!conversationId) throw new Error("Conversation ID is required.");

        const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
        const token = await this._getAccessToken();
        const params = new URLSearchParams({
            select: "*",
            conversation_id: `eq.${conversationId}`,
            order: "created_at.asc",
            limit: String(safeLimit)
        });

        const response = await fetch(
            `${this.restUrl}/ai_conversation_messages?${params.toString()}`,
            {
                method: "GET",
                headers: this._headers(token)
            }
        );

        const data = await this._readJson(response);

        if (!response.ok) {
            throw this._createHttpError(response.status, data);
        }

        return Array.isArray(data) ? data : [];
    }

    async _getAccessToken() {
        await this.auth.initialise();

        if (
            this.auth.isSessionExpired() &&
            this.auth.getRefreshToken()
        ) {
            await this.auth.refreshSession();
        }

        if (!this.auth.isAuthenticated()) {
            throw new Error("Authentication required.");
        }

        const token = this.auth.getToken();
        if (!token) throw new Error("Authenticated access token is unavailable.");

        return token;
    }

    _headers(token) {
        return {
            "apikey": SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Accept": "application/json"
        };
    }

    async _readJson(response) {
        const text = await response.text();
        if (!text) return null;

        try {
            return JSON.parse(text);
        } catch {
            return { error: text };
        }
    }

    _createHttpError(status, data) {
        const message =
            data?.error?.message ||
            data?.message ||
            data?.error ||
            `AI liaison request failed with HTTP ${status}.`;

        const error = new Error(String(message));
        error.code = `HTTP_${status}`;
        error.status = status;
        error.response = data;
        return error;
    }
}
