/**
 * Isaacs and Partners
 * Application Routes
 */

export const ROUTES = Object.freeze({
    HOME: "/",
    LOGIN: "/login",
    DASHBOARD: "/dashboard/",
    CLIENTS: "/dashboard/clients.html",
    MATTERS: "/dashboard/matters.html",
    REPORTS: "/dashboard/reports.html",
    STAFF: "/dashboard/staff.html",
    AI: "/dashboard/ai.html",
    ANALYTICS: "/dashboard/analytics.html",

    CONSULTATION:
        "/consultation/index.html",

    BOOKING:
        "/booking/index.html",

    CLIENT_PORTAL:
        "/client/index.html",

    DOCUMENTS:
        "/documents/",

    KNOWLEDGEBASE:
        "/knowledgebase/",

    UPLOADS:
        "/uploads/",

    API: "/api",
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
    AI: "/ai",
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
            /^\/+/,
            ""
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
