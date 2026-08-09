/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Booking Manager
 * ============================================================
 */

export default class BookingManager {

    constructor({
        repository = null,
        bookingService = null,
        notificationService = null,
        eventBus = null,
        logger = null
    } = {}) {

        this.repository = repository;
        this.bookingService = bookingService;
        this.notificationService =
            notificationService;
        this.eventBus = eventBus;
        this.logger = logger;

        // ====================================================
        // FUTURE INSERT
        // ----------------------------------------------------
        // Calendar provider
        // Staff availability
        // Branch availability
        // Appointment conflict engine
        // ====================================================
    }


    async create(
        booking
    ) {

        if (
            this.bookingService &&
            typeof this.bookingService.create ===
            "function"
        ) {

            return this.bookingService.create(
                booking
            );

        }

        if (
            this.repository &&
            typeof this.repository.create ===
            "function"
        ) {

            return this.repository.create(
                booking
            );

        }

        throw new Error(
            "Booking service or repository is not configured."
        );

    }


    async getById(
        id
    ) {

        if (
            this.repository &&
            typeof this.repository.findById ===
            "function"
        ) {

            return this.repository.findById(
                id
            );

        }

        return null;

    }


    async update(
        id,
        changes = {}
    ) {

        if (
            this.bookingService &&
            typeof this.bookingService.update ===
            "function"
        ) {

            return this.bookingService.update(
                id,
                changes
            );

        }

        if (
            this.repository &&
            typeof this.repository.update ===
            "function"
        ) {

            return this.repository.update(
                id,
                changes
            );

        }

        throw new Error(
            "Booking update provider is not configured."
        );

    }


    async cancel(
        id,
        reason = ""
    ) {

        if (
            this.bookingService &&
            typeof this.bookingService.cancel ===
            "function"
        ) {

            return this.bookingService.cancel(
                id,
                reason
            );

        }

        return this.update(
            id,
            {
                status: "CANCELLED",
                cancellationReason: reason
            }
        );

    }


    async notify(
        booking,
        type = "confirmation"
    ) {

        if (
            !this.notificationService
        ) {

            return null;

        }

        if (
            typeof this.notificationService.sendBookingNotification ===
            "function"
        ) {

            return this.notificationService
                .sendBookingNotification(
                    booking,
                    type
                );

        }

        return null;

    }


    // ========================================================
    // FUTURE INSERT
    // --------------------------------------------------------
    // Reminder scheduling
    // WhatsApp confirmations
    // Rescheduling
    // Recurring appointments
    // No-show management
    // ========================================================

}
