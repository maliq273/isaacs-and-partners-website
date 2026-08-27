/**
 * Super Admin account data service.
 * Browser-side operations are limited to authenticated Edge Function calls.
 * Privileged Auth Admin operations stay server-side.
 */
import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";

const FUNCTION_NAME = "admin-manage-account";

class AdminAccountsDataService {
    async invoke(action, payload = {}) {
        await auth.initialise();

        // AuthService exposes the bearer token through getToken(). Its
        // getSession() object intentionally uses `token`, not Supabase's raw
        // `access_token` property.
        const session = auth.getSession?.() || null;
        const accessToken =
            auth.getToken?.() ||
            session?.access_token ||
            session?.token ||
            null;

        if (!accessToken) {
            throw new Error("AUTHENTICATION_REQUIRED: your administrator session is not available.");
        }

        const response = await fetch(`${authConfig.supabase.url}/functions/v1/${FUNCTION_NAME}`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                apikey: authConfig.supabase.publishableKey,
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify({ action, ...payload })
        });

        const raw = await response.text();
        let body = {};
        try {
            body = raw ? JSON.parse(raw) : {};
        } catch {
            body = { error: raw };
        }

        if (!response.ok) {
            const message = [body?.error, body?.message, body?.hint, body?.details]
                .filter(Boolean)
                .join(" — ");
            throw new Error(message || `Account operation failed (${response.status}).`);
        }

        return body;
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
        return this.invoke("set_status", {
            role,
            user_id: userId,
            is_active: Boolean(active)
        });
    }

    async resetPassword(userId, password, role) {
        return this.invoke("reset_password", {
            role,
            user_id: userId,
            password
        });
    }
}

export const adminAccountsData = new AdminAccountsDataService();
export default adminAccountsData;
