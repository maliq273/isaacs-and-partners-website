/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * BaseModel
 * ------------------------------------------------------------
 * Every domain model inherits from this class.
 * ============================================================
 */

export default class BaseModel {

    constructor() {

        this.id = null;

        this.createdAt = new Date().toISOString();

        this.updatedAt = new Date().toISOString();

        this.createdBy = null;

        this.updatedBy = null;

        this.version = 1;

        this.deleted = false;

        this.active = true;

    }

    /**
     * Generate a unique ID
     */

    generateId() {

        return crypto.randomUUID();

    }

    /**
     * Set model ID
     */

    setId(id) {

        this.id = id;

        return this;

    }

    /**
     * Automatically create an ID if one does not exist
     */

    ensureId() {

        if (!this.id) {

            this.id = this.generateId();

        }

        return this.id;

    }

    /**
     * Update timestamp
     */

    touch() {

        this.updatedAt = new Date().toISOString();

        this.version++;

    }

    /**
     * Soft delete
     */

    delete() {

        this.deleted = true;

        this.active = false;

        this.touch();

    }

    /**
     * Restore
     */

    restore() {

        this.deleted = false;

        this.active = true;

        this.touch();

    }

    /**
     * Basic validation
     */

    validate() {

        return true;

    }

    /**
     * Convert to JSON
     */

    toJSON() {

        return JSON.parse(JSON.stringify(this));

    }

    /**
     * Load JSON into model
     */

    fromJSON(data = {}) {

        Object.assign(this, data);

        return this;

    }

}
