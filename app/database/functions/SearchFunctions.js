/**
 * SearchFunctions
 * ------------------------------------------------------------
 * Common SQL search helpers.
 */

import {
    normalizeIdentifier,
    quoteIdentifier
} from "./DatabaseFunctions.js";

export function escapeLike(value) {
    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/%/g, "\\%")
        .replace(/_/g, "\\_");
}

export function createSearchPattern(
    value
) {
    const escaped =
        escapeLike(value);

    return `%${escaped}%`;
}

export function createPrefixPattern(
    value
) {
    return `${escapeLike(value)}%`;
}

export function createExactPattern(
    value
) {
    return escapeLike(value);
}

export function buildLikeCondition({
    column,
    parameter = "search",
    caseInsensitive = true
} = {}) {
    const safeColumn =
        quoteIdentifier(
            normalizeIdentifier(
                column
            )
        );

    const expression =
        caseInsensitive
            ? `LOWER(${safeColumn}) LIKE LOWER(:${parameter}) ESCAPE '\\'`
            : `${safeColumn} LIKE :${parameter} ESCAPE '\\'`;

    return {
        sql: expression,
        parameter
    };
}

export function buildMultiColumnSearch({
    columns = [],
    parameter = "search"
} = {}) {
    if (!Array.isArray(columns)) {
        throw new TypeError(
            "columns must be an array"
        );
    }

    if (!columns.length) {
        return {
            sql: "1 = 1",
            parameter
        };
    }

    const conditions =
        columns.map((column) => {
            return buildLikeCondition({
                column,
                parameter
            }).sql;
        });

    return {
        sql: `(${conditions.join(
            " OR "
        )})`,
        parameter
    };
}

export function normalizeSearchTerm(
    value
) {
    return String(value || "")
        .trim()
        .replace(/\s+/g, " ");
}

export default {
    escapeLike,
    createSearchPattern,
    createPrefixPattern,
    createExactPattern,
    buildLikeCondition,
    buildMultiColumnSearch,
    normalizeSearchTerm
};
