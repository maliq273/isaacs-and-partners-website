/**
 * Isaacs and Partners
 * Application Route Configuration
 *
 * Central definition of application routes.
 *
 * Responsibilities:
 * - Define canonical application paths
 * - Provide route constants
 * - Provide route metadata
 * - Keep route naming consistent across the application
 *
 * IMPORTANT:
 * This file contains configuration only.
 *
 * It does NOT:
 * - import Router
 * - import AuthService
 * - import AuthGuard
 * - perform navigation
 * - perform authentication
 *
 * This prevents circular dependencies.
 */

/**
 * --------------------------------------------------------------------------
 * Canonical Routes
 * --------------------------------------------------------------------------
 *
 * Keep application navigation paths in one place.
 *
 * Other modules should import ROUTES rather than hard-coding
 * paths throughout the application.
 */
export const ROUTES = Object.freeze({
    /**
     * Public routes
     */
    HOME:
        "/",

    LOGIN:
        "/login.html",

    FORGOT_PASSWORD:
        "/forgot-password.html",

    RESET_PASSWORD:
        "/reset-password.html",

    ACCESS_DENIED:
        "/access-denied.html",

    NOT_FOUND:
        "/404.html",

    /**
     * Main authenticated application.
     */
    DASHBOARD:
        "/dashboard.html",

    /**
     * Client management.
     */
    CLIENTS:
        "/clients.html",

    CLIENT:
        "/client.html",

    /**
     * Matter / case management.
     */
    MATTERS:
        "/matters.html",

    MATTER:
        "/matter.html",

    /**
     * Consultation.
     */
    CONSULTATION:
        "/consultation.html",

    CONSULTATIONS:
        "/consultations.html",

    /**
     * Appointments.
     */
    APPOINTMENTS:
        "/appointments.html",

    APPOINTMENT:
        "/appointment.html",

    /**
     * Documents.
     */
    DOCUMENTS:
        "/documents.html",

    DOCUMENT:
        "/document.html",

    /**
     * Immigration application management.
     */
    APPLICATIONS:
        "/applications.html",

    APPLICATION:
        "/application.html",

    /**
     * Tasks / workflow.
     */
    TASKS:
        "/tasks.html",

    TASK:
        "/task.html",

    /**
     * Communications.
     */
    COMMUNICATIONS:
        "/communications.html",

    /**
     * Invoices / payments.
     */
    INVOICES:
        "/invoices.html",

    INVOICE:
        "/invoice.html",

    PAYMENTS:
        "/payments.html",

    /**
     * Reports.
     */
    REPORTS:
        "/reports.html",

    /**
     * User / administration.
     */
    PROFILE:
        "/profile.html",

    SETTINGS:
        "/settings.html",

    USERS:
        "/users.html",

    AUDIT_LOG:
        "/audit-log.html",

    /**
     * Applicant/client portal.
     */
    APPLICANT_PORTAL:
        "/applicant-portal.html",

    /**
     * System routes.
     */
    ERROR:
        "/error.html"
});


/**
 * --------------------------------------------------------------------------
 * Route Names
 * --------------------------------------------------------------------------
 *
 * Route names provide stable identifiers for application logic.
 *
 * Do not use URL strings as internal identifiers when a route name
 * is sufficient.
 */
export const ROUTE_NAMES = Object.freeze({
    HOME:
        "home",

    LOGIN:
        "login",

    FORGOT_PASSWORD:
        "forgot-password",

    RESET_PASSWORD:
        "reset-password",

    ACCESS_DENIED:
        "access-denied",

    DASHBOARD:
        "dashboard",

    CLIENTS:
        "clients",

    CLIENT:
        "client",

    MATTERS:
        "matters",

    MATTER:
        "matter",

    CONSULTATIONS:
        "consultations",

    CONSULTATION:
        "consultation",

    APPOINTMENTS:
        "appointments",

    APPOINTMENT:
        "appointment",

    DOCUMENTS:
        "documents",

    DOCUMENT:
        "document",

    APPLICATIONS:
        "applications",

    APPLICATION:
        "application",

    TASKS:
        "tasks",

    TASK:
        "task",

    COMMUNICATIONS:
        "communications",

    INVOICES:
        "invoices",

    INVOICE:
        "invoice",

    PAYMENTS:
        "payments",

    REPORTS:
        "reports",

    PROFILE:
        "profile",

    SETTINGS:
        "settings",

    USERS:
        "users",

    AUDIT_LOG:
        "audit-log",

    APPLICANT_PORTAL:
        "applicant-portal",

    ERROR:
        "error"
});


/**
 * --------------------------------------------------------------------------
 * Route Definitions
 * --------------------------------------------------------------------------
 *
 * These definitions are consumed by the application bootstrap/router
 * configuration.
 *
 * "protected" determines whether AuthGuard must approve access.
 *
 * "public" is informational and makes the configuration easier to inspect.
 *
 * "authOnly" means the route is intended for authenticated users and
 * should normally redirect already-authenticated users away from it.
 */
export const ROUTE_DEFINITIONS = Object.freeze([
    /**
     * ----------------------------------------------------------------------
     * Public
     * ----------------------------------------------------------------------
     */

    {
        name:
            ROUTE_NAMES.HOME,

        path:
            ROUTES.HOME,

        protected:
            false,

        public:
            true,

        authOnly:
            false,

        meta: {
            title:
                "Isaacs and Partners"
        }
    },

    {
        name:
            ROUTE_NAMES.LOGIN,

        path:
            ROUTES.LOGIN,

        protected:
            false,

        public:
            true,

        authOnly:
            false,

        meta: {
            title:
                "Sign In"
        }
    },

    {
        name:
            ROUTE_NAMES.FORGOT_PASSWORD,

        path:
            ROUTES.FORGOT_PASSWORD,

        protected:
            false,

        public:
            true,

        authOnly:
            false,

        meta: {
            title:
                "Forgot Password"
        }
    },

    {
        name:
            ROUTE_NAMES.RESET_PASSWORD,

        path:
            ROUTES.RESET_PASSWORD,

        protected:
            false,

        public:
            true,

        authOnly:
            false,

        meta: {
            title:
                "Reset Password"
        }
    },

    {
        name:
            ROUTE_NAMES.ACCESS_DENIED,

        path:
            ROUTES.ACCESS_DENIED,

        protected:
            false,

        public:
            true,

        authOnly:
            false,

        meta: {
            title:
                "Access Denied"
        }
    },

    {
        name:
            ROUTE_NAMES.NOT_FOUND,

        path:
            ROUTES.NOT_FOUND,

        protected:
            false,

        public:
            true,

        authOnly:
            false,

        meta: {
            title:
                "Page Not Found"
        }
    },

    /**
     * ----------------------------------------------------------------------
     * Authenticated application
     * ----------------------------------------------------------------------
     */

    {
        name:
            ROUTE_NAMES.DASHBOARD,

        path:
            ROUTES.DASHBOARD,

        protected:
            true,

        public:
            false,

        authOnly:
            false,

        meta: {
            title:
                "Dashboard"
        }
    },

    {
        name:
            ROUTE_NAMES.CLIENTS,

        path:
            ROUTES.CLIENTS,

        protected:
            true,

        public:
            false,

        authOnly:
            false,

        meta: {
            title:
                "Clients"
        }
    },

    {
        name:
            ROUTE_NAMES.CLIENT,

        path:
            ROUTES.CLIENT,

        protected:
            true,

        public:
            false,

        authOnly:
            false,

        meta: {
            title:
                "Client"
        }
    },

    {
        name:
            ROUTE_NAMES.MATTERS,

        path:
            ROUTES.MATTERS,

        protected:
            true,

        public:
            false,

        authOnly:
            false,

        meta: {
            title:
                "Matters"
        }
    },

    {
        name:
            ROUTE_NAMES.MATTER,

        path:
            ROUTES.MATTER,

        protected:
            true,

        public:
            false,

        authOnly:
            false,

        meta: {
            title:
                "Matter"
        }
    },

    {
        name:
            ROUTE_NAMES.CONSULTATIONS,

        path:
            ROUTES.CONSULTATIONS,

        protected:
            true,

        public:
            false,

        authOnly:
            false,

        meta: {
            title:
                "Consultations"
        }
    },

    {
        name:
            ROUTE_NAMES.CONSULTATION,

        path:
            ROUTES.CONSULTATION,

        protected:
            true,

        public:
            false,

        authOnly:
            false,

        meta: {
            title:
                "Consultation"
        }
    },

    {
        name:
            ROUTE_NAMES.APPOINTMENTS,

        path:
            ROUTES.APPOINTMENTS,

        protected:
            true,

        public:
            false,

        authOnly:
            false,

        meta: {
            title:
                "Appointments"
        }
    },

    {
        name:
            ROUTE_NAMES.APPOINTMENT,

        path:
            ROUTES.APPOINTMENT,

        protected:
            true,

        public:
            false,

        authOnly:
            false,

        meta: {
            title:
                "Appointment"
        }
    },

    {
        name:
            ROUTE_NAMES.DOCUMENTS,

        path:
            ROUTES.DOCUMENTS,

        protected:
            true,

        public:
            false,

        authOnly:
            false,

        meta: {
            title:
                "Documents"
        }
    },

    {
        name:
            ROUTE_NAMES.DOCUMENT,

        path:
            ROUTES.DOCUMENT,

        protected:
            true,

        public:
            false,

        authOnly:
            false,

        meta: {
            title:
                "Document"
        }
    },

    {
        name:
            ROUTE_NAMES.APPLICATIONS,

        path:
            ROUTES.APPLICATIONS,

        protected:
            true,

        public:
            false,

        authOnly:
            false,

        meta: {
            title:
                "Applications"
        }
    },

    {
        name:
            ROUTE_NAMES.APPLICATION,

        path:
            ROUTES.APPLICATION,

        protected:
            true,

        public:
            false,

        authOnly:
            false,

        meta: {
            title:
                "Application"
        }
    },

    {
        name:
            ROUTE_NAMES.TASKS,

        path:
            ROUTES.TASKS,

        protected:
            true,

        public:
            false,

        authOnly:
            false,

        meta: {
            title:
                "Tasks"
        }
    },

    {
        name:
            ROUTE_NAMES.TASK,

        path:
            ROUTES.TASK,

        protected:
            true,

        public:
            false,

        authOnly:
            false,

        meta: {
            title:
                "Task"
        }
    },

    {
        name:
            ROUTE_NAMES.COMMUNICATIONS,

        path:
            ROUTES.COMMUNICATIONS,

        protected:
            true,

        public:
            false,

        authOnly:
            false,

        meta: {
            title:
                "Communications"
        }
    },

    {
        name:
            ROUTE_NAMES.INVOICES,

        path:
            ROUTES.INVOICES,

        protected:
            true,

        public:
            false,

        authOnly:
            false,

        meta: {
            title:
                "Invoices"
        }
    },

    {
        name:
            ROUTE_NAMES.INVOICE,

        path:
            ROUTES.INVOICE,

        protected:
            true,

        public:
            false,

        authOnly:
            false,

        meta: {
            title:
                "Invoice"
        }
    },

    {
        name:
            ROUTE_NAMES.PAYMENTS,

        path:
            ROUTES.PAYMENTS,

        protected:
            true,

        public:
            false,

        authOnly:
            false,

        meta: {
            title:
                "Payments"
        }
    },

    {
        name:
            ROUTE_NAMES.REPORTS,

        path:
            ROUTES.REPORTS,

        protected:
            true,

        public:
            false,

        authOnly:
            false,

        meta: {
            title:
                "Reports"
        }
    },

    {
        name:
            ROUTE_NAMES.PROFILE,

        path:
            ROUTES.PROFILE,

        protected:
            true,

        public:
            false,

        authOnly:
            false,

        meta: {
            title:
                "My Profile"
        }
    },

    {
        name:
            ROUTE_NAMES.SETTINGS,

        path:
            ROUTES.SETTINGS,

        protected:
            true,

        public:
            false,

        authOnly:
            false,

        meta: {
            title:
                "Settings"
        }
    },

    {
        name:
            ROUTE_NAMES.USERS,

        path:
            ROUTES.USERS,

        protected:
            true,

        public:
            false,

        authOnly:
            false,

        meta: {
            title:
                "Users"
        }
    },

    {
        name:
            ROUTE_NAMES.AUDIT_LOG,

        path:
            ROUTES.AUDIT_LOG,

        protected:
            true,

        public:
            false,

        authOnly:
            false,

        meta: {
            title:
                "Audit Log"
        }
    },

    {
        name:
            ROUTE_NAMES.APPLICANT_PORTAL,

        path:
            ROUTES.APPLICANT_PORTAL,

        protected:
            true,

        public:
            false,

        authOnly:
            false,

        meta: {
            title:
                "Applicant Portal"
        }
    },

    {
        name:
            ROUTE_NAMES.ERROR,

        path:
            ROUTES.ERROR,

        protected:
            false,

        public:
            true,

        authOnly:
            false,

        meta: {
            title:
                "System Error"
        }
    }
]);


/**
 * --------------------------------------------------------------------------
 * Route Helpers
 * --------------------------------------------------------------------------
 */

/**
 * Return route definition by name.
 */
export function getRouteDefinition(
    name
) {
    if (!name) {
        return null;
    }

    return (
        ROUTE_DEFINITIONS.find(
            (route) =>
                route.name === name
        ) || null
    );
}


/**
 * Return route definition by path.
 */
export function getRouteByPath(
    path
) {
    if (!path) {
        return null;
    }

    const pathname =
        String(path)
            .split("?")[0]
            .split("#")[0]
            .replace(
                /\/+/g,
                "/"
            );

    const normalised =
        pathname !== "/" &&
        pathname.endsWith("/")
            ? pathname.slice(0, -1)
            : pathname;

    return (
        ROUTE_DEFINITIONS.find(
            (route) =>
                route.path === normalised
        ) || null
    );
}


/**
 * Determine whether a route is protected.
 */
export function isProtectedRoute(
    path
) {
    const route =
        getRouteByPath(path);

    return Boolean(
        route?.protected
    );
}


/**
 * Determine whether a route is public.
 */
export function isPublicRoute(
    path
) {
    const route =
        getRouteByPath(path);

    return Boolean(
        route?.public
    );
}


/**
 * Determine whether route is authentication-only.
 */
export function isAuthRoute(
    path
) {
    const route =
        getRouteByPath(path);

    return Boolean(
        route?.authOnly
    );
}


/**
 * Build a route with query parameters.
 *
 * Example:
 *
 * buildRoute(
 *     ROUTES.CLIENT,
 *     {
 *         id: "123"
 *     }
 * );
 *
 * Result:
 *
 * /client.html?id=123
 */
export function buildRoute(
    path,
    query = {}
) {
    if (
        typeof path !==
        "string"
    ) {
        throw new TypeError(
            "Route path must be a string."
        );
    }

    const search =
        new URLSearchParams();

    if (
        query &&
        typeof query ===
            "object"
    ) {
        Object.entries(
            query
        ).forEach(
            ([key, value]) => {
                if (
                    value ===
                        undefined ||
                    value === null
                ) {
                    return;
                }

                search.set(
                    key,
                    String(value)
                );
            }
        );
    }

    const queryString =
        search.toString();

    return queryString
        ? `${path}?${queryString}`
        : path;
}


/**
 * Build a return URL for authentication redirects.
 *
 * This is intentionally limited to same-origin
 * application paths.
 */
export function buildLoginRedirect(
    returnPath
) {
    if (
        typeof returnPath !==
        "string" ||
        returnPath.trim() === ""
    ) {
        return ROUTES.LOGIN;
    }

    let path =
        returnPath.trim();

    /*
     * Only allow relative application paths.
     */
    if (
        !path.startsWith("/")
    ) {
        return ROUTES.LOGIN;
    }

    /*
     * Prevent protocol-relative redirects:
     *
     * //evil.example.com
     */
    if (
        path.startsWith("//")
    ) {
        return ROUTES.LOGIN;
    }

    return buildRoute(
        ROUTES.LOGIN,
        {
            return: path
        }
    );
}


/**
 * Return all protected routes.
 */
export function getProtectedRoutes() {
    return ROUTE_DEFINITIONS.filter(
        (route) =>
            route.protected
    );
}


/**
 * Return all public routes.
 */
export function getPublicRoutes() {
    return ROUTE_DEFINITIONS.filter(
        (route) =>
            route.public
    );
}


/**
 * Freeze route definitions more deeply where practical.
 */
ROUTE_DEFINITIONS.forEach(
    (route) => {
        if (route.meta) {
            Object.freeze(
                route.meta
            );
        }

        Object.freeze(
            route
        );
    }
);


/**
 * Default export.
 */
export default ROUTES;
