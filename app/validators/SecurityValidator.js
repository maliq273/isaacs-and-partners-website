/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * SecurityValidator
 * ============================================================
 *
 * LOCATION
 * app/validators/SecurityValidator.js
 *
 * PURPOSE
 * Security-focused validation.
 *
 * IMPORTANT
 * This is validation only. Authentication and authorization
 * remain handled by the authentication/security layers.
 * ============================================================
 */

export default class SecurityValidator {

    static validateSession(
        session
    ) {

        const errors = [];

        if (!session) {
            errors.push(
                "Session is required."
            );
        }

        if (
            session &&
            !session.userId
        ) {
            errors.push(
                "Session user ID is required."
            );
        }

        if (
            session &&
            session.active !== true
        ) {
            errors.push(
                "Session is inactive."
            );
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    static validatePermission({
        user,
        permission
    } = {}) {

        const errors = [];

        if (!user) {
            errors.push(
                "User is required."
            );
        }

        if (!permission) {
            errors.push(
                "Permission is required."
            );
        }

        if (
            user &&
            permission
        ) {

            const permissions =
                user.permissions || [];

            if (
                !permissions.includes(
                    permission
                )
            ) {
                errors.push(
                    "User does not have the required permission."
                );
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    static validateInput(
        value,
        {
            required = false,
            maxLength = null
        } = {}
    ) {

        const errors = [];

        if (
            required &&
            (
                value === null ||
                value === undefined ||
                String(value).trim() === ""
            )
        ) {
            errors.push(
                "Input is required."
            );
        }

        if (
            maxLength !== null &&
            value !== null &&
            value !== undefined &&
            String(value).length >
            maxLength
        ) {
            errors.push(
                `Input exceeds maximum length of ${maxLength}.`
            );
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    static assert(result) {

        if (!result || !result.valid) {

            throw new Error(
                (
                    result?.errors ||
                    ["Security validation failed."]
                ).join(" ")
            );
        }

        return true;
    }

    /*
     * ========================================================
     * FUTURE INSERT
     *
     * RBAC
     * Permission matrix
     * Session timeout
     * CSRF
     * XSS
     * Rate limiting
     * Audit logging
     * Encryption
     * Sensitive-data handling
     * ========================================================
     */
}
