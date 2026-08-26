/**
 * Super Admin account data service.
 * Browser-side operations are limited to authenticated Edge Function calls
 * and RLS-protected reads. Privileged Auth Admin operations stay server-side.
 */
import auth from "../auth/AuthService.js";

const SUPABASE_URL = "https://aglobzjtstbfwcsdhvmp.supabase.co";
const FUNCTION_NAME = "admin-manage-account";

class AdminAccountsDataService {
    async invoke(action, payload = {}) {
        await auth.initialise();
        const session = auth.getSession?.() || auth.session || null;
        const accessToken = session?.access_token || auth.getAccessToken?.();
        if (!accessToken) throw new Error("AUTHENTICATION_REQUIRED");

        const response = await fetch(`${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                apikey: this.getPublishableKey(),
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ action, ...payload })
        });

        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || `Account operation failed (${response.status}).`);
        return body;
    }

    getPublishableKey() {
        return window.__SUPABASE_PUBLISHABLE_KEY__ || window.__SUPABASE_ANON_KEY__ || "";
    }

    async createIndividual(payload) {
        return this.invoke("create", { role: "INDIVIDUAL", ...payload });
    }

    async createBusiness(payload) {
        return this.invoke("create", { role: "BUSINESS", ...payload });
    }

    async updateIndividual(userId, payload) {
        return this.invoke("update", { role: "INDIVIDUAL", user_id: userId, ...payload });
    }

    async updateBusiness(userId, payload) {
        return this.invoke("update", { role: "BUSINESS", user_id: userId, ...payload });
    }

    async setActive(userId, active, role) {
        return this.invoke("set_status", { role, user_id: userId, is_active: Boolean(active) });
    }

    async resetPassword(userId, password, role) {
        return this.invoke("reset_password", { role, user_id: userId, password });
    }
}

export const adminAccountsData = new AdminAccountsDataService();
export default adminAccountsData;
