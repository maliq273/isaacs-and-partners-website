/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * License
 * ------------------------------------------------------------
 * Domain model representing an application license.
 * ============================================================
 */

export default class License {

    constructor(data = {}) {

        this.id =
            data.id ??
            null;

        this.licenseKey =
            data.licenseKey ??
            null;

        this.product =
            data.product ??
            "Isaacs & Partners Platform";

        this.customerId =
            data.customerId ??
            null;

        this.status =
            data.status ??
            "inactive";

        this.issuedAt =
            data.issuedAt ??
            null;

        this.expiresAt =
            data.expiresAt ??
            null;

        this.activationLimit =
            data.activationLimit ??
            1;

        this.activations =
            Array.isArray(data.activations)
                ? data.activations
                : [];

        this.metadata =
            data.metadata &&
            typeof data.metadata === "object"
                ? { ...data.metadata }
                : {};

        // ====================================================
        // FUTURE INSERT
        // ----------------------------------------------------
        // Product edition
        // Feature entitlements
        // Branch limits
        // User limits
        // Matter limits
        // AI usage limits
        // Immigration module licensing
        // ====================================================
    }


    isActive(
        now = new Date()
    ) {

        if (
            this.status !== "active"
        ) {
            return false;
        }

        if (
            !this.expiresAt
        ) {
            return true;
        }

        return (
            new Date(this.expiresAt) > now
        );

    }


    hasExpired(
        now = new Date()
    ) {

        if (
            !this.expiresAt
        ) {
            return false;
        }

        return (
            new Date(this.expiresAt) <= now
        );

    }


    canActivate() {

        return (
            this.status !== "revoked" &&
            this.status !== "suspended" &&
            this.activations.length <
            this.activationLimit
        );

    }


    activate(
        activation
    ) {

        if (
            !this.canActivate()
        ) {

            throw new Error(
                "License cannot be activated."
            );

        }

        this.activations.push(
            activation
        );

        this.status =
            "active";

        return this;

    }


    revoke() {

        this.status =
            "revoked";

        return this;

    }


    suspend() {

        this.status =
            "suspended";

        return this;

    }


    toJSON() {

        return {
            id: this.id,
            licenseKey: this.licenseKey,
            product: this.product,
            customerId: this.customerId,
            status: this.status,
            issuedAt: this.issuedAt,
            expiresAt: this.expiresAt,
            activationLimit: this.activationLimit,
            activations: [
                ...this.activations
            ],
            metadata: {
                ...this.metadata
            }
        };

    }

}
