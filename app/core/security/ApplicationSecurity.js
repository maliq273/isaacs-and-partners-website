/**
 * Isaacs & Partners
 * Application Security Boundary
 *
 * Client-side security coordinator for GitHub Pages.
 *
 * IMPORTANT:
 * - This module is NOT a replacement for Supabase RLS or Edge Function
 *   authorization.
 * - Frontend checks exist to provide correct UX and prevent accidental
 *   navigation into the wrong dashboard.
 * - Sensitive authorization MUST still be enforced by Supabase RLS,
 *   database functions, or authenticated Edge Functions.
 */

import auth from "../../auth/AuthService.js";
import authGuard from "../../auth/AuthGuard.js";
import {
    resolveUserDashboardRole,
    normaliseAccountType
} from "../../dashboard/DashboardAccess.js";

const DASHBOARD_BY_ROLE = Object.freeze({
    SUPER_ADMIN: "/app/dashboard/super-admin.html",
    STAFF: "/app/dashboard/staff.html",
    BUSINESS: "/app/dashboard/business.html",
    INDIVIDUAL: "/app/dashboard/individual.html"
});

const PUBLIC_ROUTES = Object.freeze([
    "/",
    "/index.html",
    "/login.html",
    "/register.html"
]);

function normalisePath(path = "") {
    const value = String(path || "").trim();
    if (!value) return "/";

    try {
        const parsed = new URL(value, window.location.origin);
        const pathname = parsed.pathname.replace(/\\/+$/, "");
        return pathname || "/";
    } catch {
        return value.replace(/\\/+$/, "") || "/";
    }
}

function isPublicRoute(path = window?.location?.pathname || "/") {
    const current = normalisePath(path);
    return PUBLIC_ROUTES.includes(current);
}

export function getDashboardForRole(role) {
    return DASHBOARD_BY_ROLE[normaliseAccountType(role)] || null;
}

export function getAllowedRolesForDashboard(path = "") {
    const current = normalisePath(path);

    for (const [role, dashboard] of Object.entries(DASHBOARD_BY_ROLE)) {
        if (current === dashboard || current.startsWith(`${dashboard}/`)) {
            return [role];
        }
    }

    return [];
}

export async function getSecurityContext() {
    await auth.initialise();

    const user = auth.getCurrentUser();
    const authenticated = Boolean(user && auth.isAuthenticated());

    if (!authenticated) {
        return Object.freeze({
            authenticated: false,
            user: null,
            role: null,
            dashboard: null
        });
    }

    const role = await resolveUserDashboardRole(user);

    return Object.freeze({
        authenticated: true,
        user,
        role,
        dashboard: getDashboardForRole(role)
    });
}

/**
 * Protect the current application page.
 *
 * This is intentionally an application-level guard only. Database RLS and
 * Edge Functions remain the authoritative security boundary.
 */
export async function enforceApplicationAccess({
    path = window?.location?.pathname || "/",
    allowedRoles = null,
    redirect = true
} = {}) {
    const currentPath = normalisePath(path);

    if (isPublicRoute(currentPath)) {
        return { allowed: true, public: true };
    }

    const context = await getSecurityContext();

    if (!context.authenticated) {
        if (redirect) {
            await authGuard.redirectToLogin(currentPath);
        }

        return {
            allowed: false,
            reason: "AUTHENTICATION_REQUIRED",
            context
        };
    }

    const requestedRoles = Array.isArray(allowedRoles)
        ? allowedRoles.map(normaliseAccountType).filter(Boolean)
        : getAllowedRolesForDashboard(currentPath);

    if (requestedRoles.length === 0) {
        return {
            allowed: true,
            context
        };
    }

    const roleAllowed = requestedRoles.includes(context.role);

    if (!roleAllowed) {
        if (redirect && context.dashboard) {
            window.location.replace(context.dashboard);
        }

        return {
            allowed: false,
            reason: "ROLE_NOT_ALLOWED",
            context,
            expectedRoles: requestedRoles
        };
    }

    return {
        allowed: true,
        context
    };
}

export function clearApplicationSecurityCache(userId = null) {
    // DashboardAccess owns the role cache. Importing the clear function here
    // would create unnecessary coupling; session changes cause a fresh page
    // load in the current static-host architecture.
    void userId;
}

export default Object.freeze({
    getDashboardForRole,
    getAllowedRolesForDashboard,
    getSecurityContext,
    enforceApplicationAccess,
    clearApplicationSecurityCache
});
