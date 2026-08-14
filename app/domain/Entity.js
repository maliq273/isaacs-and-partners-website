/**
 * Entity
 * ------------------------------------------------------------
 * Base domain entity.
 *
 * Equality is identity-based rather than property-based.
 */

export class Entity {
    constructor(props = {}) {
        this.id =
            props.id ||
            Entity.createId();

        this._createdAt =
            props.createdAt ||
            new Date().toISOString();

        this._updatedAt =
            props.updatedAt ||
            this._createdAt;
    }

    get createdAt() {
        return this._createdAt;
    }

    get updatedAt() {
        return this._updatedAt;
    }

    touch() {
        this._updatedAt =
            new Date().toISOString();

        return this;
    }

    equals(other) {
        if (
            other === null ||
            other === undefined
        ) {
            return false;
        }

        if (
            other === this
        ) {
            return true;
        }

        return (
            this.constructor ===
                other.constructor &&
            this.id === other.id
        );
    }

    toJSON() {
        return {
            id: this.id,
            createdAt:
                this.createdAt,
            updatedAt:
                this.updatedAt
        };
    }

    static createId() {
        if (
            typeof crypto !==
                "undefined" &&
            typeof crypto.randomUUID ===
                "function"
        ) {
            return crypto.randomUUID();
        }

        return `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`;
    }
}

export default Entity;
