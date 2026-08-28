import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";

const MATTER_FIELDS = [
    "id",
    "reference_number",
    "individual_user_id",
    "business_id",
    "title",
    "description",
    "status",
    "priority",
    "created_by",
    "created_at",
    "updated_at"
].join(",");

const MATTER_STATUSES = new Set([
    "ACTIVE", "INACTIVE", "NEW", "PENDING", "IN_PROGRESS", "ON_HOLD",
    "COMPLETED", "APPROVED", "REJECTED", "CANCELLED", "EXPIRED",
    "ARCHIVED", "DELETED", "FAILED", "ERROR"
]);

class MatterDataService {
    async token() {
        await auth.initialise();
        const token = auth.getToken?.();
        if (!token) throw new Error("Your session has expired. Please sign in again.");
        return token;
    }

    async rest(path, options = {}) {
        const token = await this.token();
        const response = await fetch(`${authConfig.supabase.url}/rest/v1/${path}`, {
            ...options,
            headers: {
                Accept: "application/json",
                apikey: authConfig.supabase.publishableKey,
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });
        const raw = await response.text();
        let body = null;
        try { body = raw ? JSON.parse(raw) : null; } catch { body = raw; }
        if (!response.ok) {
            const detail = body && typeof body === "object"
                ? [body.message, body.hint, body.details, body.error_description, body.error].filter(Boolean).join(" — ")
                : String(body || "");
            throw new Error(detail || `Supabase matter request failed (${response.status}).`);
        }
        return body;
    }

    async list() {
        return this.rest(`matters?select=${encodeURIComponent(MATTER_FIELDS)}&order=updated_at.desc`);
    }

    async get(id) {
        if (!id) throw new Error("Matter ID is required.");
        const rows = await this.rest(`matters?id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(MATTER_FIELDS)}`);
        return Array.isArray(rows) ? rows[0] || null : null;
    }

    assertClientLink(result) {
        const hasIndividual = Boolean(result.individual_user_id);
        const hasBusiness = Boolean(result.business_id);
        if (hasIndividual === hasBusiness) {
            throw new Error("A matter must be linked to exactly one individual or business client.");
        }
    }

    async validateCreate(payload) {
        const result = await this.rest("rpc/validate_matter_creation", {
            method: "POST",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify({
                p_title: payload.title,
                p_individual_user_id: payload.individual_user_id ?? null,
                p_business_id: payload.business_id ?? null
            })
        });
        const validation = Array.isArray(result) ? result[0] : result;
        if (validation?.valid === false) throw new Error(validation.message || "Matter validation failed.");
    }

    normalisePayload(payload = {}, { forCreate = false } = {}) {
        const source = payload && typeof payload === "object" ? payload : {};
        const result = {};
        for (const key of ["reference_number", "individual_user_id", "business_id", "title", "description", "priority", "status", "created_by"]) {
            if (source[key] !== undefined) result[key] = source[key];
        }
        result.title = String(result.title ?? "").trim();
        if (!result.title) throw new Error("Matter title is required.");
        for (const key of ["individual_user_id", "business_id"]) {
            if (result[key] === "") result[key] = null;
            if (result[key] !== null && result[key] !== undefined && typeof result[key] !== "string") {
                throw new Error(`${key} must be a valid UUID.`);
            }
        }
        if (result.reference_number === "") result.reference_number = null;
        if (result.description === "") result.description = null;
        if (result.priority === "") delete result.priority;
        if (!result.priority) result.priority = "NORMAL";
        this.assertClientLink(result);
        if (forCreate) {
            delete result.status;
        } else if (result.status !== undefined) {
            const status = String(result.status).trim().toUpperCase();
            if (!MATTER_STATUSES.has(status)) throw new Error(`Unsupported matter status: ${status}.`);
            result.status = status;
        }
        return result;
    }

    async create(payload) {
        const data = this.normalisePayload(payload, { forCreate: true });
        await this.validateCreate(data);
        return this.rest("matters", {
            method: "POST",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify(data)
        });
    }

    async update(id, payload) {
        if (!id) throw new Error("Matter ID is required.");
        const data = this.normalisePayload(payload);
        delete data.created_by;
        return this.rest(`matters?id=eq.${encodeURIComponent(id)}`, {
            method: "PATCH",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify(data)
        });
    }
}

export const matterDataService = new MatterDataService();
export default matterDataService;
