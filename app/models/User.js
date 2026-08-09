/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * User
 * ============================================================
 */

import Record from "./base/Record.js";

export default class User extends Record {

    constructor(data = {}) {

        super(data);

        this.username =
            data.username ?? "";

        this.email =
            data.email ?? "";

        this.firstName =
            data.firstName ?? "";

        this.lastName =
            data.lastName ?? "";

        this.phone =
            data.phone ?? "";

        this.role =
            data.role ?? "STAFF";

        this.departmentId =
            data.departmentId ?? null;

        this.permissions = [
            ...(data.permissions ?? [])
        ];

        this.status =
            data.status ?? "ACTIVE";

        this.lastLoginAt =
            data.lastLoginAt ?? null;

        this.lastLogoutAt =
            data.lastLogoutAt ?? null;

        this.mfaEnabled =
            data.mfaEnabled === true;

        this.mfaRequired =
            data.mfaRequired === true;

        this.preferences = {
            ...(data.preferences ?? {})
        };

        // ====================================================
        // FUTURE INSERT
        //
        // Authentication provider
        // Session management
        // MFA
        // User activity tracking
        // Five-minute inactivity kill switch
        // Audit logging
        // ====================================================
    }


    getFullName() {

        return [
            this.firstName,
            this.lastName
        ]
            .filter(Boolean)
            .join(" ");

    }


    hasPermission(
        permission
    ) {

        if (
            [
                "ADMIN",
                "SUPER_ADMIN",
                "ADMINISTRATOR"
            ].includes(
                this.role
            )
        ) {

            return true;

        }

        return this.permissions.includes(
            permission
        );

    }


    addPermission(
        permission
    ) {

        if (
            permission &&
            !this.permissions.includes(
                permission
            )
        ) {

            this.permissions.push(
                permission
            );

            this.touch();

        }

        return this;

    }


    removePermission(
        permission
    ) {

        this.permissions =
            this.permissions.filter(
                item =>
                    item !== permission
            );

        this.touch();

        return this;

    }


    recordLogin() {

        this.lastLoginAt =
            new Date().toISOString();

        this.status =
            "ACTIVE";

        this.touch();

        return this;

    }


    recordLogout() {

        this.lastLogoutAt =
            new Date().toISOString();

        this.touch();

        return this;

    }


    validate() {

        super.validate();

        if (!this.email) {

            throw new Error(
                "User email is required."
            );

        }

        return true;

    }


    // ========================================================
    // FUTURE INSERT
    //
    // Authentication
    // Password policies
    // MFA
    // Session timeout
    // User logs
    // Security monitoring
    // ========================================================

}
