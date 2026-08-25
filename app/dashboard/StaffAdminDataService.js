import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";

const TABLE = "staff";

class StaffAdminDataService {
    constructor() {
        this.baseUrl = `${authConfig.supabase.url}/rest/v1`;
        this.publishableKey = authConfig.supabase.publishableKey;
        this.timeout = authConfig.request.timeout;
    }

    async request(path = "", options = {}) {
        await auth.initialise();
        if (!auth.isAuthenticated()) throw this.error("AUTHENTICATION_REQUIRED", "An authenticated session is required.");
        const token = auth.getToken();
        const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), this.timeout) : null;
        try {
            const response = await fetch(`${this.baseUrl}/${path}`, {
                ...options,
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    apikey: this.publishableKey,
                    Authorization: `Bearer ${token}`,
                    Prefer: options.method === "POST" || options.method === "PATCH" ? "return=representation" : undefined,
                    ...(options.headers || {})
                },
                signal: controller?.signal
            });
            const raw = await response.text();
            let data = [];
            try { data = raw ? JSON.parse(raw) : []; } catch { data = []; }
            if (!response.ok) {
                const message = data?.message || data?.hint || data?.error_description || `Staff request failed (${response.status}).`;
                throw this.error(`STAFF_HTTP_${response.status}`, message, response.status, data);
            }
            return data;
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    error(code, message, status = null, details = null) {
        const error = new Error(message);
        error.code = code;
        error.status = status;
        error.details = details;
        return error;
    }

    async list(filters = {}) {
        const params = new URLSearchParams({ select: "*", order: "created_at.desc" });
        if (filters.status) params.set("status", `eq.${filters.status}`);
        if (filters.search) params.set("or", `(first_name.ilike.*${filters.search}*,last_name.ilike.*${filters.search}*)`);
        try {
            return await this.request(`${TABLE}?${params.toString()}`);
        } catch (error) {
            if (error.status === 400) return this.request(`${TABLE}?select=*`);
            throw error;
        }
    }

    async createStaffAccount(payload) {
        const endpoint = `${authConfig.supabase.url}/functions/v1/admin-create-staff`;
        await auth.initialise();
        if (!auth.isAuthenticated()) throw this.error("AUTHENTICATION_REQUIRED", "Please sign in again.");
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                apikey: this.publishableKey,
                Authorization: `Bearer ${auth.getToken()}`
            },
            body: JSON.stringify(payload)
        });
        const raw = await response.text();
        let data = {};
        try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
        if (!response.ok) throw this.error(`STAFF_PROVISION_${response.status}`, data?.error || "Staff account could not be created.", response.status, data);
        return data;
    }

    async updateStaff(id, changes) {
        if (!id) throw this.error("STAFF_ID_REQUIRED", "Staff ID is required.");
        const params = new URLSearchParams({ id: `eq.${id}` });
        return this.request(`${TABLE}?${params.toString()}`, {
            method: "PATCH",
            body: JSON.stringify(changes)
        });
    }

    async setStatus(id, status) {
        return this.updateStaff(id, { status });
    }

    async deactivate(id) {
        return this.setStatus(id, "inactive");
    }

    async activate(id) {
        return this.setStatus(id, "active");
    }
}

export const staffAdminData = new StaffAdminDataService();
export { StaffAdminDataService };
export default staffAdminData;
