/**
 * BookingConfirmation
 *
 * Displays successful booking information.
 *
 * The confirmation returned by the backend is authoritative.
 * The client must never manufacture a booking reference.
 */

export default class BookingConfirmation {
    constructor({
        container = null,
        onClose = null,
    } = {}) {
        this.container =
            typeof container === "string"
                ? document.querySelector(container)
                : container;

        this.onClose = onClose;
    }

    show(booking) {
        if (!this.container) {
            return;
        }

        if (!booking) {
            throw new Error(
                "Booking confirmation data is required"
            );
        }

        const reference =
            booking.reference ||
            booking.bookingReference ||
            booking.id ||
            "Pending";

        const service =
            booking.serviceName ||
            booking.service?.name ||
            "Appointment";

        const date =
            booking.date ||
            "To be confirmed";

        const time =
            booking.time ||
            "To be confirmed";

        const provider =
            booking.providerName ||
            booking.provider?.name ||
            "Available professional";

        this.container.hidden = false;

        this.container.innerHTML = `
            <div
                class="booking-confirmation"
                role="dialog"
                aria-modal="true"
                aria-labelledby="booking-confirmation-title"
            >

                <div class="booking-confirmation__card">

                    <div
                        class="booking-confirmation__icon"
                        aria-hidden="true"
                    >
                        ✓
                    </div>

                    <span class="ip-page__eyebrow">
                        Booking Confirmed
                    </span>

                    <h2
                        id="booking-confirmation-title"
                    >
                        Your appointment has been booked
                    </h2>

                    <p>
                        Please keep your booking reference
                        for future communication.
                    </p>

                    <dl
                        class="booking-confirmation__details"
                    >

                        <div>
                            <dt>
                                Booking reference
                            </dt>

                            <dd>
                                ${this.escape(reference)}
                            </dd>
                        </div>

                        <div>
                            <dt>
                                Service
                            </dt>

                            <dd>
                                ${this.escape(service)}
                            </dd>
                        </div>

                        <div>
                            <dt>
                                Date
                            </dt>

                            <dd>
                                ${this.escape(date)}
                            </dd>
                        </div>

                        <div>
                            <dt>
                                Time
                            </dt>

                            <dd>
                                ${this.escape(time)}
                            </dd>
                        </div>

                        <div>
                            <dt>
                                Professional
                            </dt>

                            <dd>
                                ${this.escape(provider)}
                            </dd>
                        </div>

                    </dl>

                    <button
                        type="button"
                        class="ip-button ip-button--primary"
                        data-confirmation-close
                    >
                        Done
                    </button>

                </div>

            </div>
        `;

        const close =
            this.container.querySelector(
                "[data-confirmation-close]"
            );

        close?.addEventListener(
            "click",
            () => this.hide()
        );
    }

    hide() {
        if (!this.container) {
            return;
        }

        this.container.hidden = true;
        this.container.innerHTML = "";

        if (this.onClose) {
            this.onClose();
        }
    }

    escape(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }
}
