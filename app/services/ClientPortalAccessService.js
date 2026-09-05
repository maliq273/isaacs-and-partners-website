/**
 * Client Portal Access Service
 *
 * The authenticated client may read only their own access status through RLS.
 * Approval and suspension are Super Admin operations exposed by protected RPCs.
 */

import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";

class ClientPortalAccessService {
    constructor() {
        this.baseUrl = `${authConfig.supabase.url}/rest/v1`;
        this.rpcUrl = `${authConfig.supabase.url}/rest/v1/rpc`;
        this.publishableKey = authConfig.supabase.publishableKey;
    }

    _headers() {
        const token = auth.getToken();
        if (!token) {
            const error = new Error("An authenticated session is required.");
            error.code = "AUTH_TOKEN_MISSING";
            throw error;
        }

        return {
            Accept: "application/json",
            apikey: this.publishableKey,
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        };
    }

    _userId() {
        const user = auth.getCurrentUser();
        const id = user?.id || user?.user_id || user?.userId;
        if (!id) throw new Error("Authenticated user id is unavailable.");
        return String(id);
    }

    async getStatus() {
        const response = await fetch(`${this.rpcUrl}/client_portal_access_status`, {
            method: "POST",
            headers: this._headers(),
            body: "{}"
        });

        const raw = await response.text();
        let data = raw;
        try { data = raw ? JSON.parse(raw) : null; } catch { /* text fallback */ }

        if (!response.ok) {
            throw new Error(data?.message || data?.details || "Unable to determine client portal access.");
        }

        return String(Array.isArray(data) ? data[0] : data || "PENDING").toUpperCase();
    }

    async getOwnRecord() {
        const response = await fetch(
            `${this.baseUrl}/client_portal_access?select=*&user_id=eq.${encodeURIComponent(this._userId())}`,
            { method: "GET", headers: this._headers() }
        );

        const raw = await response.text();
        let data = null;
        try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }

        if (!response.ok) {
            throw new Error(data?.message || "Unable to load client portal access.");
        }

        return Array.isArray(data) ? data[0] || null : data;
    }
}

export const clientPortalAccessService = new ClientPortalAccessService();
export { ClientPortalAccessService };
export default clientPortalAccessService;
