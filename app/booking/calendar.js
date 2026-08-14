/**
 * BookingCalendar
 *
 * Client-side calendar and time-slot selector.
 *
 * This component displays availability supplied by the
 * booking backend. It does NOT determine whether a slot
 * is legally or operationally bookable.
 */

export default class BookingCalendar {
    constructor({
        container,
        onDateSelected = null,
        onTimeSelected = null,
    } = {}) {
        this.container =
            typeof container === "string"
                ? document.querySelector(container)
                : container;

        this.onDateSelected =
            onDateSelected;

        this.onTimeSelected =
            onTimeSelected;

        this.currentDate =
            new Date();

        this.selectedDate = null;
        this.selectedTime = null;

        this.availability = [];
    }

    render() {
        if (!this.container) {
            return;
        }

        this.container.innerHTML = "";

        const wrapper =
            document.createElement("div");

        wrapper.className =
            "booking-calendar";

        wrapper.innerHTML = `
            <div class="booking-calendar__header">
                <button
                    type="button"
                    data-calendar-prev
                    aria-label="Previous month"
                >
                    &lsaquo;
                </button>

                <strong data-calendar-month></strong>

                <button
                    type="button"
                    data-calendar-next
                    aria-label="Next month"
                >
                    &rsaquo;
                </button>
            </div>

            <div
                class="booking-calendar__days"
                data-calendar-days
            ></div>

            <div
                class="booking-calendar__times"
                data-calendar-times
            >
                <p>
                    Select a date to view available times.
                </p>
            </div>
        `;

        this.container.appendChild(wrapper);

        this.bindNavigation();

        this.renderMonth();
    }

    bindNavigation() {
        const previous =
            this.container.querySelector(
                "[data-calendar-prev]"
            );

        const next =
            this.container.querySelector(
                "[data-calendar-next]"
            );

        previous?.addEventListener(
            "click",
            () => {
                this.currentDate.setMonth(
                    this.currentDate.getMonth() - 1
                );

                this.renderMonth();
            }
        );

        next?.addEventListener(
            "click",
            () => {
                this.currentDate.setMonth(
                    this.currentDate.getMonth() + 1
                );

                this.renderMonth();
            }
        );
    }

    renderMonth() {
        const daysContainer =
            this.container.querySelector(
                "[data-calendar-days]"
            );

        const monthLabel =
            this.container.querySelector(
                "[data-calendar-month]"
            );

        if (!daysContainer) {
            return;
        }

        const year =
            this.currentDate.getFullYear();

        const month =
            this.currentDate.getMonth();

        monthLabel.textContent =
            new Intl.DateTimeFormat(
                "en-ZA",
                {
                    month: "long",
                    year: "numeric",
                }
            ).format(this.currentDate);

        daysContainer.innerHTML = "";

        const firstDay =
            new Date(
                year,
                month,
                1
            ).getDay();

        const daysInMonth =
            new Date(
                year,
                month + 1,
                0
            ).getDate();

        const weekdays = [
            "Sun",
            "Mon",
            "Tue",
            "Wed",
            "Thu",
            "Fri",
            "Sat",
        ];

        weekdays.forEach(day => {
            const header =
                document.createElement("span");

            header.className =
                "booking-calendar__weekday";

            header.textContent = day;

            daysContainer.appendChild(header);
        });

        for (
            let index = 0;
            index < firstDay;
            index++
        ) {
            const blank =
                document.createElement("span");

            blank.className =
                "booking-calendar__blank";

            daysContainer.appendChild(blank);
        }

        for (
            let day = 1;
            day <= daysInMonth;
            day++
        ) {
            const button =
                document.createElement("button");

            button.type = "button";

            button.className =
                "booking-calendar__day";

            button.textContent = day;

            const date =
                this.formatDate(
                    new Date(
                        year,
                        month,
                        day
                    )
                );

            button.dataset.date = date;

            const hasAvailability =
                this.hasAvailability(date);

            button.disabled =
                !hasAvailability;

            if (
                this.selectedDate === date
            ) {
                button.classList.add(
                    "is-selected"
                );
            }

            if (hasAvailability) {
                button.classList.add(
                    "has-availability"
                );
            }

            button.addEventListener(
                "click",
                () => {
                    this.selectDate(date);
                }
            );

            daysContainer.appendChild(button);
        }
    }

    setAvailability(availability = []) {
        this.availability = Array.isArray(
            availability
        )
            ? availability
            : [];

        this.renderMonth();

        if (this.selectedDate) {
            this.renderTimes();
        }
    }

    hasAvailability(date) {
        return this.availability.some(
            item =>
                item.date === date &&
                (
                    item.available !== false ||
                    item.slots?.length > 0
                )
        );
    }

    selectDate(date) {
        this.selectedDate = date;
        this.selectedTime = null;

        this.renderMonth();
        this.renderTimes();

        if (this.onDateSelected) {
            this.onDateSelected(date);
        }
    }

    renderTimes() {
        const container =
            this.container.querySelector(
                "[data-calendar-times]"
            );

        if (!container) {
            return;
        }

        const day =
            this.availability.find(
                item =>
                    item.date ===
                    this.selectedDate
            );

        const slots =
            day?.slots ||
            [];

        if (!slots.length) {
            container.innerHTML = `
                <p>
                    No available times for this date.
                </p>
            `;

            return;
        }

        container.innerHTML = `
            <h3>
                Available times
            </h3>

            <div
                class="booking-calendar__slot-list"
            ></div>
        `;

        const slotList =
            container.querySelector(
                ".booking-calendar__slot-list"
            );

        slots.forEach(slot => {
            const time =
                typeof slot === "string"
                    ? slot
                    : slot.time;

            const button =
                document.createElement("button");

            button.type = "button";

            button.className =
                "booking-calendar__slot";

            button.textContent = time;

            button.disabled =
                slot.available === false;

            if (
                this.selectedTime === time
            ) {
                button.classList.add(
                    "is-selected"
                );
            }

            button.addEventListener(
                "click",
                () => {
                    this.selectTime(time);
                }
            );

            slotList.appendChild(button);
        });
    }

    selectTime(time) {
        this.selectedTime = time;

        this.renderTimes();

        if (this.onTimeSelected) {
            this.onTimeSelected(
                time,
                this.selectedDate
            );
        }
    }

    formatDate(date) {
        const year =
            date.getFullYear();

        const month =
            String(
                date.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                date.getDate()
            ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }
}
