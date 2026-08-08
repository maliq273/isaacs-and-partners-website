/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * WorkflowPolicy
 * ------------------------------------------------------------
 * Workflow authorisation and execution policy.
 * ============================================================
 */

export default class WorkflowPolicy {

    /**
     * ========================================================
     * FUTURE INSERT
     *
     * Workflow permissions
     * Approval chains
     * Human-review gates
     * Escalation rules
     * AI execution limits
     * ========================================================
     */

    static canView(user, workflow) {

        if (!user || !workflow) {
            return false;
        }

        if (
            this.isAdministrator(user) ||
            this.isSupervisor(user)
        ) {
            return true;
        }

        if (
            workflow.assignedTo === user.id
        ) {
            return true;
        }

        if (
            workflow.userId === user.id
        ) {
            return true;
        }

        return this.hasPermission(
            user,
            "WORKFLOW_VIEW"
        );

    }


    static canStart(user, workflow) {

        if (!user || !workflow) {
            return false;
        }

        return (
            this.isAdministrator(user) ||
            this.isSupervisor(user) ||
            this.hasPermission(
                user,
                "WORKFLOW_START"
            )
        );

    }


    static canExecute(user, workflow) {

        if (!user || !workflow) {
            return false;
        }

        if (
            this.isAdministrator(user) ||
            this.isSupervisor(user)
        ) {
            return true;
        }

        if (
            workflow.assignedTo === user.id
        ) {
            return this.hasPermission(
                user,
                "WORKFLOW_EXECUTE"
            );
        }

        return false;

    }


    static canApprove(user, workflow) {

        if (!user || !workflow) {
            return false;
        }

        return (
            this.isAdministrator(user) ||
            this.isSupervisor(user) ||
            this.hasPermission(
                user,
                "WORKFLOW_APPROVE"
            )
        );

    }


    static canPause(user, workflow) {

        return (
            this.canExecute(
                user,
                workflow
            ) ||
            this.isSupervisor(user)
        );

    }


    static canResume(user, workflow) {

        return this.canPause(
            user,
            workflow
        );

    }


    static canCancel(user, workflow) {

        if (!user || !workflow) {
            return false;
        }

        return (
            this.isAdministrator(user) ||
            (
                this.isSupervisor(user) &&
                this.hasPermission(
                    user,
                    "WORKFLOW_CANCEL"
                )
            )
        );

    }


    static canDelete(user, workflow) {

        if (!user || !workflow) {
            return false;
        }

        return this.isAdministrator(user);

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
    // Decision-engine authorisation
    // AI workflow execution
    // Mandatory human approval
    // Workflow rollback
    // Workflow locking
    // Escalation
    // ========================================================

}
