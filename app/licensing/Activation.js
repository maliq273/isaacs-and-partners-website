/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Activation
 * ------------------------------------------------------------
 * Represents one installation/device activation.
 * ============================================================
 */

export default class Activation {

    constructor(data = {}) {

        this.id =
            data.id ??
            null;

        this.licenseId =
            data.licenseId ??
            null;

        this.installationId =
            data.installationId ??
            null;

        this.deviceId =
            data.deviceId ??
            null;

        this.applicationVersion =
            data.applicationVersion ??
            null;

        this.activatedAt =
            data.activatedAt ??
            new Date().toISOString();

        this.lastValidatedAt =
            data.lastValidatedAt ??
            null;

        this.status =
            data.status ??
            "active";

        this.metadata =
            data.metadata &&
            typeof data.metadata === "object"
                ? { ...data.metadata }
                : {};

        // ====================================================
        // FUTURE INSERT
        // ----------------------------------------------------
        // Device fingerprint
        // Branch identifier
        // User identifier
        // IP audit metadata
        // Offline activation
        // Hardware binding
        // ====================================================
    }


    touch() {

        this.lastValidatedAt =
            new Date().toISOString();

        return this;

    }


    deactivate() {

        this.status =
            "inactive";

        return this;

    }


    isActive() {

        return (
            this.status === "active"
        );

    }


    toJSON() {

        return {
            id: this.id,
            licenseId: this.licenseId,
            installationId: this.installationId,
            deviceId: this.deviceId,
            applicationVersion:
                this.applicationVersion,
            activatedAt:
                this.activatedAt,
            lastValidatedAt:
                this.lastValidatedAt,
            status:
                this.status,
            metadata: {
                ...this.metadata
            }
        };

    }

}
