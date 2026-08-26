/**
 * Isaacs & Partners
 * Super Admin Control Plane Service
 *
 * Central browser-side command/data adapter for Super Admin operations.
 * All database authorization is enforced by Supabase RLS. Operations that
 * require the Auth Admin API are delegated to Edge Functions.
 */

import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";

const TABLES = Object.freeze({
    profiles: "profiles",
    businesses: "businesses",
    staff: "staff",
    matters: "matters",
    cases: "cases",
    assignments: "assignments",
    quotes: "quotes",
    invoices: "invoices",
    payments: "payments",
    documents: "documents",
    appointments: "appointments",
    tasks: "tasks",
    notifications: "notifications"
});

const WRITE_FIELDS = Object.freeze({
    businesses: ["owner_user_id", "legal_name", "trading_name", "registration_number", "tax_number", "email", "phone", "is_active"],
    matters: ["reference_number", "individual_user_id", "business_id", "title", "description", "status", "priority", "created_by"],
    cases: ["matter_id", "case_number", "title", "description", "status", "created_by"],
    assignments: ["matter_id", "case_id", "quote_id", "staff_id", "assigned_by", "status", "notes"],
    quotes: ["matter_id", "business_id", "individual_user_id", "quote_number", "description", "amount", "status", "created_by", "approved_by", "approved_at"],
    invoices: ["matter_id", "business_id", "individual_user_id", "invoice_number", "description", "amount", "amount_paid", "currency", "status", "due_at", "issued_at", "paid_at", "created_by"],
    payments: ["invoice_id", "amount", "currency", "payment_method", "provider", "provider_reference", "status", "paid_at", "received_by", "metadata"],
    documents: ["matter_id", "individual_user_id", "business_id", "document_type", "name", "storage_path", "status", "required", "reviewed", "uploaded_at", "reviewed_at", "reviewed_by", "notes", "created_by"],
    appointments: ["matter_id", "individual_user_id", "business_id", "assigned_staff_id", "appointment_type", "title", "starts_at", "ends_at", "status", "location", "notes", "created_by"],
    tasks: ["matter_id", "case_id", "assigned_staff_id", "title", "description", "status", "priority", "due_at", "completed_at", "created_by"],
    notifications: ["recipient_user_id", "channel", "subject", "message", "status", "provider", "provider_reference", "metadata"]
});

class SuperAdminControlPlaneService {
    constructor() {
        this.baseUrl = `${authConfig.supabase.url}/rest/v1`;
        this.functionsUrl = `${authConfig.supabase.url}/functions/v1`;
        this.publishableKey = authConfig.supabase.publishableKey;
        this.timeout = authConfig.request.timeout;
    }

    async ensureAdmin() {
        await auth.initialise();
        if (!auth.isAuthenticated()) {
            const error = new Error("An authenticated Super Admin session is required.");
            error.code = "AUTHENTICATION_REQUIRED";
            throw error;
        }
        const user = auth.getCurrentUser();
        if (!user) throw new Error("Authenticated user context is unavailable.");
        return user;
    }

    headers(write = false) {
        const token = auth.getToken();
        if (!token) throw new Error("Authentication token is unavailable.");
        return {
            Accept: "application/json",
            "Content-Type": "application/json",
            apikey: this.publishableKey,
            Authorization: `Bearer ${token}`,
            ...(write ? { Prefer: "return=representation" } : {})
        };
    }

    sanitise(table, payload) {
        const allowed = WRITE_FIELDS[table] || [];
        return Object.fromEntries(
            Object.entries(payload || {}).filter(([key, value]) => allowed.includes(key) && value !== undefined)
        );
    }

    async request(table, options = {}) {
        await this.ensureAdmin();
        if (!TABLES[table]) throw new Error(`Unknown control-plane table: ${table}`);

        const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), this.timeout) : null;
        try {
            const response = await fetch(`${this.baseUrl}/${TABLES[table]}${options.query ? `?${options.query}` : ""}`, {
                method: options.method || "GET",
                headers: this.headers(Boolean(options.method && options.method !== "GET")),
                body: options.body === undefined ? undefined : JSON.stringify(options.body),
                signal: controller?.signal
            });
            const raw = await response.text();
            let data = [];
            try { data = raw ? JSON.parse(raw) : []; } catch { data = raw; }
            if (!response.ok) {
                const error = new Error(data?.message || data?.hint || data?.details || `Control-plane request failed (${response.status}).`);
                error.code = `CONTROL_PLANE_HTTP_${response.status}`;
                error.status = response.status;
                error.details = data;
                throw error;
            }
            return data;
        } catch (error) {
            if (error?.name === "AbortError") {
                const timeoutError = new Error("Control-plane request timed out.");
                timeoutError.code = "CONTROL_PLANE_TIMEOUT";
                throw timeoutError;
            }
            throw error;
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    async list(table, { select = "*", order = "created_at.desc", limit = 100 } = {}) {
        const params = new URLSearchParams({ select, order, limit: String(Math.max(1, Math.min(Number(limit) || 100, 100))) });
        return this.request(table, { query: params.toString() });
    }

    async create(table, payload) {
        const body = this.sanitise(table, payload);
        return this.request(table, { method: "POST", body });
    }

    async update(table, id, payload) {
        if (!id) throw new Error("A record ID is required.");
        const body = this.sanitise(table, payload);
        if (!Object.keys(body).length) throw new Error("No permitted changes were supplied.");
        const params = new URLSearchParams({ id: `eq.${id}` });
        return this.request(table, { method: "PATCH", query: params.toString(), body });
    }

    async delete(table, id) {
        if (!id) throw new Error("A record ID is required.");
        const params = new URLSearchParams({ id: `eq.${id}` });
        return this.request(table, { method: "DELETE", query: params.toString() });
    }

    async provisionAccount(payload) {
        await this.ensureAdmin();
        const response = await fetch(`${this.functionsUrl}/admin-create-account`, {
            method: "POST",
            headers: this.headers(false),
            body: JSON.stringify(payload)
        });
        const raw = await response.text();
        let data = {};
        try { data = raw ? JSON.parse(raw) : {}; } catch { data = {}; }
        if (!response.ok) {
            const error = new Error(data?.error || "Account could not be created.");
            error.code = `ACCOUNT_PROVISION_${response.status}`;
            error.status = response.status;
            error.details = data;
            throw error;
        }
        return data;
    }

    async createIndividual(payload) {
        return this.provisionAccount({ ...payload, role: "INDIVIDUAL" });
    }

    async createBusiness(payload) {
        return this.provisionAccount({ ...payload, role: "BUSINESS" });
    }

    async createMatter(payload) {
        const user = await this.ensureAdmin();
        return this.create("matters", { ...payload, created_by: user.id });
    }

    async createInvoice(payload) {
        const user = await this.ensureAdmin();
        return this.create("invoices", { ...payload, created_by: user.id });
    }

    async createNotification(payload) {
        return this.create("notifications", payload);
    }
}

export const superAdminControlPlane = new SuperAdminControlPlaneService();
export { SuperAdminControlPlaneService };
export default superAdminControlPlane;
