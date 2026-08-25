/**
 * Isaacs and Partners
 * Dashboard Data Service
 *
 * Central data-access layer for authenticated dashboards.
 *
 * Responsibilities:
 * - Read the authenticated user's dashboard data from Supabase
 * - Keep dashboard pages independent from Supabase HTTP details
 * - Apply the authenticated access token to every request
 * - Provide role-specific dashboard loaders
 * - Fail safely when optional dashboard tables are not yet provisioned
 *
 * IMPORTANT:
 * - This browser service uses the Supabase publishable key only.
 * - NEVER place a PostgreSQL password or service-role key here.
 * - Supabase Row Level Security must remain the final authority.
 * - This service never accepts an arbitrary user id for authentication.
 */

import auth from "../auth/AuthService.js";
import authConfig from "../auth/auth.config.js";
import {
    getUserDashboardRole
} from "./DashboardAccess.js";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const TABLES = Object.freeze({
    profiles: "profiles",
    matters: "matters",
    documents: "documents",
    appointments: "appointments",
    tasks: "tasks",
    quotes: "quotes",
    invoices: "invoices",
    payments: "payments",
    businesses: "businesses",
    staff: "staff",
    notifications: "notifications"
});

class DashboardDataService {
    constructor() {
        this.config = authConfig;
        this.baseUrl = `${authConfig.supabase.url}/rest/v1`;
        this.publishableKey = authConfig.supabase.publishableKey;
        this.timeout = authConfig.request.timeout;
        this.initialised = false;
        this.initialising = null;
    }

    async initialise() {
        if (this.initialised) {
            return this;
        }

        if (this.initialising) {
            return this.initialising;
        }

        this.initialising = this._initialise();

        try {
            await this.initialising;
            return this;
        } finally {
            this.initialising = null;
        }
    }

    async _initialise() {
        await auth.initialise();
        this.initialised = true;
        return this;
    }

    /**
     * Return the authenticated user required for all dashboard queries.
     */
    _requireUser() {
        const user = auth.getCurrentUser();

        if (!user || !auth.isAuthenticated()) {
            const error = new Error(
                "An authenticated user is required to load dashboard data."
            );
            error.code = "AUTHENTICATION_REQUIRED";
            throw error;
        }

        return user;
    }

    /**
     * Return the Supabase Auth user id.
     *
     * Supabase normally exposes this as user.id. No id supplied by a
     * dashboard component is trusted for this purpose.
     */
    _getUserId(user = this._requireUser()) {
        const id =
            user.id ||
            user.user_id ||
            user.userId ||
            null;

        if (!id) {
            const error = new Error(
                "The authenticated user does not have a valid user id."
            );
            error.code = "AUTH_USER_ID_MISSING";
            throw error;
        }

        return String(id);
    }

    _getHeaders() {
        const token = auth.getToken();

        if (!token) {
            const error = new Error(
                "An authenticated access token is required."
            );
            error.code = "AUTH_TOKEN_MISSING";
            throw error;
        }

        return {
            Accept: "application/json",
            apikey: this.publishableKey,
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        };
    }

    _encode(value) {
        return encodeURIComponent(String(value));
    }

    _limit(value = DEFAULT_LIMIT) {
        const numeric = Number(value);

        if (!Number.isFinite(numeric)) {
            return DEFAULT_LIMIT;
        }

        return Math.min(
            Math.max(Math.trunc(numeric), 1),
            MAX_LIMIT
        );
    }

    /**
     * Perform a read against the Supabase PostgREST API.
     *
     * Optional dashboard tables return an empty collection for a missing
     * table/column rather than breaking the whole dashboard. RLS/permission
     * failures are still surfaced so security errors are never hidden.
     */
    async _request(
        table,
        {
            select = "*",
            filters = [],
            order = null,
            limit = DEFAULT_LIMIT,
            single = false,
            optional = true
        } = {}
    ) {
        await this.initialise();
        this._requireUser();

        if (!TABLES[table]) {
            const error = new Error(
                `Unknown dashboard table: ${table}`
            );
            error.code = "DASHBOARD_TABLE_UNKNOWN";
            throw error;
        }

        const params = new URLSearchParams();
        params.set("select", select);

        for (const filter of filters) {
            if (
                !filter ||
                !filter.column ||
                filter.operator === undefined ||
                filter.value === undefined
            ) {
                continue;
            }

            params.set(
                filter.column,
                `${filter.operator}.${filter.value}`
            );
        }

        if (order) {
            params.set("order", order);
        }

        if (!single) {
            params.set("limit", String(this._limit(limit)));
        }

        const controller =
            typeof AbortController !== "undefined"
                ? new AbortController()
                : null;

        const timeoutId = controller
            ? setTimeout(
                  () => controller.abort(),
                  this.timeout
              )
            : null;

        try {
            const response = await fetch(
                `${this.baseUrl}/${this._encode(TABLES[table])}?${params.toString()}`,
                {
                    method: "GET",
                    headers: this._getHeaders(),
                    signal: controller?.signal
                }
            );

            const raw = await response.text();
            let data = null;

            if (raw) {
                try {
                    data = JSON.parse(raw);
                } catch {
                    data = raw;
                }
            }

            if (!response.ok) {
                const error = new Error(
                    data?.message ||
                        data?.hint ||
                        data?.details ||
                        `Dashboard data request failed with HTTP ${response.status}.`
                );

                error.code = `HTTP_${response.status}`;
                error.status = response.status;
                error.response = data;

                /*
                 * A 404/400 generally means an optional dashboard table or
                 * field has not been provisioned yet. Let the dashboard
                 * render with an empty section while development continues.
                 */
                if (
                    optional &&
                    (response.status === 404 || response.status === 400)
                ) {
                    console.warn(
                        `[DashboardDataService] Optional table unavailable: ${table}`,
                        data
                    );
                    return single ? null : [];
                }

                throw error;
            }

            if (single) {
                return Array.isArray(data) ? data[0] || null : data;
            }

            return Array.isArray(data) ? data : [];
        } catch (error) {
            if (error?.name === "AbortError") {
                const timeoutError = new Error(
                    "The dashboard data request timed out."
                );
                timeoutError.code = "REQUEST_TIMEOUT";
                throw timeoutError;
            }

            throw error;
        } finally {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        }
    }

    async getProfile() {
        const user = this._requireUser();
        const userId = this._getUserId(user);

        return this._request("profiles", {
            filters: [
                {
                    column: "id",
                    operator: "eq",
                    value: userId
                }
            ],
            single: true
        });
    }

    async getMatters({ limit = DEFAULT_LIMIT } = {}) {
        const userId = this._getUserId();

        return this._request("matters", {
            filters: [
                {
                    column: "user_id",
                    operator: "eq",
                    value: userId
                }
            ],
            order: "created_at.desc",
            limit
        });
    }

    async getDocuments({ limit = DEFAULT_LIMIT } = {}) {
        const userId = this._getUserId();

        return this._request("documents", {
            filters: [
                {
                    column: "user_id",
                    operator: "eq",
                    value: userId
                }
            ],
            order: "created_at.desc",
            limit
        });
    }

    async getAppointments({ limit = DEFAULT_LIMIT } = {}) {
        const userId = this._getUserId();

        return this._request("appointments", {
            filters: [
                {
                    column: "user_id",
                    operator: "eq",
                    value: userId
                }
            ],
            order: "start_at.asc",
            limit
        });
    }

    async getTasks({ limit = DEFAULT_LIMIT } = {}) {
        const userId = this._getUserId();

        return this._request("tasks", {
            filters: [
                {
                    column: "assigned_to",
                    operator: "eq",
                    value: userId
                }
            ],
            order: "due_at.asc",
            limit
        });
    }

    async getQuotes({ limit = DEFAULT_LIMIT } = {}) {
        const userId = this._getUserId();

        return this._request("quotes", {
            filters: [
                {
                    column: "user_id",
                    operator: "eq",
                    value: userId
                }
            ],
            order: "created_at.desc",
            limit
        });
    }

    async getInvoices({ limit = DEFAULT_LIMIT } = {}) {
        const userId = this._getUserId();

        return this._request("invoices", {
            filters: [
                {
                    column: "user_id",
                    operator: "eq",
                    value: userId
                }
            ],
            order: "created_at.desc",
            limit
        });
    }

    async getPayments({ limit = DEFAULT_LIMIT } = {}) {
        const userId = this._getUserId();

        return this._request("payments", {
            filters: [
                {
                    column: "user_id",
                    operator: "eq",
                    value: userId
                }
            ],
            order: "created_at.desc",
            limit
        });
    }

    async getBusiness({ limit = DEFAULT_LIMIT } = {}) {
        const userId = this._getUserId();

        return this._request("businesses", {
            filters: [
                {
                    column: "owner_id",
                    operator: "eq",
                    value: userId
                }
            ],
            order: "created_at.desc",
            limit,
            single: true
        });
    }

    async getStaffRecord() {
        const userId = this._getUserId();

        return this._request("staff", {
            filters: [
                {
                    column: "user_id",
                    operator: "eq",
                    value: userId
                }
            ],
            single: true
        });
    }

    async getNotifications({ limit = DEFAULT_LIMIT } = {}) {
        const userId = this._getUserId();

        return this._request("notifications", {
            filters: [
                {
                    column: "user_id",
                    operator: "eq",
                    value: userId
                }
            ],
            order: "created_at.desc",
            limit
        });
    }

    /**
     * Load the common data used by every dashboard.
     */
    async getCommonDashboardData(options = {}) {
        const user = this._requireUser();

        const [profile, notifications] = await Promise.all([
            this.getProfile(),
            this.getNotifications(options)
        ]);

        return {
            user,
            profile,
            notifications,
            role: getUserDashboardRole(user)
        };
    }

    /**
     * Individual client dashboard.
     */
    async getIndividualDashboard(options = {}) {
        const common = await this.getCommonDashboardData(options);

        const [matters, documents, appointments, quotes, invoices, payments] =
            await Promise.all([
                this.getMatters(options),
                this.getDocuments(options),
                this.getAppointments(options),
                this.getQuotes(options),
                this.getInvoices(options),
                this.getPayments(options)
            ]);

        return {
            ...common,
            dashboard: "INDIVIDUAL",
            matters,
            documents,
            appointments,
            quotes,
            invoices,
            payments
        };
    }

    /**
     * Business dashboard.
     */
    async getBusinessDashboard(options = {}) {
        const common = await this.getCommonDashboardData(options);

        const [business, matters, documents, appointments, quotes, invoices, payments] =
            await Promise.all([
                this.getBusiness(options),
                this.getMatters(options),
                this.getDocuments(options),
                this.getAppointments(options),
                this.getQuotes(options),
                this.getInvoices(options),
                this.getPayments(options)
            ]);

        return {
            ...common,
            dashboard: "BUSINESS",
            business,
            matters,
            documents,
            appointments,
            quotes,
            invoices,
            payments
        };
    }

    /**
     * Staff dashboard.
     */
    async getStaffDashboard(options = {}) {
        const common = await this.getCommonDashboardData(options);

        const [staff, matters, documents, appointments, tasks, quotes, invoices] =
            await Promise.all([
                this.getStaffRecord(),
                this.getMatters(options),
                this.getDocuments(options),
                this.getAppointments(options),
                this.getTasks(options),
                this.getQuotes(options),
                this.getInvoices(options)
            ]);

        return {
            ...common,
            dashboard: "STAFF",
            staff,
            matters,
            documents,
            appointments,
            tasks,
            quotes,
            invoices
        };
    }

    /**
     * Super Admin dashboard.
     *
     * Deliberately does not expose arbitrary user-data queries from the
     * browser. Privileged administration must be enforced by Supabase RLS
     * and/or server-side Edge Functions. These calls are therefore only
     * executed for an authenticated SUPER_ADMIN account.
     */
    async getSuperAdminDashboard(options = {}) {
        const common = await this.getCommonDashboardData(options);

        if (getUserDashboardRole(common.user) !== "SUPER_ADMIN") {
            const error = new Error(
                "Super Admin access is required."
            );
            error.code = "SUPER_ADMIN_REQUIRED";
            throw error;
        }

        const [matters, quotes, invoices, payments, notifications] =
            await Promise.all([
                this.getMatters(options),
                this.getQuotes(options),
                this.getInvoices(options),
                this.getPayments(options),
                this.getNotifications(options)
            ]);

        return {
            ...common,
            dashboard: "SUPER_ADMIN",
            matters,
            quotes,
            invoices,
            payments,
            notifications
        };
    }

    /**
     * Load the dashboard appropriate to the authenticated user's role.
     */
    async getCurrentDashboard(options = {}) {
        const user = this._requireUser();
        const role = getUserDashboardRole(user);

        switch (role) {
            case "SUPER_ADMIN":
                return this.getSuperAdminDashboard(options);
            case "STAFF":
                return this.getStaffDashboard(options);
            case "BUSINESS":
                return this.getBusinessDashboard(options);
            case "INDIVIDUAL":
            default:
                return this.getIndividualDashboard(options);
        }
    }

    getStatus() {
        let authenticated = false;

        try {
            authenticated = auth.isAuthenticated();
        } catch {
            authenticated = false;
        }

        return {
            initialised: this.initialised,
            authenticated,
            userId: authenticated
                ? auth.getCurrentUser()?.id || null
                : null,
            baseUrl: this.baseUrl
        };
    }

    destroy() {
        this.initialised = false;
        this.initialising = null;
    }
}

export const dashboardData = new DashboardDataService();

export {
    DashboardDataService,
    TABLES
};

export default dashboardData;
