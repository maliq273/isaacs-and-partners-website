/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Record
 * ------------------------------------------------------------
 * Base persistence model for application records.
 *
 * All models should ultimately inherit from this class.
 * ============================================================
 */

export default class Record {

    constructor(data = {}) {

        this.id =
            data.id ??
            Record.generateId();

        this.createdAt =
            data.createdAt ??
            new Date().toISOString();

        this.updatedAt =
            data.updatedAt ??
            this.createdAt;

        this.deletedAt =
            data.deletedAt ??
            null;

        this.version =
            Number.isInteger(data.version)
                ? data.version
                : 1;

        this.active =
            data.active !== false;

        this.metadata = {
            ...(data.metadata ?? {})
        };

        // ====================================================
        // FUTURE INSERT
        //
        // Audit fields
        // Created-by / updated-by
        // Tenant/company isolation
        // Soft-delete policy
        // Record locking
        // Record version history
        // ====================================================
    }


    static generateId() {

        return (
            `${Date.now()}_` +
            Math.random()
                .toString(36)
                .slice(2, 10)
        );

    }


    touch() {

        this.updatedAt =
            new Date().toISOString();

        this.version += 1;

        return this;

    }


    activate() {

        this.active = true;

        this.touch();

        return this;

    }


    deactivate() {

        this.active = false;

        this.touch();

        return this;

    }


    softDelete() {

        this.deletedAt =
            new Date().toISOString();

        this.active = false;

        this.touch();

        return this;

    }


    restore() {

        this.deletedAt = null;

        this.active = true;

        this.touch();

        return this;

    }


    isDeleted() {

        return Boolean(
            this.deletedAt
        );

    }


    isActive() {

        return (
            this.active === true &&
            !this.isDeleted()
        );

    }


    setMetadata(
        key,
        value
    ) {

        this.metadata[key] =
            value;

        this.touch();

        return this;

    }


    getMetadata(
        key,
        fallback = null
    ) {

        return (
            this.metadata[key] ??
            fallback
        );

    }


    toJSON() {

        return {
            ...this
        };

    }


    clone() {

        return new this.constructor(
            JSON.parse(
                JSON.stringify(
                    this.toJSON()
                )
            )
        );

    }


    validate() {

        if (!this.id) {

            throw new Error(
                "Record ID is required."
            );

        }

        return true;

    }


    // ========================================================
    // FUTURE INSERT
    //
    // Encryption hooks
    // Persistence hooks
    // Change tracking
    // Domain events
    // Validation pipeline
    // ========================================================

}
