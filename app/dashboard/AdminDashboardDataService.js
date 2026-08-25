/**
 * Isaacs and Partners
 * Super Admin Dashboard Data Service
 *
 * Reads the real administrative tables from Supabase.
 * The authenticated SUPER_ADMIN JWT and database RLS are the security boundary.
 * No service-role key or database password belongs in this file.
 *
 * The dashboard must remain usable while the schema is being expanded.
 * Optional administrative columns therefore have safe fallbacks instead of
 * allowing one missing column to blank the entire Super Admin dashboard.
 */

import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";

const TABLES = Object.freeze({
    profiles: "profiles",
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

        const controller = typeof AbortController !== "undefined"
            ? new AbortController()
            : null;
        const timeoutId = controller
            ? setTimeout(() => controller.abort(), this.timeout)
            : null;

        try {
            const params = new URLSearchParams();
            params.set("select", select);

            if (options.filter) {
                Object.entries(options.filter).forEach(([key, value]) => {
                    params.set(key, value);
                });
            }

            const response = await fetch(
                `${this.baseUrl}/${TABLES[table]}?${params.toString()}`,
                {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                        apikey: this.publishableKey,
                        Authorization: `Bearer ${token}`
                    },
                    signal: controller?.signal
                }
            );

            const raw = await response.text();
            let data = [];
            if (raw) {
                try {
                    data = JSON.parse(raw);
                } catch {
                    data = [];
                }
            }

            if (!response.ok) {
                const error = new Error(
                    data?.message ||
                    data?.hint ||
                    `Administrative request failed for ${table} (${response.status}).`
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

    async requestWithFallback(table, primarySelect, fallbackSelect = "id", options = {}) {
        try {
            return {
                data: await this.request(table, primarySelect, options),
                warning: null
            };
        } catch (error) {
            console.warn(
                `[AdminDashboardDataService] ${table} query failed; retrying with ${fallbackSelect}.`,
                error
            );

            try {
                return {
                    data: await this.request(table, fallbackSelect, options),
                    warning: `${table}: optional columns unavailable; using basic records.`
                };
            } catch (fallbackError) {
                console.error(
                    `[AdminDashboardDataService] ${table} fallback query failed.`,
                    fallbackError
                );
                return {
                    data: [],
                    warning: `${table}: data could not be read under the current RLS/schema.`
                };
            }
        }
    }

    async getDashboardSummary() {
        const user = auth.getCurrentUser();
        const userId = user?.id || user?.user_id || user?.userId || null;

        if (!userId) {
            const error = new Error("Authenticated user identity is unavailable.");
            error.code = "ADMIN_USER_ID_MISSING";
            throw error;
        }

        // Read only the signed-in administrator's profile. This works with
        // the existing profiles_select_own_or_admin RLS policy and avoids
        // depending on a broad profiles query.
        const profileResult = await this.request(
            "profiles",
            "id,email,role,is_active",
            { filter: { id: `eq.${userId}` } }
        ).then(data => ({ data, warning: null }))
            .catch(async error => {
                console.error("[AdminDashboardDataService] Profile query failed.", error);
                return {
                    data: [],
                    warning: "profiles: administrator profile could not be read."
                };
            });

        const [staffResult, mattersResult, quotesResult, assignmentsResult] = await Promise.all([
            this.requestWithFallback("staff", "id,user_id,status", "id"),
            this.requestWithFallback("matters", "id,status", "id"),
            this.requestWithFallback("quotes", "id,status", "id"),
            this.requestWithFallback("assignments", "id,matter_id", "id")
        ]);

        const warnings = [
            profileResult.warning,
            staffResult.warning,
            mattersResult.warning,
            quotesResult.warning,
            assignmentsResult.warning
        ].filter(Boolean);

        const adminProfile = profileResult.data.find(
            item => String(item?.role || "").toUpperCase() === "SUPER_ADMIN" && item?.is_active === true
        );

        if (!adminProfile) {
            const error = new Error("SUPER_ADMIN profile could not be verified.");
            error.code = "SUPER_ADMIN_PROFILE_NOT_FOUND";
            throw error;
        }

        const staff = staffResult.data;
        const matters = mattersResult.data;
        const quotes = quotesResult.data;
        const assignments = assignmentsResult.data;

        const assignedMatterIds = new Set(
            assignments
                .map(item => item?.matter_id)
                .filter(Boolean)
                .map(String)
        );

        const closedMatterStatuses = new Set([
            "closed",
            "completed",
            "cancelled",
            "archived"
        ]);

        const finalQuoteStatuses = new Set([
            "approved",
            "accepted",
            "rejected",
            "declined",
            "converted",
            "cancelled",
            "closed"
        ]);

        const openMatters = matters.filter(item => {
            const status = String(item?.status || "").toLowerCase();
            return !status || !closedMatterStatuses.has(status);
        });

        const pendingPreQuotes = quotes.filter(item => {
            const status = String(item?.status || "").toLowerCase();
            return !finalQuoteStatuses.has(status);
        });

        const unassignedMatters = openMatters.filter(
            item => !assignedMatterIds.has(String(item.id))
        );

        return {
            profile: adminProfile,
            counts: {
                staff: staff.length,
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
