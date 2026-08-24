/**
 * Isaacs and Partners
 * Application Routes
 *
 * These paths map to real static files/directories in the
 * GitHub Pages deployment.
 */

export const ROUTES = Object.freeze({
    HOME: "/",

    LOGIN: "/app/auth/login.html",
    SIGNUP: "/signup.html",

    DASHBOARD: "/app/dashboard/",
    STAFF_DASHBOARD: "/app/dashboard/",
    INDIVIDUAL_DASHBOARD: "/app/dashboard/client.html",
    BUSINESS_DASHBOARD: "/app/dashboard/business.html",

    CLIENTS: "/app/dashboard/clients.html",
    MATTERS: "/app/dashboard/matters.html",
    REPORTS: "/app/dashboard/reports.html",
    STAFF: "/app/dashboard/staff.html",
    AI: "/app/dashboard/ai.html",
    ANALYTICS: "/app/dashboard/analytics.html",

    CONSULTATION:
        "/app/consultation/index.html",

    BOOKING:
        "/app/booking/index.html",

    CLIENT_PORTAL:
        "/app/dashboard/client.html",

    DOCUMENTS: "/documents/",
    KNOWLEDGEBASE: "/knowledgebase/",
    UPLOADS: "/uploads/",

    API: "/api"
});

export const API_ROUTES = Object.freeze({
    AUTH: "/auth",
    USERS: "/users",
    CLIENTS: "/clients",
    MATTERS: "/matters",
    BOOKINGS: "/bookings",
    CONSULTATIONS: "/consultations",
    DOCUMENTS: "/documents",
    KNOWLEDGE: "/knowledge",
    WORKFLOWS: "/workflows",
    NOTIFICATIONS: "/notifications",
    REPORTS: "/reports",
    SEARCH: "/search",
    UPLOADS: "/uploads",
    AI: "/ai"
});

export function resolveRoute(
    route,
    base = ""
) {
    if (!route) {
        return base || "/";
    }

    const normalisedBase =
        String(base).replace(/\/+$/, "");

    const normalisedRoute =
        String(route).replace(
            /^\/+/, ""
        );

    return normalisedBase
        ? `${normalisedBase}/${normalisedRoute}`
        : `/${normalisedRoute}`;
}

export function getApiRoute(
    resource,
    id = null
) {
    const base =
        API_ROUTES[resource] ||
        resource;

    if (!id) {
        return `${ROUTES.API}/${base}`;
    }

    return `${ROUTES.API}/${base}/${encodeURIComponent(
        id
    )}`;
}

export default ROUTES;
