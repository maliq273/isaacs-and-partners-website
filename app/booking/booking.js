/**
 * BookingController
 *
 * Client-facing booking orchestration.
 *
 * Responsibilities:
 * - Collect booking information.
 * - Load available services.
 * - Load available staff/providers.
 * - Request availability.
 * - Validate booking selections.
 * - Submit booking requests.
 *
 * Business rules and persistence belong to:
 * BookingEngine / BookingManager / BookingValidator / Repository.
 */

import {
    apiGet,
    apiPost
} from "../js/api.js";

const BookingState = {
    service: null,
    provider: null,
    date: null,
    time: null,
    client: null,
    notes: "",
};

export class BookingController {
    constructor({
        form = null,
        calendar = null,
        confirmation = null,
    } = {}) {
        this.form = form;
        this.calendar = calendar;
        this.confirmation = confirmation;

        this.services = [];
        this.providers = [];
        this.availability = [];

        this.state = {
            ...BookingState,
        };
    }

    async initialise() {
        await this.loadServices();
        await this.loadProviders();

        this.bindEvents();

        return this;
    }

    async loadServices() {
        try {
            const response = await apiGet(
                "/api/booking/services"
            );

            this.services =
                response?.data ||
                response ||
                [];

            this.populateServiceSelect();

            return this.services;
        } catch (error) {
            console.error(
                "Unable to load booking services:",
                error
            );

            this.showError(
                "Unable to load services. Please try again."
            );

            return [];
        }
    }

    async loadProviders() {
        try {
            const response = await apiGet(
                "/api/booking/providers"
            );

            this.providers =
                response?.data ||
                response ||
                [];

            this.populateProviderSelect();

            return this.providers;
        } catch (error) {
            console.error(
                "Unable to load booking providers:",
                error
            );

            return [];
        }
    }

    populateServiceSelect() {
        const select =
            this.form?.querySelector(
                '[name="serviceId"]'
            );

        if (!select) {
            return;
        }

        select.innerHTML = `
            <option value="">
                Select a service
            </option>
        `;

        this.services.forEach(service => {
            const option =
                document.createElement("option");

            option.value = service.id;

            option.textContent =
                service.name ||
                service.title ||
                "Service";

            select.appendChild(option);
        });
    }

    populateProviderSelect() {
        const select =
            this.form?.querySelector(
                '[name="providerId"]'
            );

        if (!select) {
            return;
        }

        select.innerHTML = `
            <option value="">
                Any available professional
            </option>
        `;

        this.providers.forEach(provider => {
            const option =
                document.createElement("option");

            option.value = provider.id;

            option.textContent =
                provider.name ||
                provider.displayName ||
                "Professional";

            select.appendChild(option);
        });
    }

    bindEvents() {
        if (!this.form) {
            return;
        }

        this.form.addEventListener(
            "change",
            event => {
                if (
                    event.target.name === "serviceId"
                ) {
                    this.state.service =
                        event.target.value;

                    this.refreshAvailability();
                }

                if (
                    event.target.name === "providerId"
                ) {
                    this.state.provider =
                        event.target.value;

                    this.refreshAvailability();
                }

                if (
                    event.target.name === "date"
                ) {
                    this.state.date =
                        event.target.value;

                    this.refreshAvailability();
                }
            }
        );

        this.form.addEventListener(
            "submit",
            event => {
                event.preventDefault();

                this.submit();
            }
        );
    }

    async refreshAvailability() {
        if (!this.state.date) {
            return;
        }

        try {
            const params = new URLSearchParams();

            params.set(
                "date",
                this.state.date
            );

            if (this.state.service) {
                params.set(
                    "serviceId",
                    this.state.service
                );
            }

            if (this.state.provider) {
                params.set(
                    "providerId",
                    this.state.provider
                );
            }

            const response = await apiGet(
                `/api/booking/availability?${params}`
            );

            this.availability =
                response?.data ||
                response ||
                [];

            if (this.calendar) {
                this.calendar.setAvailability(
                    this.availability
                );
            }

            return this.availability;
        } catch (error) {
            console.error(
                "Unable to load availability:",
                error
            );

            this.showError(
                "Unable to load availability."
            );

            return [];
        }
    }

    selectTime(time) {
        this.state.time = time;

        const input =
            this.form?.querySelector(
                '[name="time"]'
            );

        if (input) {
            input.value = time;
        }

        this.updateSummary();
    }

    updateSummary() {
        const summary =
            document.querySelector(
                "[data-booking-summary]"
            );

        if (!summary) {
            return;
        }

        summary.innerHTML = `
            <div>
                <strong>Service</strong>
                <span>
                    ${this.escape(
                        this.getServiceName()
                    )}
                </span>
            </div>

            <div>
                <strong>Date</strong>
                <span>
                    ${this.escape(
                        this.state.date || "Not selected"
                    )}
                </span>
            </div>

            <div>
                <strong>Time</strong>
                <span>
                    ${this.escape(
                        this.state.time || "Not selected"
                    )}
                </span>
            </div>
        `;
    }

    getServiceName() {
        const service =
            this.services.find(
                item =>
                    String(item.id) ===
                    String(this.state.service)
            );

        return service?.name ||
            service?.title ||
            "Not selected";
    }

    async submit() {
        if (!this.form) {
            return;
        }

        const formData =
            new FormData(this.form);

        const payload = {
            serviceId:
                formData.get("serviceId"),

            providerId:
                formData.get("providerId") ||
                null,

            date:
                formData.get("date"),

            time:
                formData.get("time"),

            clientName:
                formData.get("clientName"),

            clientEmail:
                formData.get("clientEmail"),

            clientPhone:
                formData.get("clientPhone"),

            notes:
                formData.get("notes") ||
                null,
        };

        if (
            !payload.serviceId ||
            !payload.date ||
            !payload.time
        ) {
            this.showError(
                "Please select a service, date and time."
            );

            return;
        }

        try {
            this.setSubmitting(true);

            const response =
                await apiPost(
                    "/api/booking",
                    payload
                );

            const booking =
                response?.data ||
                response;

            if (this.confirmation) {
                this.confirmation.show(
                    booking
                );
            }

            this.form.reset();

            this.state = {
                ...BookingState,
            };

            return booking;
        } catch (error) {
            console.error(
                "Booking submission failed:",
                error
            );

            this.showError(
                error?.message ||
                "We could not complete your booking."
            );

            throw error;
        } finally {
            this.setSubmitting(false);
        }
    }

    setSubmitting(value) {
        const button =
            this.form?.querySelector(
                '[type="submit"]'
            );

        if (!button) {
            return;
        }

        button.disabled = value;

        button.textContent =
            value
                ? "Submitting..."
                : "Confirm Booking";
    }

    showError(message) {
        const element =
            document.querySelector(
                "[data-booking-error]"
            );

        if (!element) {
            return;
        }

        element.textContent = message;
        element.hidden = false;
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

export default BookingController;
