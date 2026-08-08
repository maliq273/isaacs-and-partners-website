/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * ============================================================
 *
 * FILE
 * BookingService.js
 *
 * FILE ID
 * SER-012
 *
 * LOCATION
 * app/services/BookingService.js
 *
 * LAYER
 * Application / Service
 *
 * RESPONSIBILITY
 * Central booking and appointment orchestration service.
 *
 * ============================================================
 *
 * BOOKING FLOW
 *
 * Client / Staff / Consultation
 *             ↓
 *       BookingService
 *             ↓
 *      BookingRepository
 *             ↓
 *          Booking
 *             ↓
 *       Appointment
 *             ↓
 *   Matter / Client / Staff
 *             ↓
 *       NotificationService
 *
 * ============================================================
 *
 * RELATED FILES
 *
 * app/booking/booking.js
 * app/booking/calendar.js
 * app/booking/confirmation.js
 * app/booking/index.html
 *
 * app/models/Appointment.js
 * app/models/Client.js
 * app/models/Matter.js
 *
 * app/repositories/BookingRepository.js
 *
 * app/services/NotificationService.js
 *
 * ============================================================
 *
 * DESIGN RULE
 *
 * This service contains application-level booking logic.
 *
 * Database persistence belongs to the repository.
 *
 * Domain behaviour belongs to the domain/model layer.
 *
 * UI behaviour belongs to the booking UI.
 *
 * ============================================================
 */


/*=============================================================
    BOOKING SERVICE
=============================================================*/

export default class BookingService {


    /*=========================================================
        SER-BOOK-001
        Constructor
    =========================================================*/

    constructor({

        bookingRepository = null,

        clientRepository = null,

        matterRepository = null,

        notificationService = null,

        calendarProvider = null,

        logger = null,

        state = null,

        storage = null,

        settings = null

    } = {}) {


        this.bookingRepository =
            bookingRepository;


        this.clientRepository =
            clientRepository;


        this.matterRepository =
            matterRepository;


        this.notificationService =
            notificationService;


        this.calendarProvider =
            calendarProvider;


        this.logger =
            logger;


        this.state =
            state;


        this.storage =
            storage;


        this.settings =
            settings;


        /*
         *=====================================================
         * BOOKING CONFIGURATION
         *=====================================================
         */

        this.defaultDuration =
            30;


        this.minimumDuration =
            15;


        this.maximumDuration =
            480;


        /*
         *=====================================================
         * FUTURE INSERT
         *
         * BUSINESS HOURS ENGINE
         *
         * Future configuration should come from:
         *
         * app/config/settings.js
         *
         * app/config/workflow.config.js
         *
         * It will support:
         *
         * office opening hours
         * branch hours
         * public holidays
         * staff working hours
         * lunch breaks
         * blocked periods
         * emergency bookings
         *=====================================================
         */


        /*
         *=====================================================
         * FUTURE INSERT
         *
         * BRANCH / OFFICE CALENDAR
         *
         * Future booking architecture:
         *
         * Branch
         *   ↓
         * Calendar
         *   ↓
         * Staff Availability
         *   ↓
         * Appointment Slots
         *=====================================================
         */

    }


    /*=========================================================
        SER-BOOK-002
        Create Booking
    =========================================================*/

    async createBooking({

        clientId = null,

        matterId = null,

        staffId = null,

        type = null,

        title = "",

        description = "",

        date = null,

        startTime = null,

        endTime = null,

        duration = null,

        location = null,

        notes = "",

        status = "PENDING",

        metadata = {}

    } = {}) {


        if (!clientId) {

            throw new Error(
                "Client ID is required."
            );

        }


        if (!date) {

            throw new Error(
                "Booking date is required."
            );

        }


        if (!startTime) {

            throw new Error(
                "Booking start time is required."
            );

        }


        const bookingData =
            this.prepareBookingData({

                clientId,

                matterId,

                staffId,

                type,

                title,

                description,

                date,

                startTime,

                endTime,

                duration,

                location,

                notes,

                status,

                metadata

            });


        await this.validateBooking(
            bookingData
        );


        /*
         *=====================================================
         * FUTURE INSERT
         *
         * APPOINTMENT DOMAIN OBJECT
         *
         * Once Appointment.js is fully integrated, the service
         * should construct and validate the domain object here.
         *
         * Example:
         *
         * const appointment = new Appointment(bookingData);
         *
         * appointment.validate();
         *=====================================================
         */


        let booking;


        if (
            this.bookingRepository &&
            typeof this.bookingRepository.create ===
            "function"
        ) {

            booking =
                await this.bookingRepository.create(
                    bookingData
                );

        } else {

            booking =
                this.createTemporaryBooking(
                    bookingData
                );

        }


        await this.afterBookingCreated(
            booking
        );


        return booking;

    }


    /*=========================================================
        SER-BOOK-003
        Prepare Booking Data
    =========================================================*/

    prepareBookingData(
        data
    ) {


        const duration =
            this.resolveDuration(
                data.duration
            );


        const endTime =
            data.endTime ||
            this.calculateEndTime(
                data.startTime,
                duration
            );


        return {

            ...data,

            duration,

            endTime,

            createdAt:
                new Date(),

            updatedAt:
                new Date()

        };

    }


    /*=========================================================
        SER-BOOK-004
        Resolve Duration
    =========================================================*/

    resolveDuration(
        duration
    ) {


        const value =
            Number(
                duration ||
                this.defaultDuration
            );


        if (
            !Number.isFinite(
                value
            )
        ) {

            throw new Error(
                "Booking duration must be numeric."
            );

        }


        if (
            value <
            this.minimumDuration
        ) {

            throw new Error(
                `Booking duration cannot be less than ${this.minimumDuration} minutes.`
            );

        }


        if (
            value >
            this.maximumDuration
        ) {

            throw new Error(
                `Booking duration cannot exceed ${this.maximumDuration} minutes.`
            );

        }


        return value;

    }


    /*=========================================================
        SER-BOOK-005
        Calculate End Time
    =========================================================*/

    calculateEndTime(
        startTime,
        duration
    ) {


        if (!startTime) {

            throw new Error(
                "Start time is required."
            );

        }


        const parts =
            String(
                startTime
            )
                .split(":")
                .map(
                    Number
                );


        if (
            parts.length <
            2 ||
            parts.some(
                value =>
                    !Number.isFinite(
                        value
                    )
            )
        ) {

            throw new Error(
                "Invalid start time."
            );

        }


        const hours =
            parts[0];


        const minutes =
            parts[1];


        const totalMinutes =
            (
                hours * 60
            ) +
            minutes +
            Number(
                duration
            );


        const endHours =
            Math.floor(
                totalMinutes /
                60
            ) % 24;


        const endMinutes =
            totalMinutes %
            60;


        return (

            String(
                endHours
            ).padStart(
                2,
                "0"
            ) +

            ":" +

            String(
                endMinutes
            ).padStart(
                2,
                "0"
            )

        );

    }


    /*=========================================================
        SER-BOOK-006
        Validate Booking
    =========================================================*/

    async validateBooking(
        booking
    ) {


        if (!booking.clientId) {

            throw new Error(
                "Client ID is required."
            );

        }


        if (!booking.date) {

            throw new Error(
                "Booking date is required."
            );

        }


        if (!booking.startTime) {

            throw new Error(
                "Booking start time is required."
            );

        }


        if (!booking.endTime) {

            throw new Error(
                "Booking end time is required."
            );

        }


        if (
            booking.staffId
        ) {

            await this.validateStaffAvailability(
                booking
            );

        }


        await this.validateConflict(
            booking
        );


        /*
         *=====================================================
         * FUTURE INSERT
         *
         * BUSINESS-RULE VALIDATION
         *
         * Add:
         *
         * public holiday validation
         * branch availability
         * service availability
         * staff qualification
         * appointment type restrictions
         * matter restrictions
         * client restrictions
         *=====================================================
         */


        return true;

    }


    /*=========================================================
        SER-BOOK-007
        Validate Staff Availability
    =========================================================*/

    async validateStaffAvailability(
        booking
    ) {


        if (
            !this.bookingRepository
        ) {

            return true;

        }


        if (
            typeof this.bookingRepository
                .findByStaffAndDate !==
            "function"
        ) {

            return true;

        }


        const existing =
            await this.bookingRepository
                .findByStaffAndDate(
                    booking.staffId,
                    booking.date
                );


        if (
            !Array.isArray(
                existing
            )
        ) {

            return true;

        }


        const conflict =
            existing.some(
                appointment =>
                    this.timesOverlap(
                        booking.startTime,
                        booking.endTime,
                        appointment.startTime,
                        appointment.endTime
                    )
            );


        if (
            conflict
        ) {

            throw new Error(
                "Staff member is not available for the selected time."
            );

        }


        return true;

    }


    /*=========================================================
        SER-BOOK-008
        Validate Conflict
    =========================================================*/

    async validateConflict(
        booking
    ) {


        if (
            !this.bookingRepository
        ) {

            return true;

        }


        if (
            typeof this.bookingRepository
                .findConflicts !==
            "function"
        ) {

            return true;

        }


        const conflicts =
            await this.bookingRepository
                .findConflicts(
                    booking
                );


        if (
            Array.isArray(
                conflicts
            ) &&
            conflicts.length
        ) {

            throw new Error(
                "The selected booking time is already occupied."
            );

        }


        return true;

    }


    /*=========================================================
        SER-BOOK-009
        Check Time Overlap
    =========================================================*/

    timesOverlap(
        startA,
        endA,
        startB,
        endB
    ) {


        const aStart =
            this.timeToMinutes(
                startA
            );


        const aEnd =
            this.timeToMinutes(
                endA
            );


        const bStart =
            this.timeToMinutes(
                startB
            );


        const bEnd =
            this.timeToMinutes(
                endB
            );


        return (
            aStart <
            bEnd &&
            bStart <
            aEnd
        );

    }


    /*=========================================================
        SER-BOOK-010
        Convert Time To Minutes
    =========================================================*/

    timeToMinutes(
        time
    ) {


        if (!time) {

            return 0;

        }


        const [
            hours,
            minutes
        ] =
            String(
                time
            )
                .split(":")
                .map(
                    Number
                );


        return (
            hours * 60
        ) +
        minutes;

    }


    /*=========================================================
        SER-BOOK-011
        Get Booking
    =========================================================*/

    async getBooking(
        bookingId
    ) {


        if (!bookingId) {

            throw new Error(
                "Booking ID is required."
            );

        }


        if (
            this.bookingRepository &&
            typeof this.bookingRepository.findById ===
            "function"
        ) {

            return this.bookingRepository.findById(
                bookingId
            );

        }


        return null;

    }


    /*=========================================================
        SER-BOOK-012
        Get Client Bookings
    =========================================================*/

    async getClientBookings(
        clientId
    ) {


        if (!clientId) {

            throw new Error(
                "Client ID is required."
            );

        }


        if (
            this.bookingRepository &&
            typeof this.bookingRepository.findByClientId ===
            "function"
        ) {

            return this.bookingRepository.findByClientId(
                clientId
            );

        }


        return [];

    }


    /*=========================================================
        SER-BOOK-013
        Get Matter Bookings
    =========================================================*/

    async getMatterBookings(
        matterId
    ) {


        if (!matterId) {

            throw new Error(
                "Matter ID is required."
            );

        }


        if (
            this.bookingRepository &&
            typeof this.bookingRepository.findByMatterId ===
            "function"
        ) {

            return this.bookingRepository.findByMatterId(
                matterId
            );

        }


        return [];

    }


    /*=========================================================
        SER-BOOK-014
        Get Staff Bookings
    =========================================================*/

    async getStaffBookings(
        staffId,
        date = null
    ) {


        if (!staffId) {

            throw new Error(
                "Staff ID is required."
            );

        }


        if (
            this.bookingRepository &&
            typeof this.bookingRepository.findByStaffId ===
            "function"
        ) {

            return this.bookingRepository.findByStaffId(
                staffId,
                date
            );

        }


        return [];

    }


    /*=========================================================
        SER-BOOK-015
        Get Available Slots
    =========================================================*/

    async getAvailableSlots({

        date,

        staffId = null,

        duration = null,

        startTime = "08:00",

        endTime = "17:00",

        interval = 30

    } = {}) {


        if (!date) {

            throw new Error(
                "Date is required."
            );

        }


        const bookingDuration =
            this.resolveDuration(
                duration
            );


        const slots = [];


        let current =
            this.timeToMinutes(
                startTime
            );


        const closing =
            this.timeToMinutes(
                endTime
            );


        let existing = [];


        if (
            staffId &&
            this.bookingRepository &&
            typeof this.bookingRepository
                .findByStaffAndDate ===
            "function"
        ) {

            existing =
                await this.bookingRepository
                    .findByStaffAndDate(
                        staffId,
                        date
                    );

        }


        while (
            current +
            bookingDuration <=
            closing
        ) {


            const slotStart =
                this.minutesToTime(
                    current
                );


            const slotEnd =
                this.minutesToTime(
                    current +
                    bookingDuration
                );


            const occupied =
                existing.some(
                    appointment =>
                        this.timesOverlap(
                            slotStart,
                            slotEnd,
                            appointment.startTime,
                            appointment.endTime
                        )
                );


            if (!occupied) {

                slots.push({

                    date,

                    startTime:
                        slotStart,

                    endTime:
                        slotEnd,

                    duration:
                        bookingDuration

                });

            }


            current +=
                Number(
                    interval
                );

        }


        /*
         *=====================================================
         * FUTURE INSERT
         *
         * ADVANCED AVAILABILITY ENGINE
         *
         * Staff working hours
         * Branch hours
         * Holidays
         * Existing appointments
         * Leave
         * Meetings
         * Training
         * Emergency blocks
         *=====================================================
         */


        return slots;

    }


    /*=========================================================
        SER-BOOK-016
        Minutes To Time
    =========================================================*/

    minutesToTime(
        minutes
    ) {


        const hours =
            Math.floor(
                minutes /
                60
            ) % 24;


        const remainder =
            minutes %
            60;


        return (

            String(
                hours
            ).padStart(
                2,
                "0"
            ) +

            ":" +

            String(
                remainder
            ).padStart(
                2,
                "0"
            )

        );

    }


    /*=========================================================
        SER-BOOK-017
        Update Booking
    =========================================================*/

    async updateBooking(
        bookingId,
        updates = {}
    ) {


        if (!bookingId) {

            throw new Error(
                "Booking ID is required."
            );

        }


        const existing =
            await this.getBooking(
                bookingId
            );


        if (!existing) {

            throw new Error(
                "Booking not found."
            );

        }


        const updated = {

            ...existing,

            ...updates,

            updatedAt:
                new Date()

        };


        await this.validateBooking(
            updated
        );


        if (
            this.bookingRepository &&
            typeof this.bookingRepository.update ===
            "function"
        ) {

            const result =
                await this.bookingRepository.update(
                    bookingId,
                    updated
                );


            await this.afterBookingUpdated(
                result
            );


            return result;

        }


        return updated;

    }


    /*=========================================================
        SER-BOOK-018
        Reschedule Booking
    =========================================================*/

    async rescheduleBooking({

        bookingId,

        date,

        startTime,

        endTime = null,

        duration = null

    } = {}) {


        if (!bookingId) {

            throw new Error(
                "Booking ID is required."
            );

        }


        const booking =
            await this.getBooking(
                bookingId
            );


        if (!booking) {

            throw new Error(
                "Booking not found."
            );

        }


        const resolvedDuration =
            this.resolveDuration(
                duration ||
                booking.duration
            );


        const resolvedEndTime =
            endTime ||
            this.calculateEndTime(
                startTime,
                resolvedDuration
            );


        return this.updateBooking(

            bookingId,

            {

                date,

                startTime,

                endTime:
                    resolvedEndTime,

                duration:
                    resolvedDuration

            }

        );

    }


    /*=========================================================
        SER-BOOK-019
        Confirm Booking
    =========================================================*/

    async confirmBooking(
        bookingId
    ) {


        return this.updateBooking(

            bookingId,

            {

                status:
                    "CONFIRMED",

                confirmedAt:
                    new Date()

            }

        );

    }


    /*=========================================================
        SER-BOOK-020
        Cancel Booking
    =========================================================*/

    async cancelBooking({

        bookingId,

        reason = ""

    } = {}) {


        if (!bookingId) {

            throw new Error(
                "Booking ID is required."
            );

        }


        const booking =
            await this.getBooking(
                bookingId
            );


        if (!booking) {

            throw new Error(
                "Booking not found."
            );

        }


        const result =
            await this.updateBooking(

                bookingId,

                {

                    status:
                        "CANCELLED",

                    cancellationReason:
                        reason,

                    cancelledAt:
                        new Date()

                }

            );


        /*
         *=====================================================
         * FUTURE INSERT
         *
         * AUTOMATIC CANCELLATION NOTIFICATION
         *=====================================================
         */


        return result;

    }


    /*=========================================================
        SER-BOOK-021
        Complete Booking
    =========================================================*/

    async completeBooking(
        bookingId
    ) {


        return this.updateBooking(

            bookingId,

            {

                status:
                    "COMPLETED",

                completedAt:
                    new Date()

            }

        );

    }


    /*=========================================================
        SER-BOOK-022
        Mark No Show
    =========================================================*/

    async markNoShow(
        bookingId
    ) {


        return this.updateBooking(

            bookingId,

            {

                status:
                    "NO_SHOW",

                noShowAt:
                    new Date()

            }

        );

    }


    /*=========================================================
        SER-BOOK-023
        Send Booking Confirmation
    =========================================================*/

    async sendConfirmation(
        booking
    ) {


        if (
            !this.notificationService
        ) {

            return null;

        }


        /*
         *=====================================================
         * FUTURE INSERT
         *
         * CLIENT LOOKUP
         *
         * booking.clientId
         * ↓
         * ClientRepository
         * ↓
         * Client
         *=====================================================
         */


        if (
            typeof this.notificationService
                .sendToClient !==
            "function"
        ) {

            return null;

        }


        /*
         * Provider/client resolution will be completed when
         * NotificationService and ClientRepository are wired
         * together.
         */


        return null;

    }


    /*=========================================================
        SER-BOOK-024
        Send Reminder
    =========================================================*/

    async sendReminder(
        booking
    ) {


        if (
            !this.notificationService
        ) {

            return null;

        }


        /*
         *=====================================================
         * FUTURE INSERT
         *
         * AUTOMATED REMINDER ENGINE
         *
         * Suggested schedule:
         *
         * 24 hours before
         * 2 hours before
         * configurable reminders
         *=====================================================
         */


        return null;

    }


    /*=========================================================
        SER-BOOK-025
        After Booking Created
    =========================================================*/

    async afterBookingCreated(
        booking
    ) {


        /*
         *=====================================================
         * FUTURE INSERT
         *
         * POST-CREATION WORKFLOW
         *
         * 1. Persist booking
         * 2. Add timeline entry
         * 3. Send confirmation
         * 4. Notify assigned staff
         * 5. Add calendar event
         * 6. Schedule reminder
         *=====================================================
         */


        if (
            this.state &&
            typeof this.state.set ===
            "function"
        ) {

            this.state.set(
                "lastBooking",
                booking
            );

        }


        return booking;

    }


    /*=========================================================
        SER-BOOK-026
        After Booking Updated
    =========================================================*/

    async afterBookingUpdated(
        booking
    ) {


        /*
         *=====================================================
         * FUTURE INSERT
         *
         * UPDATE WORKFLOW
         *
         * Notify client when:
         *
         * date changes
         * time changes
         * staff changes
         * location changes
         * status changes
         *=====================================================
         */


        return booking;

    }


    /*=========================================================
        SER-BOOK-027
        Calendar Integration
    =========================================================*/

    async syncCalendar(
        booking
    ) {


        if (
            !this.calendarProvider
        ) {

            return null;

        }


        if (
            typeof this.calendarProvider.createEvent ===
            "function"
        ) {

            return this.calendarProvider.createEvent(
                booking
            );

        }


        return null;

    }


    /*=========================================================
        SER-BOOK-028
        Delete Booking
    =========================================================*/

    async deleteBooking(
        bookingId
    ) {


        if (!bookingId) {

            throw new Error(
                "Booking ID is required."
            );

        }


        if (
            !this.bookingRepository ||
            typeof this.bookingRepository.delete !==
            "function"
        ) {

            throw new Error(
                "Booking repository does not support deletion."
            );

        }


        const result =
            await this.bookingRepository.delete(
                bookingId
            );


        /*
         *=====================================================
         * FUTURE INSERT
         *
         * SOFT DELETE POLICY
         *
         * Production should generally prefer:
         *
         * cancelled
         * archived
         * deletedAt
         *
         * rather than permanent deletion.
         *=====================================================
         */


        return result;

    }


    /*=========================================================
        SER-BOOK-029
        Temporary Booking
    =========================================================*/

    createTemporaryBooking(
        data
    ) {


        return {

            id:
                `BOOK-${Date.now()}-` +
                Math.random()
                    .toString(36)
                    .slice(2, 8),

            ...data

        };

    }


    /*=========================================================
        SER-BOOK-030
        Booking Health Check
    =========================================================*/

    async healthCheck() {


        return {

            service:
                "BookingService",

            healthy:
                true,

            repositoryConfigured:
                Boolean(
                    this.bookingRepository
                ),

            clientRepositoryConfigured:
                Boolean(
                    this.clientRepository
                ),

            matterRepositoryConfigured:
                Boolean(
                    this.matterRepository
                ),

            notificationServiceConfigured:
                Boolean(
                    this.notificationService
                ),

            calendarProviderConfigured:
                Boolean(
                    this.calendarProvider
                ),

            timestamp:
                new Date()

        };

    }


    /*=========================================================
        SER-BOOK-031
        FUTURE MASTER BOOKING ENGINE
    =========================================================*/

    /*
     * ========================================================
     * FUTURE INSERT MAP
     * ========================================================
     *
     * BOOKING CREATION
     * --------------------------------------------------------
     *
     * createBooking()
     * prepareBookingData()
     * validateBooking()
     *
     *
     * AVAILABILITY
     * --------------------------------------------------------
     *
     * getAvailableSlots()
     * validateStaffAvailability()
     * validateConflict()
     * timesOverlap()
     *
     *
     * BOOKING MANAGEMENT
     * --------------------------------------------------------
     *
     * getBooking()
     * updateBooking()
     * rescheduleBooking()
     * confirmBooking()
     * cancelBooking()
     * completeBooking()
     * markNoShow()
     * deleteBooking()
     *
     *
     * CLIENT
     * --------------------------------------------------------
     *
     * getClientBookings()
     * getClientAvailability()
     *
     *
     * MATTER
     * --------------------------------------------------------
     *
     * getMatterBookings()
     * linkBookingToMatter()
     *
     *
     * STAFF
     * --------------------------------------------------------
     *
     * getStaffBookings()
     * getStaffAvailability()
     * blockStaffTime()
     * unblockStaffTime()
     *
     *
     * CALENDAR
     * --------------------------------------------------------
     *
     * syncCalendar()
     * createCalendarEvent()
     * updateCalendarEvent()
     * deleteCalendarEvent()
     *
     *
     * NOTIFICATIONS
     * --------------------------------------------------------
     *
     * sendConfirmation()
     * sendReminder()
     * sendCancellation()
     * sendRescheduleNotice()
     *
     *
     * AUTOMATION
     * --------------------------------------------------------
     *
     * scheduleReminder()
     * processReminders()
     * processUpcomingBookings()
     *
     *
     * BRANCHES
     * --------------------------------------------------------
     *
     * getBranchAvailability()
     * getBranchBookings()
     *
     *
     * FUTURE
     * --------------------------------------------------------
     *
     * public holiday engine
     * staff leave engine
     * recurring appointments
     * waiting list
     * appointment deposits
     * appointment payments
     * online booking
     * WhatsApp booking
     * AI booking assistant
     * consultation booking
     * VFS appointment scheduling
     *
     * ========================================================
     */

}
