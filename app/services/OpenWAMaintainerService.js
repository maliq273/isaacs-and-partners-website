/**
 * Isaacs & Partners — OpenWA Maintenance & Session Service
 *
 * Server-side monitor and maintainer for OpenWA WhatsApp gateway sessions.
 * Provides health checks, queue monitoring, and automatic reconnection triggers.
 */

import authConfig from "../auth/auth.config.js";

export class OpenWAMaintainerService {
    constructor({ baseUrl = null, apiKey = null, sessionId = null } = {}) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.sessionId = sessionId;
    }

    async getSessionStatus() {
        if (!this.baseUrl || !this.apiKey || !this.sessionId) {
            return { configured: false, status: "NOT_CONFIGURED", message: "OpenWA credentials missing." };
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/sessions/${encodeURIComponent(this.sessionId)}/status`, {
                headers: { "X-API-Key": this.apiKey }
            });

            if (!response.ok) {
                return { configured: true, status: "ERROR", httpStatus: response.status };
            }

            const data = await response.json().catch(() => ({}));
            return {
                configured: true,
                status: data?.status || "CONNECTED",
                session: this.sessionId,
                details: data
            };
        } catch (error) {
            return { configured: true, status: "DISCONNECTED", error: error.message };
        }
    }

    async restartSession() {
        if (!this.baseUrl || !this.apiKey || !this.sessionId) {
            throw new Error("OpenWA credentials are not configured.");
        }

        const response = await fetch(`${this.baseUrl}/api/sessions/${encodeURIComponent(this.sessionId)}/restart`, {
            method: "POST",
            headers: { "X-API-Key": this.apiKey }
        });

        if (!response.ok) {
            throw new Error(`OpenWA session restart failed with HTTP ${response.status}`);
        }

        return await response.json();
    }
}

export const openWAMaintainerService = new OpenWAMaintainerService();
export default openWAMaintainerService;
