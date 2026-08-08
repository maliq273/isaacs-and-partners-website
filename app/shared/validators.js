/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Shared Validators
 * ============================================================
 */

export function isRequired(
    value
) {

    return !(
        value === null ||
        value === undefined ||
        (
            typeof value === "string" &&
            value.trim() === ""
        )
    );

}


export function isEmail(
    value
) {

    if (!value) {

        return false;

    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        .test(
            String(value)
                .trim()
        );

}


export function isPhone(
    value
) {

    if (!value) {

        return false;

    }

    return /^\+?[0-9\s()-]{7,20}$/
        .test(
            String(value)
                .trim()
        );

}


export function isPositiveNumber(
    value
) {

    return (
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0
    );

}


export function isDate(
    value
) {

    if (!value) {

        return false;

    }

    const date =
        new Date(value);

    return !Number.isNaN(
        date.getTime()
    );

}


export function isUrl(
    value
) {

    try {

        new URL(value);

        return true;

    } catch {

        return false;

    }

}


export function hasMinLength(
    value,
    length
) {

    return (
        String(value ?? "")
            .length >= length
    );

}


export function hasMaxLength(
    value,
    length
) {

    return (
        String(value ?? "")
            .length <= length
    );

}


export function isInEnum(
    value,
    enumeration
) {

    return Object.values(
        enumeration
    ).includes(
        value
    );

}


export function validateObject(
    object,
    schema
) {

    const errors = {};

    for (
        const [
            field,
            rules
        ]
        of Object.entries(schema)
    ) {

        const value =
            object?.[field];


        if (
            rules.required &&
            !isRequired(value)
        ) {

            errors[field] =
                "This field is required.";

            continue;

        }


        if (
            value !== undefined &&
            value !== null
        ) {

            if (
                rules.email &&
                !isEmail(value)
            ) {

                errors[field] =
                    "Invalid email address.";

            }


            if (
                rules.phone &&
                !isPhone(value)
            ) {

                errors[field] =
                    "Invalid phone number.";

            }


            if (
                rules.minLength !==
                undefined &&
                !hasMinLength(
                    value,
                    rules.minLength
                )
            ) {

                errors[field] =
                    `Minimum length is ${rules.minLength}.`;

            }


            if (
                rules.maxLength !==
                undefined &&
                !hasMaxLength(
                    value,
                    rules.maxLength
                )
            ) {

                errors[field] =
                    `Maximum length is ${rules.maxLength}.`;

            }


            if (
                rules.enum &&
                !isInEnum(
                    value,
                    rules.enum
                )
            ) {

                errors[field] =
                    "Invalid value.";

            }

        }

    }


    return {

        valid:
            Object.keys(errors)
                .length === 0,

        errors

    };

}


// ============================================================
// FUTURE INSERT
//
// South African ID validation
// Passport validation
// Company registration validation
// SARS tax number validation
// Visa-specific validation
// Document validation
// Security validation
//
// ============================================================
