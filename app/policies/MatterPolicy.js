/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * MatterPolicy
 * ------------------------------------------------------------
 * Matter-level authorisation policy.
 * ============================================================
 */

export default class MatterPolicy {

    /**
     * ========================================================
     * FUTURE INSERT
     *
     * Department access
     * Case-handler restrictions
     * Attorney privileges
     * Matter confidentiality
     * Workflow ownership
     * ========================================================
     */

    static canView(user, matter) {

        if (!user || !matter) {
            return false;
        }

        if (
            this.isAdministrator(user) ||
            this.isSupervisor(user)
        ) {
            return true;
        }

        if (
            matter.assignedTo === user.id ||
            matter.consultantId === user.id ||
            matter.attorneyId === user.id
        ) {
            return true;
        }

        if (
            matter.clientId &&
            matter.clientId === user.clientId
        ) {
            return true;
        }

        return this.hasPermission(
            user,
            "MATTER_VIEW"
        );

    }


    static canCreate(user) {

        return (
            this.isAdministrator(user) ||
            this.isSupervisor(user) ||
            this.hasPermission(
                user,
                "MATTER_CREATE"
            )
        );

    }


    static canUpdate(user, matter) {

        if (!user || !matter) {
            return false;
        }

        if (
            this.isAdministrator(user) ||
            this.isSupervisor(user)
        ) {
            return true;
        }

        if (
            matter.assignedTo === user.id ||
            matter.consultantId === user.id ||
            matter.attorneyId === user.id
        ) {
            return this.hasPermission(
                user,
                "MATTER_UPDATE"
            );
        }

        return false;

    }


    static canAssign(user) {

        return (
            this.isAdministrator(user) ||
            this.isSupervisor(user) ||
            this.hasPermission(
                user,
                "MATTER_ASSIGN"
            )
        );

    }


    static canClose(user, matter) {

        if (!user || !matter) {
            return false;
        }

        return (
            this.isAdministrator(user) ||
            this.isSupervisor(user) ||
            (
                matter.attorneyId === user.id &&
                this.hasPermission(
                    user,
                    "MATTER_CLOSE"
                )
            )
        );

    }


    static canArchive(user, matter) {

        if (!user || !matter) {
            return false;
        }

        return (
            this.isAdministrator(user) ||
            (
                this.isSupervisor(user) &&
                this.hasPermission(
                    user,
                    "MATTER_ARCHIVE"
                )
            )
        );

    }


    static canDelete(user, matter) {

        if (!user || !matter) {
            return false;
        }

        return this.isAdministrator(user);

    }


    static canViewAI(
        user,
        matter
    ) {

        if (!this.canView(user, matter)) {
            return false;
        }

        return (
            this.isAdministrator(user) ||
            this.isSupervisor(user) ||
            this.hasPermission(
                user,
                "MATTER_AI_VIEW"
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
    // Matter visibility matrix
    // Department restrictions
    // Legal privilege
    // Conflict-of-interest checks
    // Client confidentiality
    // AI risk restrictions
    // Cross-department access
    //
    // ========================================================

}
