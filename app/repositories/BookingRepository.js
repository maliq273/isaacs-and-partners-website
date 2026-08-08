/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * BookingRepository
 * ============================================================
 */

import BaseRepository
    from "./BaseRepository.js";

export default class BookingRepository
    extends BaseRepository {

    constructor(options = {}) {

        super({

            ...options,

            entityName: "Booking",

            collection:
                options.collection ??
                "bookings",

            serializer:
                options.serializer ??
                null

        });

        // ====================================================
        // FUTURE INSERT
        //
        // Calendar integration
        // Google Calendar
        // Microsoft Calendar
        // WhatsApp reminders
        // Staff availability
        // Booking conflicts
        //
        // ====================================================
    }


    async findByMatter(
        matterId
    ) {

        if (!matterId) {
            return [];
        }

        return this.findWhere({
            matterId
        });

    }


    async findByClient(
        clientId
    ) {

        if (!clientId) {
            return [];
        }

        return this.findWhere({
            clientId
        });

    }


    async findByStaff(
        staffId
    ) {

        if (!staffId) {
            return [];
        }

        return this.findWhere({
            staffId
        });

    }


    async findByStatus(
        status
    ) {

        return this.findWhere({
            status
        });

    }


    async findBetween(
        start,
        end
    ) {

        const startTime =
            new Date(start)
                .getTime();

        const endTime =
            new Date(end)
                .getTime();

        const bookings =
            await this.findAll();

        return bookings.filter(
            booking => {

                const bookingStart =
                    new Date(
                        booking.startTime ??
                        booking.start ??
                        booking.date
                    ).getTime();

                return (
                    bookingStart >= startTime &&
                    bookingStart <= endTime
                );

            }
        );

    }


    async findUpcoming(
        from = new Date()
    ) {

        const fromTime =
            new Date(from)
                .getTime();

        const bookings =
            await this.findAll();

        return bookings
            .filter(
                booking => {

                    const time =
                        new Date(
                            booking.startTime ??
                            booking.start ??
                            booking.date
                        ).getTime();

                    return time >= fromTime;

                }
            )
            .sort(
                (a, b) =>
                    new Date(
                        a.startTime ??
                        a.start ??
                        a.date
                    ).getTime()
                    -
                    new Date(
                        b.startTime ??
                        b.start ??
                        b.date
                    ).getTime()
            );

    }


    async hasConflict(
        start,
        end,
        options = {}
    ) {

        const startTime =
            new Date(start)
                .getTime();

        const endTime =
            new Date(end)
                .getTime();

        const bookings =
            await this.findAll();

        return bookings.some(
            booking => {

                if (
                    options.excludeId &&
                    booking.id ===
                    options.excludeId
                ) {

                    return false;

                }

                const bookingStart =
                    new Date(
                        booking.startTime ??
                        booking.start
                    ).getTime();

                const bookingEnd =
                    new Date(
                        booking.endTime ??
                        booking.end
                    ).getTime();

                return (
                    startTime < bookingEnd &&
                    endTime > bookingStart
                );

            }
        );

    }

}
