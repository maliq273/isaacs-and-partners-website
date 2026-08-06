/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * ValueObject
 * ------------------------------------------------------------
 * Base class for immutable value objects.
 * Examples:
 * - Email
 * - Address
 * - Passport Number
 * - Phone Number
 * - Money
 * ============================================================
 */

export default class ValueObject {

    constructor(values = {}) {

        Object.assign(this, values);

        Object.freeze(this);

    }

    /**
     * Compare two value objects
     */

    equals(other) {

        if (!other) {

            return false;

        }

        return JSON.stringify(this) === JSON.stringify(other);

    }

    /**
     * Convert to JSON
     */

    toJSON() {

        return JSON.parse(JSON.stringify(this));

    }

    /**
     * Create a new instance with updated values
     * (Value Objects are immutable.)
     */

    copy(changes = {}) {

        return new this.constructor({

            ...this.toJSON(),

            ...changes

        });

    }

}
