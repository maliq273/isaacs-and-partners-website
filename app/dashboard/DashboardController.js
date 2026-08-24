/**
 * Isaacs and Partners
 * Dashboard Controller
 *
 * Protects dashboard entry and sends authenticated users to the
 * correct dashboard according to their account role/type.
 */

import auth from "../auth/AuthService.js";
import navigation from "../core/navigation.js";
import { getUserDashboardRole } from "./DashboardAccess.js";

class DashboardController {
    constructor() {
        this.initialised = false;
        this.loggingOut = false;
        this.handleLogout = this.handleLogout.bind(this);
    }

    async initialise() {
        if (this.initialised) {
            return this;
        }

        await auth.initialise();

        if (!auth.isAuthenticated()) {
            navigation.toLogin(this.getCurrentReturnUrl(), { replace: true });
            return this;
        }

        const user = auth.getCurrentUser();
        const role = getUserDashboardRole(user);
        const target = navigation.getDashboardRouteForRole(role);

        if (this.shouldRedirectToRoleDashboard(target)) {
            navigation.toRoleDashboard(role, { replace: true });
            return this;
        }

        this.renderAuthenticatedUser();
        this.bindNavigation();
        this.initialised = true;

        return this;
    }

    shouldRedirectToRoleDashboard(target) {
        if (typeof window === "undefined" || !target) {
            return false;
        }

        const current =
            window.location.pathname.replace(/\/+$/, "") || "/";
        const expected =
            new URL(target, window.location.origin).pathname.replace(/\/+$/, "") || "/";

        return current !== expected;
    }

    getCurrentReturnUrl() {
        if (typeof window === "undefined") {
            return navigation.getDashboardRoute();
        }

        return (
            window.location.pathname +
            window.location.search +
            window.location.hash
        );
    }

    renderAuthenticatedUser() {
        if (typeof document === "undefined") {
            return;
        }

        const user = auth.getCurrentUser();
        const greeting = document.querySelector("#dashboard-greeting");

        if (!greeting || !user) {
            return;
        }

        const displayName =
            user.name ||
            user.fullName ||
            user.full_name ||
            [user.firstName, user.lastName].filter(Boolean).join(" ") ||
            user.email ||
            user.username ||
            "Dashboard";

        greeting.textContent = `Welcome, ${displayName}`;
    }

    bindNavigation() {
        if (typeof document === "undefined") {
            return;
        }

        document
            .querySelectorAll("[data-auth-action='logout']")
            .forEach(button => {
                button.addEventListener("click", this.handleLogout);
            });
    }

    async handleLogout(event) {
        event?.preventDefault();

        if (this.loggingOut) {
            return;
        }

        this.loggingOut = true;

        try {
            await auth.logout({ remote: true, reason: "user" });
            navigation.toLogin(null, { replace: true });
        } catch (error) {
            console.error("[DashboardController] Logout failed:", error);
        } finally {
            this.loggingOut = false;
        }
    }

    destroy() {
        if (typeof document !== "undefined") {
            document
                .querySelectorAll("[data-auth-action='logout']")
                .forEach(button => {
                    button.removeEventListener("click", this.handleLogout);
                });
        }

        this.initialised = false;
        this.loggingOut = false;
    }
}

export const dashboardController = new DashboardController();

export { DashboardController };

export default dashboardController;
