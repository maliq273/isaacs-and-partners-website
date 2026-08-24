/**
 * Isaacs and Partners
 * Dashboard Controller
 *
 * Protects the dashboard entry page and provides the authenticated
 * user's basic navigation state. AuthService remains the source of
 * truth for authentication.
 */

import auth from "../auth/AuthService.js";
import navigation from "../core/navigation.js";

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
            navigation.toLogin(
                this.getCurrentReturnUrl(),
                { replace: true }
            );
            return this;
        }

        this.renderAuthenticatedUser();
        this.bindNavigation();
        this.initialised = true;

        return this;
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

        const greeting =
            document.querySelector("#dashboard-greeting");

        if (!greeting || !user) {
            return;
        }

        const displayName =
            user.name ||
            user.fullName ||
            user.full_name ||
            user.email ||
            user.username ||
            "Dashboard";

        greeting.textContent =
            `Welcome, ${displayName}`;
    }

    bindNavigation() {
        if (typeof document === "undefined") {
            return;
        }

        document
            .querySelectorAll(
                "[data-auth-action='logout']"
            )
            .forEach(button => {
                button.addEventListener(
                    "click",
                    this.handleLogout
                );
            });
    }

    async handleLogout(event) {
        event?.preventDefault();

        if (this.loggingOut) {
            return;
        }

        this.loggingOut = true;

        try {
            await auth.logout({
                remote: true,
                reason: "user"
            });

            navigation.toLogin(null, {
                replace: true
            });
        } catch (error) {
            console.error(
                "[DashboardController] Logout failed:",
                error
            );
        } finally {
            this.loggingOut = false;
        }
    }

    destroy() {
        if (typeof document !== "undefined") {
            document
                .querySelectorAll(
                    "[data-auth-action='logout']"
                )
                .forEach(button => {
                    button.removeEventListener(
                        "click",
                        this.handleLogout
                    );
                });
        }

        this.initialised = false;
        this.loggingOut = false;
    }
}

export const dashboardController =
    new DashboardController();

export { DashboardController };

export default dashboardController;
