/**
 * DateFunctions
 * ------------------------------------------------------------
 * Database-safe date utilities.
 *
 * Dates are stored as ISO-8601 strings throughout the application.
 */

export function toDatabaseDate(value = null) {
    if (!value) {
        return null;
    }

    const date =
        value instanceof Date
            ? value
            : new Date(value);

    if (Number.isNaN(date.getTime())) {
        throw new TypeError(
            `Invalid date value: ${value}`
        );
    }

    return date.toISOString();
}

export function fromDatabaseDate(value) {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}

export function startOfDay(value = new Date()) {
    const date =
        value instanceof Date
            ? new Date(value)
            : new Date(value);

    date.setHours(0, 0, 0, 0);

    return date;
}

export function endOfDay(value = new Date()) {
    const date =
        value instanceof Date
            ? new Date(value)
            : new Date(value);

    date.setHours(
        23,
        59,
        59,
        999
    );

    return date;
}

export function addDays(
    value,
    days
) {
    const date =
        value instanceof Date
            ? new Date(value)
            : new Date(value);

    if (!Number.isFinite(days)) {
        throw new TypeError(
            "days must be a number"
        );
    }

    date.setDate(
        date.getDate() + days
    );

    return date;
}

export function addMonths(
    value,
    months
) {
    const date =
        value instanceof Date
            ? new Date(value)
            : new Date(value);

    if (!Number.isFinite(months)) {
        throw new TypeError(
            "months must be a number"
        );
    }

    date.setMonth(
        date.getMonth() + months
    );

    return date;
}

export function isExpired(
    value,
    referenceDate = new Date()
) {
    const expiry =
        new Date(value);

    const reference =
        new Date(referenceDate);

    if (
        Number.isNaN(
            expiry.getTime()
        )
    ) {
        return false;
    }

    return expiry.getTime() <
        reference.getTime();
}

export function isFutureDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return false;
    }

    return (
        date.getTime() >
        Date.now()
    );
}

export function differenceInDays(
    start,
    end
) {
    const startDate =
        new Date(start);

    const endDate =
        new Date(end);

    if (
        Number.isNaN(
            startDate.getTime()
        ) ||
        Number.isNaN(
            endDate.getTime()
        )
    ) {
        throw new TypeError(
            "Invalid date supplied"
        );
    }

    const milliseconds =
        endDate.getTime() -
        startDate.getTime();

    return Math.floor(
        milliseconds /
            (1000 * 60 * 60 * 24)
    );
}

export default {
    toDatabaseDate,
    fromDatabaseDate,
    startOfDay,
    endOfDay,
    addDays,
    addMonths,
    isExpired,
    isFutureDate,
    differenceInDays
};
