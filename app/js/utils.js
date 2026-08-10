/**
 * Isaacs & Partners
 * Shared frontend utilities.
 */

export function generateId(prefix = "id") {
    if (
        typeof crypto !== "undefined" &&
        crypto.randomUUID
    ) {
        return `${prefix}_${crypto.randomUUID()}`;
    }

    return `${prefix}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 11)}`;
}

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

    if (typeof value === "string") {
        return value.trim().length === 0;
    }

    if (Array.isArray(value)) {
        return value.length === 0;
    }

    if (isObject(value)) {
        return (
            Object.keys(value).length === 0
        );
    }

    return false;
}

export function debounce(
    callback,
    delay = 300
) {
    let timer = null;

    return function (...args) {
        clearTimeout(timer);

        timer = setTimeout(
            () => callback.apply(this, args),
            delay
        );
    };
}

export function throttle(
    callback,
    interval = 300
) {
    let lastExecution = 0;
    let timeout = null;

    return function (...args) {
        const now = Date.now();
        const remaining =
            interval -
            (now - lastExecution);

        if (remaining <= 0) {
            clearTimeout(timeout);

            lastExecution = now;

            callback.apply(
                this,
                args
            );
        } else if (!timeout) {
            timeout = setTimeout(
                () => {
                    timeout = null;
                    lastExecution =
                        Date.now();

                    callback.apply(
                        this,
                        args
                    );
                },
                remaining
            );
        }
    };
}

export function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function formatCurrency(
    amount,
    currency = "ZAR"
) {
    const numeric =
        Number(amount);

    if (Number.isNaN(numeric)) {
        return "R 0.00";
    }

    return new Intl.NumberFormat(
        "en-ZA",
        {
            style: "currency",
            currency
        }
    ).format(numeric);
}

export function formatDate(
    value,
    options = {}
) {
    if (!value) {
        return "";
    }

    const date =
        value instanceof Date
            ? value
            : new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "";
    }

    return new Intl.DateTimeFormat(
        options.locale || "en-ZA",
        options
    ).format(date);
}

export function formatDateTime(
    value
) {
    return formatDate(value, {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

export function normaliseText(value) {
    return String(value ?? "")
        .trim()
        .replace(/\s+/g, " ");
}

export function slugify(value) {
    return normaliseText(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function getNestedValue(
    object,
    path,
    fallback = null
) {
    if (!path) {
        return fallback;
    }

    const result = String(path)
        .split(".")
        .reduce(
            (current, key) =>
                current == null
                    ? undefined
                    : current[key],
            object
        );

    return result === undefined
        ? fallback
        : result;
}

export function setNestedValue(
    object,
    path,
    value
) {
    const keys =
        String(path).split(".");

    let current = object;

    keys.forEach(
        (key, index) => {
            if (
                index ===
                keys.length - 1
            ) {
                current[key] = value;
                return;
            }

            if (
                !isObject(
                    current[key]
                )
            ) {
                current[key] = {};
            }

            current = current[key];
        }
    );

    return object;
}

export function deepClone(value) {
    if (
        typeof structuredClone ===
        "function"
    ) {
        return structuredClone(value);
    }

    return JSON.parse(
        JSON.stringify(value)
    );
}

export function unique(
    values = []
) {
    return Array.from(
        new Set(values)
    );
}

export function sleep(ms) {
    return new Promise(
        (resolve) =>
            setTimeout(resolve, ms)
    );
}

export function clamp(
    value,
    min,
    max
) {
    return Math.min(
        Math.max(
            Number(value),
            min
        ),
        max
    );
}

export function parseJson(
    value,
    fallback = null
) {
    if (
        value === null ||
        value === undefined
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
