/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Usage
 * ------------------------------------------------------------
 * Tracks application feature and resource usage.
 * ============================================================
 */

export default class Usage {

    constructor(data = {}) {

        this.features = {
            ...(data.features ?? {})
        };

        this.users = {
            ...(data.users ?? {})
        };

        this.resources = {
            ...(data.resources ?? {})
        };

        // ====================================================
        // FUTURE INSERT
        //
        // User activity analytics
        // Tenant usage
        // Subscription limits
        // AI token usage
        // Storage usage
        // API usage
        // ====================================================
    }


    trackFeature(
        feature,
        amount = 1
    ) {

        if (!feature) {

            throw new Error(
                "Feature name is required."
            );

        }

        this.features[feature] =
            Number(
                this.features[feature] ?? 0
            ) +
            Number(amount);

        return this;

    }


    trackUser(
        userId,
        event = "activity"
    ) {

        if (!userId) {

            throw new Error(
                "User ID is required."
            );

        }

        if (!this.users[userId]) {

            this.users[userId] = {};

        }

        this.users[userId][event] =
            Number(
                this.users[userId][event] ?? 0
            ) + 1;

        return this;

    }


    trackResource(
        resource,
        amount = 1
    ) {

        if (!resource) {

            throw new Error(
                "Resource name is required."
            );

        }

        this.resources[resource] =
            Number(
                this.resources[resource] ?? 0
            ) +
            Number(amount);

        return this;

    }


    getFeatureUsage(
        feature
    ) {

        return Number(
            this.features[feature] ?? 0
        );

    }


    getUserUsage(
        userId
    ) {

        return {
            ...(this.users[userId] ?? {})
        };

    }


    getResourceUsage(
        resource
    ) {

        return Number(
            this.resources[resource] ?? 0
        );

    }


    getSummary() {

        return {

            features: {
                ...this.features
            },

            users: {
                ...this.users
            },

            resources: {
                ...this.resources
            }

        };

    }


    reset() {

        this.features = {};
        this.users = {};
        this.resources = {};

        return this;

    }


    // ========================================================
    // FUTURE INSERT
    //
    // Usage quotas
    // Billing integration
    // Subscription enforcement
    // Analytics aggregation
    // ========================================================

}
