/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * SecurityPolicy
 * ------------------------------------------------------------
 * Central security policy layer.
 * ============================================================
 */

export default class SecurityPolicy {

    /**
     * ========================================================
     * FUTURE INSERT
     *
     * Authentication policy
     * Session policy
     * Password policy
     * MFA policy
     * Device policy
     * IP restrictions
     * Audit requirements
     * ========================================================
     */

    static isAuthenticated(user) {

        return Boolean(
            user &&
            user.id &&
            user.isAuthenticated !== false
        );

    }


    static isActive(user) {

        return Boolean(
            user &&
            user.active !== false &&
            user.status !== "DISABLED" &&
            user.status !== "SUSPENDED"
        );

    }


    static canAccessApplication(user) {

        return (
            this.isAuthenticated(user) &&
            this.isActive(user)
        );

    }


    static canPerform(
        user,
        permission
    ) {

        if (
            !this.canAccessApplication(
                user
            )
        ) {
            return false;
        }

        if (
            this.isAdministrator(user)
        ) {
            return true;
        }

        return (
            Array.isArray(
                user.permissions
            ) &&
            user.permissions.includes(
                permission
            )
        );

    }


    static isAdministrator(user) {

        return [
            "ADMIN",
            "SUPER_ADMIN",
            "ADMINISTRATOR"
        ].includes(
            user?.role
        );

    }


    static isSupervisor(user) {

        return [
            "SUPERVISOR",
            "MANAGER"
        ].includes(
            user?.role
        );

    }


    static requiresMFA(user) {

        if (!user) {
            return true;
        }

        return Boolean(
            user.mfaRequired === true
        );

    }


    static canAccessSensitiveData(user) {

        return (
            this.canAccessApplication(
                user
            ) &&
            (
                this.isAdministrator(user) ||
                this.isSupervisor(user) ||
                this.canPerform(
                    user,
                    "SENSITIVE_DATA_VIEW"
                )
            )
        );

    }


    // ========================================================
    // FUTURE INSERT
    //
    // POPIA security controls
    // Session timeout
    // Automatic logout
    // User inactivity detection
    // Audit logging
    // Brute-force protection
    // Rate limiting
    // Encryption requirements
    // ========================================================

}
