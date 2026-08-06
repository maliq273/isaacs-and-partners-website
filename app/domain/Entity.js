/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Entity
 * ------------------------------------------------------------
 * Base class for all identifiable domain objects.
 * ============================================================
 */

import BaseModel from "./BaseModel.js";

export default class Entity extends BaseModel {

    constructor(id = null) {

        super();

        if (id) {

            this.id = id;

        } else {

            this.ensureId();

        }

    }

    /**
     * Compare entities by ID
     */

    equals(entity) {

        if (!entity) {

            return false;

        }

        return this.id === entity.id;

    }

    /**
     * Clone this entity
     */

    clone() {

        return new this.constructor().fromJSON(this.toJSON());

    }

    /**
     * Mark entity as modified
     */

    markUpdated(updatedBy = null) {

        this.updatedBy = updatedBy;

        this.touch();

        return this;

    }

    /**
     * Returns true if entity is active
     */

    isActive() {

        return this.active && !this.deleted;

    }

}
