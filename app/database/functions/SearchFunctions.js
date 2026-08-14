import {
    quoteIdentifier
} from "./DatabaseFunctions.js";

/**
 * Normalize user-entered search text.
 */
export function normalizeSearchText(
    value
) {
    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .trim()
        .replace(/\s+/g, " ");
}

/**
 * Escape SQLite LIKE wildcard characters.
 */
export function escapeLikeValue(
    value
) {
    return normalizeSearchText(
        value
    )
        .replace(/\\/g, "\\\\")
        .replace(/%/g, "\\%")
        .replace(/_/g, "\\_");
}

/**
 * Create a parameter suitable for a LIKE search.
 */
export function createSearchPattern(
    value
) {
    const normalized =
        escapeLikeValue(value);

    return `%${normalized}%`;
}

/**
 * Build a search condition across multiple columns.
 *
 * Example:
 *
 * (
 *   "first_name" LIKE :search ESCAPE '\'
 *   OR
 *   "last_name" LIKE :search ESCAPE '\'
 * )
 */
export function buildMultiColumnSearch({
    columns = [],
    parameter = "search"
} = {}) {
    if (
        !Array.isArray(columns) ||
        !columns.length
    ) {
        return {
            sql: "1 = 1",
            parameters: {}
        };
    }

    const conditions =
        columns.map(
            (column) =>
                `${quoteIdentifier(
                    column
                )} LIKE :${parameter} ESCAPE '\\'`
        );

    return {
        sql: `(${conditions.join(
            " OR "
        )})`,
        parameters: {
            [parameter]: null
        }
    };
}

/**
 * Build a token-based search.
 *
 * Every token must occur in at least one
 * of the supplied columns.
 */
export function buildTokenSearch({
    columns = [],
    tokens = [],
    parameterPrefix = "token"
} = {}) {
    if (
        !columns.length ||
        !tokens.length
    ) {
        return {
            sql: "1 = 1",
            parameters: {}
        };
    }

    const groups = [];
    const parameters = {};

    tokens.forEach(
        (token, tokenIndex) => {
            const parameter =
                `${parameterPrefix}_${tokenIndex}`;

            const conditions =
                columns.map(
                    (column) =>
                        `${quoteIdentifier(
                            column
                        )} LIKE :${parameter} ESCAPE '\\'`
                );

            groups.push(
                `(${conditions.join(
                    " OR "
                )})`
            );

            parameters[
                parameter
            ] =
                createSearchPattern(
                    token
                );
        }
    );

    return {
        sql: groups.join(
            " AND "
        ),
        parameters
    };
}

/**
 * Split a search phrase into normalized tokens.
 */
export function tokenizeSearch(
    value
) {
    const normalized =
        normalizeSearchText(
            value
        );

    if (!normalized) {
        return [];
    }

    return [
        ...new Set(
            normalized
                .split(/\s+/)
                .map(
                    (token) =>
                        token.trim()
                )
                .filter(Boolean)
        )
    ];
}

export default {
    normalizeSearchText,
    escapeLikeValue,
    createSearchPattern,
    buildMultiColumnSearch,
    buildTokenSearch,
    tokenizeSearch
};
