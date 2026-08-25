/**
 * Isaacs and Partners
 * Super Admin Authentication Guard
 *
 * Client-side gate only. This is NOT a security boundary.
 * The API/database must independently enforce SUPER_ADMIN access.
 */

import auth from "./AuthService.js";
import ADMIN_AUTH_CONFIG from "./admin-auth.config.js";

class AdminAuthGuard {
    constructor() {
        this.initialised = false;
        this.initialising = null;
    }

    async initialise() {
        if (this.initialised) return this;
        if (this.initialising) return this.initialising;

        this.initialising = (async () => {
            await auth.initialise();
            this.initialised = true;
            return this;
        })();

        try {
            return await this.initialising;
        } finally {
            this.initialising = null;
        }
    }

    async requireSuperAdmin() {
        await this.initialise();

        if (!auth.isAuthenticated()) {
            return {
                allowed: false,
                reason: "NOT_AUTHENTICATED",
                redirect: ADMIN_AUTH_CONFIG.loginPath
            };
        }

        const user = auth.getCurrentUser();
        const role = String(
            user?.role || user?.user_role || user?.app_role || ""
        ).toUpperCase();

        if (role !== ADMIN_AUTH_CONFIG.role) {
            return {
                allowed: false,
                reason: "SUPER_ADMIN_ROLE_REQUIRED",
                redirect: "/index.html"
            };
        }

        return {
            allowed: true,
            role,
            user
        };
    }

    getStatus() {
        return {
            initialised: this.initialised,
            role: ADMIN_AUTH_CONFIG.role,
            loginPath: ADMIN_AUTH_CONFIG.loginPath,
            dashboardPath: ADMIN_AUTH_CONFIG.dashboardPath
        };
    }
}

export const adminAuthGuard = new AdminAuthGuard();
export { AdminAuthGuard };
export default adminAuthGuard;
