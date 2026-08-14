/**
 * ValueObject
 * ------------------------------------------------------------
 * Base immutable value object.
 *
 * Value objects are compared by their values rather than IDs.
 */

export class ValueObject {
    constructor(values = {}) {
        this._values = {
            ...values
        };

        Object.freeze(
            this._values
        );

        Object.freeze(this);
    }

    get(key, fallback = undefined) {
        return Object.prototype.hasOwnProperty.call(
            this._values,
            key
        )
            ? this._values[key]
            : fallback;
    }

    toJSON() {
        return {
            ...this._values
        };
    }

    equals(other) {
        if (
            !other ||
            !(
                other instanceof
                ValueObject
            )
        ) {
            return false;
        }

        return ValueObject.deepEqual(
            this._values,
            other._values
        );
    }

    static deepEqual(a, b) {
        if (a === b) {
            return true;
        }

        if (
            a === null ||
            b === null ||
            typeof a !==
                "object" ||
            typeof b !==
                "object"
        ) {
            return false;
        }

        if (
            Array.isArray(a) !==
            Array.isArray(b)
        ) {
            return false;
        }

        const keysA =
            Object.keys(a);

        const keysB =
            Object.keys(b);

        if (
            keysA.length !==
            keysB.length
        ) {
            return false;
        }

        return keysA.every(
            (key) =>
                Object.prototype.hasOwnProperty.call(
                    b,
                    key
                ) &&
                ValueObject.deepEqual(
                    a[key],
                    b[key]
                )
        );
    }
}

export default ValueObject;
