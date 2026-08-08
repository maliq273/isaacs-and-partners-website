/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * BookingPolicy
 * ------------------------------------------------------------
 * Authorisation and business-policy rules for bookings.
 * ============================================================
 */

export default class BookingPolicy {

    /**
     * ========================================================
     * FUTURE INSERT
     *
     * Role-based booking permissions
     * Staff availability rules
     * Branch restrictions
     * Calendar restrictions
     * Working-hour rules
     * ========================================================
     */

    static canView(user, booking) {

        if (!user) {
            return false;
        }

        if (!booking) {
            return false;
        }

        if (
            this.isAdministrator(user) ||
            this.isSupervisor(user)
        ) {
            return true;
        }

        if (
            booking.userId &&
            booking.userId === user.id
        ) {
            return true;
        }

        if (
            booking.staffId &&
            booking.staffId === user.id
        ) {
            return true;
        }

        if (
            booking.clientId &&
            booking.clientId === user.clientId
        ) {
            return true;
        }

        return false;

    }


    static canCreate(user) {

        if (!user) {
            return false;
        }

        return (
            this.isAdministrator(user) ||
            this.isSupervisor(user) ||
            this.hasPermission(
                user,
                "BOOKING_CREATE"
            )
        );

    }


    static canUpdate(user, booking) {

        if (!user || !booking) {
            return false;
        }

        if (
            this.isAdministrator(user) ||
            this.isSupervisor(user)
        ) {
            return true;
        }

        return (
            booking.userId === user.id ||
            booking.staffId === user.id
        );

    }


    static canCancel(user, booking) {

        if (!user || !booking) {
            return false;
        }

        if (
            this.isAdministrator(user) ||
            this.isSupervisor(user)
        ) {
            return true;
        }

        return (
            booking.userId === user.id ||
            booking.staffId === user.id
        );

    }


    static canDelete(user, booking) {

        if (!user || !booking) {
            return false;
        }

        return (
            this.isAdministrator(user) ||
            this.isSupervisor(user)
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
    // Appointment conflict validation
    // Cancellation notice periods
    // Client booking restrictions
    // Staff booking limits
    //
    // ========================================================

}
