/**
 * Licensing Feature Rules
 * ------------------------------------------------------------
 * Centralises feature access according to licensing state.
 *
 * This file does not create or validate licences.
 * Licence validation belongs to:
 *
 * app/licensing/LicenseValidator.js
 * app/licensing/LicenseManager.js
 *
 * This module only provides reusable access rules.
 */

export const PLAN_LEVELS = Object.freeze({
    FREE: 0,
    BASIC: 1,
    PROFESSIONAL: 2,
    BUSINESS: 3,
    ENTERPRISE: 4
});

export const LICENSE_STATUS = Object.freeze({
    ACTIVE: "active",
    TRIAL: "trial",
    EXPIRED: "expired",
    SUSPENDED: "suspended",
    REVOKED: "revoked",
    INVALID: "invalid"
});

export function normalisePlan(plan) {
    if (!plan) {
        return "free";
    }

    return String(plan)
        .trim()
        .toLowerCase();
}

export function getPlanLevel(plan) {
    const normalised =
        normalisePlan(plan);

    const aliases = {
        free: "FREE",
        basic: "BASIC",
        professional: "PROFESSIONAL",
        pro: "PROFESSIONAL",
        business: "BUSINESS",
        enterprise: "ENTERPRISE"
    };

    const level =
        aliases[normalised];

    return level
        ? PLAN_LEVELS[level]
        : PLAN_LEVELS.FREE;
}

export function hasMinimumPlan(
    currentPlan,
    requiredPlan
) {
    return (
        getPlanLevel(currentPlan) >=
        getPlanLevel(requiredPlan)
    );
}

export function isLicenseActive(
    license
) {
    if (!license) {
        return false;
    }

    const status =
        String(
            license.status || ""
        ).toLowerCase();

    return (
        status ===
            LICENSE_STATUS.ACTIVE ||
        status ===
            LICENSE_STATUS.TRIAL
    );
}

export function canUseLicensedFeature({
    license,
    requiredPlan = "free"
} = {}) {
    if (!isLicenseActive(license)) {
        return false;
    }

    return hasMinimumPlan(
        license.plan,
        requiredPlan
    );
}

export default {
    PLAN_LEVELS,
    LICENSE_STATUS,
    normalisePlan,
    getPlanLevel,
    hasMinimumPlan,
    isLicenseActive,
    canUseLicensedFeature
};
