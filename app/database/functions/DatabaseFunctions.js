import crypto from "crypto";

/**
 * Generate a cryptographically strong application identifier.
 *
 * UUID v4 is used so IDs remain independent of database
 * auto-increment behaviour and can safely be generated offline.
 */
export function generateId() {
    if (
        crypto &&
        typeof crypto.randomUUID === "function"
    ) {
        return crypto.randomUUID();
    }

    return [
        crypto.randomBytes(4).toString("hex"),
        crypto.randomBytes(2).toString("hex"),
        crypto.randomBytes(2).toString("hex"),
        crypto.randomBytes(2).toString("hex"),
        crypto.randomBytes(6).toString("hex")
    ].join("-");
}

/**
 * Return the current timestamp in UTC ISO-8601 format.
 */
export function nowISO() {
    return new Date().toISOString();
}

/**
 * Safely quote a SQLite identifier.
 *
 * Identifiers cannot be bound as SQL parameters, therefore they
 * must be validated before being inserted into SQL statements.
 */
export function quoteIdentifier(identifier) {
    if (
        typeof identifier !== "string" ||
        !identifier.trim()
    ) {
        throw new TypeError(
            "SQL identifier must be a non-empty string"
        );
    }

    const value = identifier.trim();

    /*
     * Permit ordinary SQLite identifiers and qualified identifiers.
     *
     * Examples:
     * clients
     * clients.id
     * created_at
     */
    if (
        !/^[A-Za-z_][A-Za-z0-9_.]*$/.test(
            value
        )
    ) {
        throw new Error(
            `Unsafe SQL identifier: ${identifier}`
        );
    }

    return value
        .split(".")
        .map(
            (part) =>
                `"${part.replace(
                    /"/g,
                    '""'
                )}"`
        )
        .join(".");
}

/**
 * Build a safe equality predicate for an identifier.
 */
export function buildEquality(
    column,
    parameter
) {
    return `${quoteIdentifier(
        column
    )} = :${parameter}`;
}

/**
 * Build an IS NULL predicate.
 */
export function buildIsNull(column) {
    return `${quoteIdentifier(
        column
    )} IS NULL`;
}

/**
 * Build an IS NOT NULL predicate.
 */
export function buildIsNotNull(column) {
    return `${quoteIdentifier(
        column
    )} IS NOT NULL`;
}

/**
 * Convert JavaScript values into values appropriate for SQLite.
 */
export function normalizeDatabaseValue(
    value
) {
    if (
        value === undefined
    ) {
        return null;
    }

    if (
        value instanceof Date
    ) {
        return value.toISOString();
    }

    if (
        typeof value === "boolean"
    ) {
        return value ? 1 : 0;
    }

    if (
        value !== null &&
        typeof value === "object"
    ) {
        return JSON.stringify(
            value
        );
    }

    return value;
}

/**
 * Normalize an object before sending it to the database adapter.
 */
export function normalizeParameters(
    parameters = {}
) {
    const result = {};

    for (
        const [
            key,
            value
        ] of Object.entries(
            parameters
        )
    ) {
        result[key] =
            normalizeDatabaseValue(
                value
            );
    }

    return result;
}

/**
 * Build a parameterized INSERT statement.
 */
export function buildInsert(
    table,
    data
) {
    if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data)
    ) {
        throw new TypeError(
            "Insert data must be an object"
        );
    }

    const columns =
        Object.keys(data);

    if (!columns.length) {
        throw new Error(
            "Cannot build INSERT without columns"
        );
    }

    const quotedColumns =
        columns
            .map(quoteIdentifier)
            .join(", ");

    const parameters =
        columns
            .map(
                (column) =>
                    `:${column}`
            )
            .join(", ");

    return {
        sql: `
            INSERT INTO ${quoteIdentifier(
                table
            )}
            (${quotedColumns})
            VALUES (${parameters})
        `.trim(),

        parameters:
            normalizeParameters(
                data
            )
    };
}

/**
 * Build a parameterized UPDATE statement.
 */
export function buildUpdate(
    table,
    data,
    whereSql,
    whereParameters = {}
) {
    if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data)
    ) {
        throw new TypeError(
            "Update data must be an object"
        );
    }

    const entries =
        Object.entries(data);

    if (!entries.length) {
        throw new Error(
            "Cannot build UPDATE without data"
        );
    }

    const assignments =
        entries
            .map(
                ([column]) =>
                    `${quoteIdentifier(
                        column
                    )} = :update_${column}`
            )
            .join(", ");

    const parameters = {};

    for (
        const [
            column,
            value
        ] of entries
    ) {
        parameters[
            `update_${column}`
        ] =
            normalizeDatabaseValue(
                value
            );
    }

    Object.assign(
        parameters,
        normalizeParameters(
            whereParameters
        )
    );

    return {
        sql: `
            UPDATE ${quoteIdentifier(
                table
            )}
            SET ${assignments}
            WHERE ${whereSql}
        `.trim(),

        parameters
    };
}

/**
 * Build a parameterized DELETE statement.
 */
export function buildDelete(
    table,
    whereSql,
    parameters = {}
) {
    return {
        sql: `
            DELETE FROM ${quoteIdentifier(
                table
            )}
            WHERE ${whereSql}
        `.trim(),

        parameters:
            normalizeParameters(
                parameters
            )
    };
}

export default {
    generateId,
    nowISO,
    quoteIdentifier,
    buildEquality,
    buildIsNull,
    buildIsNotNull,
    normalizeDatabaseValue,
    normalizeParameters,
    buildInsert,
    buildUpdate,
    buildDelete
};
