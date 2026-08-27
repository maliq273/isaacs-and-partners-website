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
                Accept: "application/json",
                apikey: authConfig.supabase.publishableKey,
                Authorization: `Bearer ${this.token()}`,
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });

        const raw = await response.text();
        let body = null;
        try {
            body = raw ? JSON.parse(raw) : null;
        } catch {
            body = raw;
        }

        if (!response.ok) {
            const detail = body && typeof body === "object"
                ? [body.message, body.hint, body.details, body.error_description, body.error]
                    .filter(Boolean)
                    .join(" — ")
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
        const rows = await this.rest(
            `matters?id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(MATTER_FIELDS)}`
        );
        return Array.isArray(rows) ? rows[0] || null : null;
    }

    normalisePayload(payload = {}) {
        const source = payload && typeof payload === "object" ? payload : {};
        const result = {};

        for (const key of [
            "reference_number",
            "individual_user_id",
            "business_id",
            "title",
            "description",
            "priority",
            "status",
            "created_by"
        ]) {
            if (source[key] !== undefined) result[key] = source[key];
        }

        result.title = String(result.title ?? "").trim();
        if (!result.title) throw new Error("Matter title is required.");

        if (result.reference_number === "") result.reference_number = null;
        if (result.description === "") result.description = null;
        if (result.individual_user_id === "") result.individual_user_id = null;
        if (result.business_id === "") result.business_id = null;
        if (result.priority === "") delete result.priority;
        if (result.status === "") delete result.status;
        if (!result.priority) result.priority = "NORMAL";

        // Do not send mutually empty client identifiers as undefined values.
        // PostgREST handles explicit NULLs correctly against the nullable
        // matter ownership columns.
        return result;
    }

    async create(payload) {
        const data = this.normalisePayload(payload);
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
