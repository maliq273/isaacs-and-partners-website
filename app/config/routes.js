/**
 * Isaacs and Partners
 * Application Routes
 *
 * Central route contract for real static application entry points.
 */

export const ROUTES = Object.freeze({
    HOME: "/",

    LOGIN: "/app/auth/login.html",
    SIGNUP: "/signup.html",

    DASHBOARD: "/app/dashboard/",
    STAFF_DASHBOARD: "/app/dashboard/staff.html",
    SUPER_ADMIN_DASHBOARD: "/app/dashboard/super-admin.html",
    INDIVIDUAL_DASHBOARD: "/app/dashboard/client.html",
    BUSINESS_DASHBOARD: "/app/dashboard/business.html",

    CLIENTS: "/app/dashboard/clients.html",
    MATTERS: "/app/dashboard/matters.html",
    REPORTS: "/app/dashboard/reports.html",
    STAFF: "/app/dashboard/staff.html",
    STAFF_ADMIN: "/app/dashboard/staff-admin.html",
    AI: "/app/dashboard/ai.html",
    ANALYTICS: "/app/dashboard/analytics.html",

    CONSULTATION: "/app/consultation/index.html",
    BOOKING: "/app/booking/index.html",
    CLIENT_PORTAL: "/app/dashboard/client.html",

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
    AI: "/ai",
    INTEGRATIONS: "/integrations"
});

export const ROUTE_NAMES = Object.freeze({
    HOME: "HOME",
    LOGIN: "LOGIN",
    SIGNUP: "SIGNUP",
    DASHBOARD: "DASHBOARD",
    STAFF_DASHBOARD: "STAFF_DASHBOARD",
    SUPER_ADMIN_DASHBOARD: "SUPER_ADMIN_DASHBOARD",
    INDIVIDUAL_DASHBOARD: "INDIVIDUAL_DASHBOARD",
    BUSINESS_DASHBOARD: "BUSINESS_DASHBOARD",
    CLIENTS: "CLIENTS",
    MATTERS: "MATTERS",
    REPORTS: "REPORTS",
    STAFF: "STAFF",
    STAFF_ADMIN: "STAFF_ADMIN",
    AI: "AI",
    ANALYTICS: "ANALYTICS",
    CONSULTATION: "CONSULTATION",
    BOOKING: "BOOKING",
    CLIENT_PORTAL: "CLIENT_PORTAL",
    NOT_FOUND: "NOT_FOUND"
});

export const ROUTE_DEFINITIONS = Object.freeze([
    { name: ROUTE_NAMES.HOME, path: ROUTES.HOME, public: true, protected: false, meta: { title: "Isaacs and Partners" } },
    { name: ROUTE_NAMES.LOGIN, path: ROUTES.LOGIN, public: true, protected: false, meta: { title: "Sign In | Isaacs and Partners" } },
    { name: ROUTE_NAMES.SIGNUP, path: ROUTES.SIGNUP, public: true, protected: false, meta: { title: "Create Account | Isaacs and Partners" } },
    { name: ROUTE_NAMES.DASHBOARD, path: ROUTES.DASHBOARD, public: false, protected: true, meta: { title: "Dashboard | Isaacs and Partners" } },
    { name: ROUTE_NAMES.STAFF_DASHBOARD, path: ROUTES.STAFF_DASHBOARD, public: false, protected: true, meta: { title: "Staff Operations | Isaacs and Partners" } },
    { name: ROUTE_NAMES.SUPER_ADMIN_DASHBOARD, path: ROUTES.SUPER_ADMIN_DASHBOARD, public: false, protected: true, meta: { title: "Super Admin | Isaacs and Partners" } },
    { name: ROUTE_NAMES.INDIVIDUAL_DASHBOARD, path: ROUTES.INDIVIDUAL_DASHBOARD, public: false, protected: true, meta: { title: "Client Dashboard | Isaacs and Partners" } },
    { name: ROUTE_NAMES.BUSINESS_DASHBOARD, path: ROUTES.BUSINESS_DASHBOARD, public: false, protected: true, meta: { title: "Business Dashboard | Isaacs and Partners" } },
    { name: ROUTE_NAMES.CLIENTS, path: ROUTES.CLIENTS, public: false, protected: true, meta: { title: "Clients | Isaacs and Partners" } },
    { name: ROUTE_NAMES.MATTERS, path: ROUTES.MATTERS, public: false, protected: true, meta: { title: "Matters | Isaacs and Partners" } },
    { name: ROUTE_NAMES.REPORTS, path: ROUTES.REPORTS, public: false, protected: true, meta: { title: "Reports | Isaacs and Partners" } },
    { name: ROUTE_NAMES.STAFF, path: ROUTES.STAFF, public: false, protected: true, meta: { title: "Staff Operations | Isaacs and Partners" } },
    { name: ROUTE_NAMES.STAFF_ADMIN, path: ROUTES.STAFF_ADMIN, public: false, protected: true, meta: { title: "Staff Administration | Isaacs and Partners" } },
    { name: ROUTE_NAMES.AI, path: ROUTES.AI, public: false, protected: true, meta: { title: "AI Suite | Isaacs and Partners" } },
    { name: ROUTE_NAMES.ANALYTICS, path: ROUTES.ANALYTICS, public: false, protected: true, meta: { title: "Analytics | Isaacs and Partners" } },
    { name: ROUTE_NAMES.CONSULTATION, path: ROUTES.CONSULTATION, public: true, protected: false, meta: { title: "Consultation | Isaacs and Partners" } },
    { name: ROUTE_NAMES.BOOKING, path: ROUTES.BOOKING, public: true, protected: false, meta: { title: "Booking | Isaacs and Partners" } }
]);

export function resolveRoute(route, base = "") {
    if (!route) return base || "/";
    const normalisedBase = String(base).replace(/\/+$/, "");
    const normalisedRoute = String(route).replace(/^\/+/, "");
    return normalisedBase ? `${normalisedBase}/${normalisedRoute}` : `/${normalisedRoute}`;
}

export function getApiRoute(resource, id = null) {
    const base = API_ROUTES[resource] || resource;
    if (!id) return `${ROUTES.API}/${base}`;
    return `${ROUTES.API}/${base}/${encodeURIComponent(id)}`;
}

export default ROUTES;
