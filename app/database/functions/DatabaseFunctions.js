/**
 * DatabaseFunctions
 * ------------------------------------------------------------
 * Database-level utility functions shared by schema builders,
 * migrations, repositories, queries and storage adapters.
 *
 * SQLite-compatible and dependency-free.
 */

export function normalizeIdentifier(value) {
    if (typeof value !== "string") {
        throw new TypeError(
            "Database identifier must be a string"
        );
    }

    const identifier = value.trim();

    if (!identifier) {
        throw new Error(
            "Database identifier cannot be empty"
        );
    }

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
        throw new Error(
            `Invalid database identifier: ${value}`
        );
    }

    return identifier;
}

export function quoteIdentifier(value) {
    const identifier =
        normalizeIdentifier(value);

    return `"${identifier.replace(/"/g, '""')}"`;
}

export function quoteTableName(tableName) {
    return quoteIdentifier(tableName);
}

export function quoteColumnName(columnName) {
    return quoteIdentifier(columnName);
}

export function createPlaceholders(
    count,
    prefix = "param"
) {
    if (!Number.isInteger(count) || count < 0) {
        throw new TypeError(
            "Placeholder count must be a non-negative integer"
        );
    }

    return Array.from(
        { length: count },
        (_, index) =>
            `:${prefix}${index + 1}`
    );
}

export function createParameterObject(
    values = [],
    prefix = "param"
) {
    if (!Array.isArray(values)) {
        throw new TypeError(
            "Values must be an array"
        );
    }

    return values.reduce(
        (params, value, index) => {
            params[`${prefix}${index + 1}`] =
                value;

            return params;
        },
        {}
    );
}

export function normalizeLimit(
    value,
    defaultValue = 50,
    maxValue = 500
) {
    const parsed =
        Number.parseInt(value, 10);

    if (!Number.isFinite(parsed)) {
        return defaultValue;
    }

    return Math.min(
        Math.max(parsed, 1),
        maxValue
    );
}

export function normalizeOffset(value) {
    const parsed =
        Number.parseInt(value, 10);

    if (!Number.isFinite(parsed) || parsed < 0) {
        return 0;
    }

    return parsed;
}

export function normalizeBoolean(value) {
    if (
        value === true ||
        value === 1 ||
        value === "1" ||
        value === "true"
    ) {
        return true;
    }

    if (
        value === false ||
        value === 0 ||
        value === "0" ||
        value === "false"
    ) {
        return false;
    }

    return Boolean(value);
}

export function normalizeNullable(value) {
    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return null;
    }

    return value;
}

export function serializeJSON(value, fallback = null) {
    if (
        value === undefined ||
        value === null
    ) {
        return fallback;
    }

    try {
        return JSON.stringify(value);
    } catch {
        return fallback;
    }
}

export function parseJSON(
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

    if (typeof value === "object") {
        return value;
    }

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

export function nowISO() {
    return new Date().toISOString();
}

export function isValidDate(value) {
    if (!value) {
        return false;
    }

    const date =
        value instanceof Date
            ? value
            : new Date(value);

    return !Number.isNaN(
        date.getTime()
    );
}

export function normalizeDate(
    value,
    fallback = null
) {
    if (!isValidDate(value)) {
        return fallback;
    }

    return (
        value instanceof Date
            ? value
            : new Date(value)
    ).toISOString();
}

export function generateId() {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID ===
            "function"
    ) {
        return crypto.randomUUID();
    }

    return [
        Date.now().toString(36),
        Math.random()
            .toString(36)
            .slice(2),
        Math.random()
            .toString(36)
            .slice(2)
    ].join("-");
}

export default {
    normalizeIdentifier,
    quoteIdentifier,
    quoteTableName,
    quoteColumnName,
    createPlaceholders,
    createParameterObject,
    normalizeLimit,
    normalizeOffset,
    normalizeBoolean,
    normalizeNullable,
    serializeJSON,
    parseJSON,
    nowISO,
    isValidDate,
    normalizeDate,
    generateId
};
