/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * DocumentPolicy
 * ------------------------------------------------------------
 * Document access, modification and submission policy.
 * ============================================================
 */

export default class DocumentPolicy {

    /**
     * ========================================================
     * FUTURE INSERT
     *
     * Document confidentiality levels
     * Matter-based access
     * AI processing permissions
     * VFS/DHA submission controls
     * Document retention
     * ========================================================
     */

    static canView(user, document) {

        if (!user || !document) {
            return false;
        }

        if (
            this.isAdministrator(user) ||
            this.isSupervisor(user)
        ) {
            return true;
        }

        if (
            document.uploadedBy &&
            document.uploadedBy === user.id
        ) {
            return true;
        }

        if (
            document.userId &&
            document.userId === user.id
        ) {
            return true;
        }

        if (
            document.clientId &&
            document.clientId === user.clientId
        ) {
            return true;
        }

        return this.hasPermission(
            user,
            "DOCUMENT_VIEW"
        );

    }


    static canUpload(user) {

        return (
            this.isAdministrator(user) ||
            this.isSupervisor(user) ||
            this.hasPermission(
                user,
                "DOCUMENT_UPLOAD"
            )
        );

    }


    static canUpdate(user, document) {

        if (!user || !document) {
            return false;
        }

        if (
            this.isAdministrator(user) ||
            this.isSupervisor(user)
        ) {
            return true;
        }

        return (
            document.uploadedBy === user.id &&
            this.hasPermission(
                user,
                "DOCUMENT_UPDATE"
            )
        );

    }


    static canDelete(user, document) {

        if (!user || !document) {
            return false;
        }

        return (
            this.isAdministrator(user) ||
            (
                this.isSupervisor(user) &&
                this.hasPermission(
                    user,
                    "DOCUMENT_DELETE"
                )
            )
        );

    }


    static canDownload(user, document) {

        return this.canView(
            user,
            document
        );

    }


    static canProcessWithAI(
        user,
        document
    ) {

        if (!user || !document) {
            return false;
        }

        if (
            !this.canView(
                user,
                document
            )
        ) {
            return false;
        }

        return (
            this.isAdministrator(user) ||
            this.hasPermission(
                user,
                "DOCUMENT_AI_PROCESS"
            )
        );

    }


    static canSubmit(
        user,
        document
    ) {

        if (!user || !document) {
            return false;
        }

        return (
            this.isAdministrator(user) ||
            this.isSupervisor(user) ||
            this.hasPermission(
                user,
                "DOCUMENT_SUBMIT"
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
    // Document classification
    // Confidential documents
    // Legal privilege
    // Passport/ID protection
    // OCR permissions
    // AI extraction permissions
    // Bundle locking
    //
    // ========================================================

}
