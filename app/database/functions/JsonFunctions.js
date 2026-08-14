/**
 * JsonFunctions
 * ------------------------------------------------------------
 * Safe JSON handling for SQLite TEXT/JSON-compatible columns.
 */

export function encodeJSON(value) {
    if (
        value === undefined ||
        value === null
    ) {
        return null;
    }

    return JSON.stringify(value);
}

export function decodeJSON(
    value,
    fallback = null
) {
    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return fallback;
    }

    if (
        typeof value === "object"
    ) {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

export function ensureArray(
    value
) {
    const parsed =
        decodeJSON(value, value);

    return Array.isArray(parsed)
        ? parsed
        : [];
}

export function ensureObject(
    value
) {
    const parsed =
        decodeJSON(value, value);

    if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed)
    ) {
        return parsed;
    }

    return {};
}

export function mergeJSONObjects(
    ...values
) {
    return values.reduce(
        (result, value) => {
            Object.assign(
                result,
                ensureObject(value)
            );

            return result;
        },
        {}
    );
}

export function appendJSONArray(
    existing,
    value
) {
    const array =
        ensureArray(existing);

    array.push(value);

    return array;
}

export function removeJSONArrayValue(
    existing,
    predicate
) {
    const array =
        ensureArray(existing);

    return array.filter(
        (item, index) =>
            !predicate(item, index)
    );
}

export default {
    encodeJSON,
    decodeJSON,
    ensureArray,
    ensureObject,
    mergeJSONObjects,
    appendJSONArray,
    removeJSONArrayValue
};
