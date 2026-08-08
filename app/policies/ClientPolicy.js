/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * ClientPolicy
 * ------------------------------------------------------------
 * Client access and privacy policy.
 * ============================================================
 */

export default class ClientPolicy {

    /**
     * ========================================================
     * FUTURE INSERT
     *
     * POPIA access controls
     * Client consent
     * Portal permissions
     * Data-retention rules
     * Sensitive-field restrictions
     * ========================================================
     */

    static canView(user, client) {

        if (!user || !client) {
            return false;
        }

        if (
            this.isAdministrator(user) ||
            this.isSupervisor(user)
        ) {
            return true;
        }

        if (
            client.userId &&
            client.userId === user.id
        ) {
            return true;
        }

        if (
            client.id &&
            client.id === user.clientId
        ) {
            return true;
        }

        if (
            Array.isArray(user.clientIds) &&
            user.clientIds.includes(client.id)
        ) {
            return true;
        }

        return this.hasPermission(
            user,
            "CLIENT_VIEW"
        );

    }


    static canCreate(user) {

        return (
            this.isAdministrator(user) ||
            this.isSupervisor(user) ||
            this.hasPermission(
                user,
                "CLIENT_CREATE"
            )
        );

    }


    static canUpdate(user, client) {

        if (!user || !client) {
            return false;
        }

        if (
            this.isAdministrator(user) ||
            this.isSupervisor(user)
        ) {
            return true;
        }

        return (
            client.userId === user.id ||
            this.hasPermission(
                user,
                "CLIENT_UPDATE"
            )
        );

    }


    static canDelete(user, client) {

        if (!user || !client) {
            return false;
        }

        return (
            this.isAdministrator(user) ||
            (
                this.isSupervisor(user) &&
                this.hasPermission(
                    user,
                    "CLIENT_DELETE"
                )
            )
        );

    }


    static canExport(user) {

        return (
            this.isAdministrator(user) ||
            this.hasPermission(
                user,
                "CLIENT_EXPORT"
            )
        );

    }


    static canViewSensitiveData(user) {

        return (
            this.isAdministrator(user) ||
            this.isSupervisor(user) ||
            this.hasPermission(
                user,
                "CLIENT_SENSITIVE_VIEW"
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


    static hasPermission(
        user,
        permission
    ) {

        return Array.isArray(
            user?.permissions
        ) &&
        user.permissions.includes(
            permission
        );

    }


    // ========================================================
    // FUTURE INSERT
    //
    // POPIA consent verification
    // Identity verification
    // Client portal restrictions
    // Data anonymisation
    // Right-of-access workflow
    //
    // ========================================================

}
