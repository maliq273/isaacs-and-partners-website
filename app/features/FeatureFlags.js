/**
 * FeatureFlags
 * ------------------------------------------------------------
 * Central feature flag evaluation engine.
 *
 * Connects:
 * - Beta features
 * - Enterprise features
 * - Experimental features
 * - Licensing
 *
 * Existing application modules should ask this class whether
 * a feature is available instead of directly checking plans
 * or environment variables.
 */

import BETA_FEATURES from "./Beta.js";
import ENTERPRISE_FEATURES from "./Enterprise.js";
import EXPERIMENTAL_FEATURES from "./Experimental.js";

import {
    canUseLicensedFeature,
    normalisePlan
} from "./Licensing.js";

const ALL_FEATURES = Object.freeze({
    ...BETA_FEATURES,
    ...ENTERPRISE_FEATURES,
    ...EXPERIMENTAL_FEATURES
});

export class FeatureFlags {
    constructor({
        environment = null,
        license = null,
        flags = {},
        experimental = {},
        logger = console
    } = {}) {
        this.environment =
            environment ||
            this.detectEnvironment();

        this.license = license;

        this.flags = {
            ...flags
        };

        this.experimental = {
            ...experimental
        };

        this.logger = logger;
    }

    detectEnvironment() {
        if (
            typeof globalThis !==
            "undefined" &&
            globalThis.process?.env
                ?.NODE_ENV
        ) {
            return globalThis.process
                .env.NODE_ENV;
        }

        return "production";
    }

    register(
        key,
        enabled
    ) {
        this.flags[key] =
            Boolean(enabled);

        return this;
    }

    registerMany(flags = {}) {
        Object.entries(flags).forEach(
            ([key, value]) => {
                this.register(
                    key,
                    value
                );
            }
        );

        return this;
    }

    setLicense(license) {
        this.license = license;
        return this;
    }

    enableExperimental(key) {
        this.experimental[key] =
            true;

        return this;
    }

    disableExperimental(key) {
        this.experimental[key] =
            false;

        return this;
    }

    getFeature(key) {
        return Object.values(
            ALL_FEATURES
        ).find(
            (feature) =>
                feature.key === key
        ) || null;
    }

    exists(key) {
        return Boolean(
            this.getFeature(key)
        );
    }

    isEnabled(key) {
        const feature =
            this.getFeature(key);

        if (!feature) {
            return false;
        }

        /*
         * Explicit application flag takes precedence,
         * but a flag cannot bypass licensing.
         */
        const explicitlyEnabled =
            this.flags[key];

        if (
            explicitlyEnabled ===
            false
        ) {
            return false;
        }

        if (
            explicitlyEnabled ===
            true
        ) {
            return this.evaluateAccess(
                feature
            );
        }

        if (
            feature.requiresExplicitOptIn
        ) {
            return (
                this.experimental[
                    key
                ] === true &&
                this.evaluateAccess(
                    feature
                )
            );
        }

        if (
            feature.defaultEnabled ===
            true
        ) {
            return this.evaluateAccess(
                feature
            );
        }

        return false;
    }

    evaluateAccess(feature) {
        if (
            Array.isArray(
                feature.environments
            ) &&
            !feature.environments.includes(
                this.environment
            )
        ) {
            return false;
        }

        if (
            feature.requiresLicense
        ) {
            const requiredPlan =
                feature.minimumPlan ||
                "free";

            return canUseLicensedFeature(
                {
                    license:
                        this.license,
                    requiredPlan
                }
            );
        }

        return true;
    }

    require(key) {
        if (!this.isEnabled(key)) {
            const error =
                new Error(
                    `Feature is not available: ${key}`
                );

            error.code =
                "FEATURE_NOT_AVAILABLE";

            error.feature =
                key;

            throw error;
        }

        return true;
    }

    getEnabledFeatures() {
        return Object.values(
            ALL_FEATURES
        )
            .filter((feature) =>
                this.isEnabled(
                    feature.key
                )
            )
            .map(
                (feature) =>
                    feature.key
            );
    }

    getAvailableFeatures() {
        return Object.values(
            ALL_FEATURES
        )
            .filter((feature) =>
                this.evaluateAccess(
                    feature
                )
            );
    }

    getFeatureState(key) {
        const feature =
            this.getFeature(key);

        if (!feature) {
            return {
                key,
                exists: false,
                enabled: false
            };
        }

        return {
            key,
            exists: true,
            enabled:
                this.isEnabled(key),
            environment:
                this.environment,
            plan:
                normalisePlan(
                    this.license?.plan
                ),
            requiresLicense:
                Boolean(
                    feature.requiresLicense
                ),
            requiresExplicitOptIn:
                Boolean(
                    feature.requiresExplicitOptIn
                )
        };
    }

    snapshot() {
        return {
            environment:
                this.environment,
            license: this.license
                ? {
                      status:
                          this.license
                              .status ||
                          null,
                      plan:
                          this.license
                              .plan ||
                          null
                  }
                : null,
            enabled:
                this.getEnabledFeatures()
        };
    }
}

export const createFeatureFlags = (
    options = {}
) =>
    new FeatureFlags(
        options
    );

export default FeatureFlags;
