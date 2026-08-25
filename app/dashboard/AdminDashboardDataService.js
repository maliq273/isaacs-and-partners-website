/**
 * Isaacs and Partners
 * Super Admin Dashboard Data Service
 *
 * Reads the real administrative tables from Supabase.
 * The authenticated SUPER_ADMIN JWT and database RLS are the security boundary.
 * No service-role key or database password belongs in this file.
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

    async request(table, select = "id") {
        await auth.initialise();

        if (!auth.isAuthenticated()) {
            throw new Error("An authenticated administrator session is required.");
        }

        const token = auth.getToken();
        if (!token) {
            throw new Error("Administrator access token is missing.");
        }

        const controller = typeof AbortController !== "undefined"
            ? new AbortController()
            : null;
        const timeoutId = controller
            ? setTimeout(() => controller.abort(), this.timeout)
            : null;

        try {
            const response = await fetch(
                `${this.baseUrl}/${TABLES[table]}?select=${encodeURIComponent(select)}`,
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
                throw error;
            }

            return Array.isArray(data) ? data : [];
        } catch (error) {
            if (error?.name === "AbortError") {
                const timeoutError = new Error("Administrative data request timed out.");
                timeoutError.code = "ADMIN_REQUEST_TIMEOUT";
                throw timeoutError;
            }
            throw error;
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }
    }

    async getDashboardSummary() {
        const [profile, staff, matters, quotes, assignments] = await Promise.all([
            this.request("profiles", "id,email,role,is_active"),
            this.request("staff", "id,user_id,status"),
            this.request("matters", "id,status"),
            this.request("quotes", "id,status"),
            this.request("assignments", "id,matter_id")
        ]);

        const adminProfile = profile.find(
            item => item.role === "SUPER_ADMIN" && item.is_active === true
        );

        if (!adminProfile) {
            const error = new Error("SUPER_ADMIN profile could not be verified.");
            error.code = "SUPER_ADMIN_PROFILE_NOT_FOUND";
            throw error;
        }

        const assignedMatterIds = new Set(
            assignments
                .map(item => item?.matter_id)
                .filter(Boolean)
                .map(String)
        );

        const openStatuses = new Set([
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
            return !status || !openStatuses.has(status);
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
            pendingPreQuotes
        };
    }
}

export const adminDashboardData = new AdminDashboardDataService();
export { AdminDashboardDataService };
export default adminDashboardData;
