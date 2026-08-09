/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * License Validator
 * ------------------------------------------------------------
 * Validates license integrity and activation eligibility.
 * ============================================================
 */

export default class LicenseValidator {

    constructor({
        logger = null
    } = {}) {

        this.logger =
            logger;

        // ====================================================
        // FUTURE INSERT
        // ----------------------------------------------------
        // Cryptographic signature verification
        // Public-key verification
        // Server-side license verification
        // Offline validation
        // License checksum
        // ====================================================
    }


    validate(
        license
    ) {

        const errors = [];

        if (
            !license
        ) {

            errors.push(
                "License is required."
            );

        }

        if (
            license &&
            !license.licenseKey
        ) {

            errors.push(
                "License key is required."
            );

        }

        if (
            license &&
            !license.product
        ) {

            errors.push(
                "License product is required."
            );

        }

        if (
            license &&
            license.expiresAt
        ) {

            const expiry =
                new Date(
                    license.expiresAt
                );

            if (
                Number.isNaN(
                    expiry.getTime()
                )
            ) {

                errors.push(
                    "License expiry date is invalid."
                );

            }

        }

        return {
            valid:
                errors.length === 0,

            errors
        };

    }


    assertValid(
        license
    ) {

        const result =
            this.validate(
                license
            );

        if (
            !result.valid
        ) {

            throw new Error(
                result.errors.join(" ")
            );

        }

        return true;

    }


    canActivate(
        license
    ) {

        const result =
            this.validate(
                license
            );

        if (
            !result.valid
        ) {
            return false;
        }

        if (
            typeof license.canActivate ===
            "function"
        ) {

            return license.canActivate();

        }

        return (
            license.status !== "revoked" &&
            license.status !== "suspended"
        );

    }


    // ========================================================
    // FUTURE INSERT
    // --------------------------------------------------------
    // Remote license verification
    // Cryptographic validation
    // Subscription validation
    // Feature entitlement validation
    // Expiry grace period
    // ========================================================

}
