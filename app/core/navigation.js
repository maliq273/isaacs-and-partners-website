/**
 * Isaacs and Partners
 * Application Navigation
 *
 * Central navigation adapter for authentication and dashboard
 * transitions. This module uses the existing ROUTES and browser
 * navigation APIs; it does not create a second router.
 */

import ROUTES from "../config/routes.js";

class Navigation {
    constructor() {
        this.loginRoute = ROUTES.LOGIN;
        this.dashboardRoute = ROUTES.DASHBOARD;
        this.staffDashboardRoute = ROUTES.STAFF_DASHBOARD;
        this.individualDashboardRoute = ROUTES.INDIVIDUAL_DASHBOARD;
        this.businessDashboardRoute = ROUTES.BUSINESS_DASHBOARD;
    }

    getLoginRoute() {
        return this.loginRoute;
    }

    getDashboardRoute() {
        return this.dashboardRoute;
    }

    getDashboardRouteForRole(role) {
        switch (String(role || "").toLowerCase()) {
            case "staff":
            case "employee":
            case "admin":
                return this.staffDashboardRoute;
            case "business":
            case "company":
                return this.businessDashboardRoute;
            case "individual":
            case "client":
            default:
                return this.individualDashboardRoute;
        }
    }

    toLogin(returnUrl = null, { replace = true } = {}) {
        return this._navigate(
            this._withReturnUrl(
                this.loginRoute,
                returnUrl
            ),
            { replace }
        );
    }

    toDashboard({ replace = true } = {}) {
        return this._navigate(
            this.dashboardRoute,
            { replace }
        );
    }

    toRoleDashboard(role, { replace = true } = {}) {
        return this._navigate(
            this.getDashboardRouteForRole(role),
            { replace }
        );
    }

    _withReturnUrl(route, returnUrl) {
        if (!returnUrl) {
            return route;
        }

        const url = new URL(
            route,
            typeof window !== "undefined"
                ? window.location.origin
                : "http://localhost"
        );

        url.searchParams.set(
            "returnUrl",
            returnUrl
        );

        return url.pathname + url.search;
    }

    _navigate(path, { replace = true } = {}) {
        if (typeof window === "undefined") {
            return path;
        }

        if (replace) {
            window.location.replace(path);
        } else {
            window.location.assign(path);
        }

        return path;
    }
}

export const navigation = new Navigation();

export { Navigation };

export default navigation;
