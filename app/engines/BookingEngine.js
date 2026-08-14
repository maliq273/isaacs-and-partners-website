/**
 * BookingEngine
 * ------------------------------------------------------------
 * Coordinates booking operations.
 *
 * Connects to:
 * - BookingService
 * - BookingRepository
 * - AppointmentValidator
 * - NotificationEngine
 * - TimelineEngine
 */

export class BookingEngine {
    constructor({
        bookingService = null,
        bookingRepository = null,
        validator = null,
        notificationEngine = null,
        timelineEngine = null,
        eventDispatcher = null,
        logger = console
    } = {}) {
        this.bookingService =
            bookingService;
        this.bookingRepository =
            bookingRepository;
        this.validator =
            validator;
        this.notificationEngine =
            notificationEngine;
        this.timelineEngine =
            timelineEngine;
        this.eventDispatcher =
            eventDispatcher;
        this.logger = logger;
    }

    async create(
        data,
        options = {}
    ) {
        this.validate(data);

        let booking;

        if (
            this.bookingService?.create
        ) {
            booking =
                await this.bookingService.create(
                    data,
                    options
                );
        } else if (
            this.bookingRepository?.create
        ) {
            booking =
                await this.bookingRepository.create(
                    data
                );
        } else {
            throw new Error(
                "Booking service or repository is required"
            );
        }

        await this.afterCreated(
            booking,
            options
        );

        return booking;
    }

    async update(
        id,
        data,
        options = {}
    ) {
        if (!id) {
            throw new Error(
                "Booking ID is required"
            );
        }

        this.validate(data, {
            partial: true
        });

        if (
            this.bookingService?.update
        ) {
            return this.bookingService.update(
                id,
                data,
                options
            );
        }

        if (
            this.bookingRepository?.update
        ) {
            return this.bookingRepository.update(
                id,
                data
            );
        }

        throw new Error(
            "Booking service or repository is required"
        );
    }

    async cancel(
        id,
        reason = null,
        options = {}
    ) {
        if (
            this.bookingService?.cancel
        ) {
            const result =
                await this.bookingService.cancel(
                    id,
                    reason,
                    options
                );

            await this.emit(
                "domain.appointment.cancelled",
                {
                    id,
                    reason
                }
            );

            return result;
        }

        return this.update(
            id,
            {
                status: "cancelled",
                cancellationReason:
                    reason
            },
            options
        );
    }

    async getAvailableSlots(
        criteria = {},
        options = {}
    ) {
        if (
            this.bookingService?.getAvailableSlots
        ) {
            return this.bookingService.getAvailableSlots(
                criteria,
                options
            );
        }

        if (
            this.bookingRepository?.findAvailable
        ) {
            return this.bookingRepository.findAvailable(
                criteria
            );
        }

        return [];
    }

    async afterCreated(
        booking,
        options
    ) {
        if (
            options.notify !== false &&
            this.notificationEngine
                ?.sendBookingConfirmation
        ) {
            await this.notificationEngine.sendBookingConfirmation(
                booking,
                options
            );
        }

        if (
            this.timelineEngine?.record
        ) {
            await this.timelineEngine.record(
                {
                    type:
                        "appointment.created",
                    booking
                },
                options
            );
        }

        await this.emit(
            "domain.appointment.created",
            booking
        );
    }

    validate(
        data,
        options = {}
    ) {
        if (
            this.validator?.validate
        ) {
            return this.validator.validate(
                data,
                options
            );
        }

        if (!data) {
            throw new Error(
                "Booking data is required"
            );
        }

        return true;
    }

    async emit(
        event,
        payload
    ) {
        if (
            this.eventDispatcher?.emit
        ) {
            return this.eventDispatcher.emit(
                event,
                payload
            );
        }

        return null;
    }
}

export default BookingEngine;
