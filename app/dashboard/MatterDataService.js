import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";

class MatterDataService {
    token() {
        const token = auth.getToken?.();
        if (!token) throw new Error("Your session has expired. Please sign in again.");
        return token;
    }

    async rest(path, options = {}) {
        const response = await fetch(`${authConfig.supabase.url}/rest/v1/${path}`, {
            ...options,
            headers: {
                apikey: authConfig.supabase.publishableKey,
                Authorization: `Bearer ${this.token()}`,
                "Content-Type": "application/json",
                Prefer: options.method === "POST" ? "return=representation" : "return=representation",
                ...(options.headers || {})
            }
        });
        const body = await response.json().catch(() => []);
        if (!response.ok) throw new Error(body?.message || body?.error_description || body?.hint || body?.details || `Supabase request failed (${response.status}).`);
        return body;
    }

    async list() {
        return this.rest("matters?select=id,reference_number,individual_user_id,business_id,title,description,status,priority,created_by,created_at,updated_at&order=updated_at.desc");
    }

    async get(id) {
        const rows = await this.rest(`matters?id=eq.${encodeURIComponent(id)}&select=id,reference_number,individual_user_id,business_id,title,description,status,priority,created_by,created_at,updated_at`);
        return rows[0] || null;
    }

    async create(payload) {
        return this.rest("matters", { method: "POST", body: JSON.stringify(payload) });
    }

    async update(id, payload) {
        return this.rest(`matters?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) });
    }
}

export default new MatterDataService();
