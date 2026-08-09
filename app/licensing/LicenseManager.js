/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * License Manager
 * ------------------------------------------------------------
 * Coordinates license, activation and subscription lifecycle.
 * ============================================================
 */

import License from "./License.js";
import Activation from "./Activation.js";
import LicenseValidator from "./LicenseValidator.js";

export default class LicenseManager {

    constructor({
        storage = null,
        validator = null,
        logger = null
    } = {}) {

        this.storage =
            storage;

        this.validator =
            validator ??
            new LicenseValidator({
                logger
            });

        this.logger =
            logger;

        this.currentLicense =
            null;

        // ====================================================
        // FUTURE INSERT
        // ----------------------------------------------------
        // Remote licensing API
        // Subscription provider
        // License server
        // Offline cache
        // Signed license verification
        // ====================================================
    }


    async load(
        licenseData
    ) {

        const license =
            licenseData instanceof License
                ? licenseData
                : new License(
                    licenseData
                );

        this.validator.assertValid(
            license
        );

        this.currentLicense =
            license;

        return license;

    }


    async activate(
        data = {}
    ) {

        if (
            !this.currentLicense
        ) {

            throw new Error(
                "No license is loaded."
            );

        }

        this.validator.assertValid(
            this.currentLicense
        );

        if (
            !this.validator.canActivate(
                this.currentLicense
            )
        ) {

            throw new Error(
                "License cannot be activated."
            );

        }

        const activation =
            data instanceof Activation
                ? data
                : new Activation({
                    ...data,
                    licenseId:
                        this.currentLicense.id
                });

        this.currentLicense.activate(
            activation.toJSON()
        );

        await this.persist();

        return activation;

    }


    validate() {

        if (
            !this.currentLicense
        ) {

            return {
                valid: false,
                errors: [
                    "No license is loaded."
                ]
            };

        }

        const validation =
            this.validator.validate(
                this.currentLicense
            );

        if (
            validation.valid &&
            this.currentLicense.hasExpired()
        ) {

            return {
                valid: false,
                errors: [
                    "License has expired."
                ]
            };

        }

        return validation;

    }


    isLicensed() {

        const result =
            this.validate();

        return (
            result.valid &&
            this.currentLicense.isActive()
        );

    }


    getLicense() {

        return this.currentLicense;

    }


    async persist() {

        if (
            !this.storage
        ) {

            return null;

        }

        if (
            typeof this.storage.set ===
            "function"
        ) {

            await this.storage.set(
                "application_license",
                this.currentLicense.toJSON()
            );

            return true;

        }

        if (
            typeof this.storage.save ===
            "function"
        ) {

            await this.storage.save(
                "application_license",
                this.currentLicense.toJSON()
            );

            return true;

        }

        return null;

    }


    async restore() {

        if (
            !this.storage
        ) {

            return null;

        }

        let data = null;

        if (
            typeof this.storage.get ===
            "function"
        ) {

            data =
                await this.storage.get(
                    "application_license"
                );

        }

        if (
            !data
        ) {

            return null;

        }

        return this.load(
            data
        );

    }


    revoke() {

        if (
            !this.currentLicense
        ) {

            throw new Error(
                "No license is loaded."
            );

        }

        this.currentLicense.revoke();

        return this.persist();

    }


    suspend() {

        if (
            !this.currentLicense
        ) {

            throw new Error(
                "No license is loaded."
            );

        }

        this.currentLicense.suspend();

        return this.persist();

    }


    // ========================================================
    // FUTURE INSERT
    // --------------------------------------------------------
    // ========================================================
    // LICENSING SERVER
    // ========================================================
    // License issuance
    // License renewal
    // License revocation
    // License transfer
    // License recovery
    // ========================================================

    // ========================================================
    // FUTURE INSERT
    // --------------------------------------------------------
    // ========================================================
    // PRODUCT ENTITLEMENTS
    // ========================================================
    // Immigration module
    // HR/IR module
    // Legal module
    // AI module
    // Client portal
    // VFS/DHA bundle engine
    // ========================================================

    // ========================================================
    // FUTURE INSERT
    // --------------------------------------------------------
    // ========================================================
    // SUBSCRIPTION BILLING
    // ========================================================
    // Monthly subscriptions
    // Annual subscriptions
    // Failed payments
    // Grace periods
    // Subscription suspension
    // ========================================================

}
