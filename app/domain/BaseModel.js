/**
 * BaseModel
 * ------------------------------------------------------------
 * Common model behaviour for application/domain models.
 *
 * Designed to remain compatible with the existing model layer.
 */

export class BaseModel {
    constructor(props = {}) {
        Object.assign(this, props);

        this.createdAt =
            props.createdAt ||
            new Date().toISOString();

        this.updatedAt =
            props.updatedAt ||
            this.createdAt;
    }

    touch() {
        this.updatedAt =
            new Date().toISOString();

        return this;
    }

    update(props = {}) {
        Object.assign(this, props);
        return this.touch();
    }

    get(key, fallback = undefined) {
        return Object.prototype.hasOwnProperty.call(
            this,
            key
        )
            ? this[key]
            : fallback;
    }

    set(key, value) {
        this[key] = value;
        this.touch();

        return this;
    }

    toJSON() {
        const result = {};

        for (const key of Object.keys(this)) {
            if (
                key.startsWith("_")
            ) {
                continue;
            }

            const value = this[key];

            if (
                value &&
                typeof value.toJSON ===
                    "function"
            ) {
                result[key] =
                    value.toJSON();
            } else if (
                Array.isArray(value)
            ) {
                result[key] =
                    value.map((item) =>
                        item &&
                        typeof item.toJSON ===
                            "function"
                            ? item.toJSON()
                            : item
                    );
            } else {
                result[key] = value;
            }
        }

        return result;
    }

    static fromJSON(data = {}) {
        return new this(data);
    }
}

export default BaseModel;
