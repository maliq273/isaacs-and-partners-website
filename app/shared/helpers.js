/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Shared Helpers
 * ============================================================
 */

export function isObject(value) {

    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );

}


export function isEmpty(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return true;

    }

    if (
        typeof value === "string"
    ) {

        return value.trim().length === 0;

    }

    if (
        Array.isArray(value)
    ) {

        return value.length === 0;

    }

    return false;

}


export function generateId(
    prefix = "id"
) {

    return `${prefix}_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 10)}`;

}


export function generateReference(
    prefix = "MATTER"
) {

    const timestamp =
        Date.now()
            .toString(36)
            .toUpperCase();

    const random =
        Math.random()
            .toString(36)
            .substring(2, 7)
            .toUpperCase();

    return `${prefix}-${timestamp}-${random}`;

}


export function deepClone(value) {

    if (
        typeof structuredClone ===
        "function"
    ) {

        return structuredClone(
            value
        );

    }

    return JSON.parse(
        JSON.stringify(value)
    );

}


export function sleep(
    milliseconds
) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                milliseconds
            )
    );

}


export function formatDate(
    value,
    locale = "en-ZA"
) {

    if (!value) {

        return "";

    }

    return new Intl.DateTimeFormat(
        locale
    ).format(
        new Date(value)
    );

}


export function formatCurrency(
    value,
    currency = "ZAR",
    locale = "en-ZA"
) {

    return new Intl.NumberFormat(
        locale,
        {
            style: "currency",
            currency
        }
    ).format(
        Number(value ?? 0)
    );

}


export function normaliseString(
    value
) {

    return String(
        value ?? ""
    )
        .trim()
        .replace(
            /\s+/g,
            " "
        );

}


export function unique(
    values
) {

    return [
        ...new Set(
            values
        )
    ];

}


export function chunk(
    array,
    size
) {

    const result = [];

    for (
        let index = 0;
        index < array.length;
        index += size
    ) {

        result.push(
            array.slice(
                index,
                index + size
            )
        );

    }

    return result;

}


// ============================================================
// FUTURE INSERT
//
// Date/time helpers
// Document helpers
// Immigration helpers
// Matter helpers
// Currency helpers
// AI helpers
// File helpers
//
// ============================================================
