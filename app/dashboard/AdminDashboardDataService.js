/**
 * Isaacs and Partners
 * Super Admin Dashboard Data Service
 *
 * Reads live administrative data from Supabase using the authenticated
 * user's JWT. The caller supplies the already-resolved SUPER_ADMIN role so
 * the dashboard does not perform a second role lookup during rendering.
 */

import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";

const TABLES = Object.freeze({
    staff: "staff",
    matters: "matters",
    quotes: "quotes",
    assignments: "assignments"
});

class AdminDashboardDataService {
    constructor() {
        this.baseUrl = `${authConfig.supabase.url}/rest/v1`;
        this.publishableKey = authConfig.supabase.publishableKey;
        this.timeout = authConfig.request.timeout;
    }

    async request(table, select = "id", options = {}) {
        await auth.initialise();
        if (!auth.isAuthenticated()) {
            const error = new Error("An authenticated administrator session is required.");
            error.code = "AUTHENTICATION_REQUIRED";
            throw error;
        }

        const token = auth.getToken();
        if (!token) {
            const error = new Error("Administrator access token is missing.");
            error.code = "ADMIN_TOKEN_MISSING";
            throw error;
        }

        const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), this.timeout) : null;

        try {
            const params = new URLSearchParams({ select });
            if (options.filter) {
                Object.entries(options.filter).forEach(([key, value]) => params.set(key, value));
            }

            const response = await fetch(`${this.baseUrl}/${TABLES[table]}?${params.toString()}`, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    apikey: this.publishableKey,
                    Authorization: `Bearer ${token}`
                },
                signal: controller?.signal
            });

            const raw = await response.text();
            let data = [];
            try {
                data = raw ? JSON.parse(raw) : [];
            } catch {
                data = [];
            }

            if (!response.ok) {
                const error = new Error(
                    data?.message || data?.hint || `Administrative request failed for ${table} (${response.status}).`
                );
                error.code = `ADMIN_HTTP_${response.status}`;
                error.status = response.status;
                error.table = table;
                error.details = data;
                throw error;
            }

            return Array.isArray(data) ? data : [];
        } catch (error) {
            if (error?.name === "AbortError") {
                const timeoutError = new Error("Administrative data request timed out.");
                timeoutError.code = "ADMIN_REQUEST_TIMEOUT";
                timeoutError.table = table;
                throw timeoutError;
            }
            throw error;
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }
    }

    async requestWithFallback(table, primarySelect, fallbackSelect = "id") {
        try {
            return { data: await this.request(table, primarySelect), warning: null };
        } catch (error) {
            console.warn(`[AdminDashboardDataService] ${table} primary query failed.`, error);
            try {
                return {
                    data: await this.request(table, fallbackSelect),
                    warning: `${table}: optional columns unavailable; using basic records.`
                };
            } catch (fallbackError) {
                console.warn(`[AdminDashboardDataService] ${table} fallback query failed.`, fallbackError);
                return {
                    data: [],
                    warning: `${table}: data could not be read under the current RLS/schema.`
                };
            }
        }
    }

    async getDashboardSummary(verifiedRole = null) {
        await auth.initialise();
        if (!auth.isAuthenticated()) {
            const error = new Error("An authenticated administrator session is required.");
            error.code = "AUTHENTICATION_REQUIRED";
            throw error;
        }

        if (verifiedRole !== "SUPER_ADMIN") {
            const error = new Error("SUPER_ADMIN role verification is required before loading administrative data.");
            error.code = "SUPER_ADMIN_PROFILE_NOT_FOUND";
            throw error;
        }

        const user = auth.getCurrentUser();
        const [staffResult, mattersResult, quotesResult, assignmentsResult] = await Promise.all([
            this.requestWithFallback(
                "staff",
                "id,user_id,employee_number,department,job_title,is_active,created_at,updated_at",
                "id,is_active"
            ),
            this.requestWithFallback("matters", "id,status", "id"),
            this.requestWithFallback("quotes", "id,status", "id"),
            this.requestWithFallback("assignments", "id,matter_id", "id")
        ]);

        const warnings = [staffResult.warning, mattersResult.warning, quotesResult.warning, assignmentsResult.warning].filter(Boolean);
        const staff = staffResult.data;
        const matters = mattersResult.data;
        const quotes = quotesResult.data;
        const assignments = assignmentsResult.data;

        const assignedMatterIds = new Set(
            assignments.map(item => item?.matter_id).filter(Boolean).map(String)
        );

        const closedMatterStatuses = new Set(["closed", "completed", "cancelled", "archived"]);
        const finalQuoteStatuses = new Set(["approved", "accepted", "rejected", "declined", "converted", "cancelled", "closed"]);

        const openMatters = matters.filter(item => {
            const status = String(item?.status || "").toLowerCase();
            return !status || !closedMatterStatuses.has(status);
        });

        const pendingPreQuotes = quotes.filter(item => {
            const status = String(item?.status || "").toLowerCase();
            return !finalQuoteStatuses.has(status);
        });

        const unassignedMatters = openMatters.filter(item => !assignedMatterIds.has(String(item.id)));

        return {
            user,
            role: "SUPER_ADMIN",
            counts: {
                staff: staff.length,
                activeStaff: staff.filter(item => item?.is_active === true).length,
                pendingPreQuotes: pendingPreQuotes.length,
                unassignedMatters: unassignedMatters.length,
                openMatters: openMatters.length
            },
            staff,
            matters,
            quotes,
            assignments,
            unassignedMatters,
            pendingPreQuotes,
            warnings,
            connected: true
        };
    }
}

export const adminDashboardData = new AdminDashboardDataService();
export { AdminDashboardDataService };
export default adminDashboardData;
