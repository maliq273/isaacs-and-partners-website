/**
 * Isaacs and Partners
 * Dashboard Access
 *
 * Central role/account-type resolver for dashboard navigation.
 * Authentication remains owned by AuthService; this module only
 * determines which already-authenticated dashboard a user should see.
 */

const ROLE_ALIASES = Object.freeze({
    SUPER_ADMIN: "SUPER_ADMIN",
    ADMIN: "SUPER_ADMIN",
    ADMINISTRATOR: "SUPER_ADMIN",
    STAFF: "STAFF",
    EMPLOYEE: "STAFF",
    SUPERVISOR: "STAFF",
    MANAGER: "STAFF",
    BUSINESS: "BUSINESS",
    COMPANY: "BUSINESS",
    COMPANY_ADMIN: "BUSINESS",
    BUSINESS_ADMIN: "BUSINESS",
    INDIVIDUAL: "INDIVIDUAL",
    CLIENT: "INDIVIDUAL",
    CUSTOMER: "INDIVIDUAL"
});

export function normaliseAccountType(value) {
    const key = String(value || "")
        .trim()
        .toUpperCase()
        .replace(/[ -]+/g, "_");

    return ROLE_ALIASES[key] || null;
}

export function getUserDashboardRole(user) {
    if (!user || typeof user !== "object") {
        return null;
    }

    const candidates = [
        user.role,
        user.accountType,
        user.account_type,
        user.userType,
        user.user_type,
        user.metadata?.role,
        user.metadata?.accountType,
        user.metadata?.account_type,
        user.user_metadata?.role,
        user.user_metadata?.accountType,
        user.user_metadata?.account_type,
        user.app_metadata?.role,
        user.app_metadata?.accountType,
        user.app_metadata?.account_type
    ];

    for (const candidate of candidates) {
        const role = normaliseAccountType(candidate);
        if (role) {
            return role;
        }
    }

    return "INDIVIDUAL";
}

export function isSuperAdmin(user) {
    return getUserDashboardRole(user) === "SUPER_ADMIN";
}

export function isStaff(user) {
    return getUserDashboardRole(user) === "STAFF";
}

export function isBusiness(user) {
    return getUserDashboardRole(user) === "BUSINESS";
}

export function isIndividual(user) {
    return getUserDashboardRole(user) === "INDIVIDUAL";
}

export function canAccessDashboard(user, dashboardRole) {
    if (!user) {
        return false;
    }

    const requested = normaliseAccountType(dashboardRole);
    const actual = getUserDashboardRole(user);

    if (actual === "SUPER_ADMIN") {
        return requested === "SUPER_ADMIN" || requested === "STAFF";
    }

    return actual === requested;
}

export default {
    normaliseAccountType,
    getUserDashboardRole,
    isSuperAdmin,
    isStaff,
    isBusiness,
    isIndividual,
    canAccessDashboard
};
