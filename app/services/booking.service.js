/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * booking.service.js
 * ============================================================
 *
 * LOCATION
 * app/services/booking.service.js
 *
 * PURPOSE
 * Legacy compatibility adapter.
 *
 * MAIN SERVICE
 * BookingService.js
 * ============================================================
 */

import BookingService
    from "./BookingService.js";

const bookingService =
    new BookingService();

export async function createBooking(
    data
) {

    return bookingService.createBooking(
        data
    );

}

export async function getBooking(
    id
) {

    return bookingService.getBooking(
        id
    );

}

export async function updateBooking(
    id,
    updates
) {

    return bookingService.updateBooking(
        id,
        updates
    );

}

export async function confirmBooking(
    id
) {

    return bookingService.confirmBooking(
        id
    );

}

export async function cancelBooking(
    data
) {

    return bookingService.cancelBooking(
        data
    );

}

export async function getAvailableSlots(
    data
) {

    return bookingService.getAvailableSlots(
        data
    );

}


/*
 * ============================================================
 * FUTURE INSERT
 *
 * Do not place independent booking logic here.
 *
 * BookingService.js remains the production authority.
 * ============================================================
 */

export default bookingService;
