import {
    quoteIdentifier
} from "./DatabaseFunctions.js";

/**
 * Generate a CREATE INDEX statement.
 */
export function createIndexSQL({
    indexName,
    tableName,
    columns = [],
    unique = false
}) {
    if (
        !indexName ||
        !tableName ||
        !columns.length
    ) {
        throw new Error(
            "indexName, tableName and columns are required"
        );
    }

    const uniqueKeyword =
        unique ? "UNIQUE " : "";

    const quotedColumns =
        columns
            .map(quoteIdentifier)
            .join(", ");

    return `
        CREATE ${uniqueKeyword}INDEX IF NOT EXISTS
        ${quoteIdentifier(indexName)}
        ON ${quoteIdentifier(tableName)}
        (${quotedColumns});
    `.trim();
}

/**
 * Generate a DROP INDEX statement.
 */
export function dropIndexSQL(
    indexName
) {
    return `
        DROP INDEX IF EXISTS
        ${quoteIdentifier(indexName)};
    `.trim();
}

/**
 * Generate a table existence check.
 */
export function tableExistsSQL(
    tableName
) {
    return {
        sql: `
            SELECT name
            FROM sqlite_master
            WHERE type = 'table'
              AND name = :tableName
            LIMIT 1
        `.trim(),

        parameters: {
            tableName
        }
    };
}

/**
 * Generate an index existence check.
 */
export function indexExistsSQL(
    indexName
) {
    return {
        sql: `
            SELECT name
            FROM sqlite_master
            WHERE type = 'index'
              AND name = :indexName
            LIMIT 1
        `.trim(),

        parameters: {
            indexName
        }
    };
}

export default {
    createIndexSQL,
    dropIndexSQL,
    tableExistsSQL,
    indexExistsSQL
};
