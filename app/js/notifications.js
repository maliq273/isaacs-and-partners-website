/**
 * Isaacs & Partners
 * Frontend Notification Manager
 */

class NotificationManager {
    constructor(options = {}) {
        this.containerId =
            options.containerId ||
            "app-notifications";

        this.defaultDuration =
            options.duration || 5000;

        this.ensureContainer();
    }

    ensureContainer() {
        if (
            typeof document ===
            "undefined"
        ) {
            return null;
        }

        let container =
            document.getElementById(
                this.containerId
            );

        if (!container) {
            container =
                document.createElement(
                    "div"
                );

            container.id =
                this.containerId;

            container.setAttribute(
                "aria-live",
                "polite"
            );

            container.setAttribute(
                "aria-atomic",
                "true"
            );

            document.body.appendChild(
                container
            );
        }

        return container;
    }

    show(
        message,
        options = {}
    ) {
        const container =
            this.ensureContainer();

        if (!container) {
            return null;
        }

        const type =
            options.type || "info";

        const duration =
            options.duration ??
            this.defaultDuration;

        const notification =
            document.createElement(
                "div"
            );

        notification.className =
            `notification notification-${type}`;

        notification.setAttribute(
            "role",
            type === "error"
                ? "alert"
                : "status"
        );

        const text =
            document.createElement(
                "span"
            );

        text.className =
            "notification-message";

        text.textContent =
            String(message);

        notification.appendChild(text);

        if (options.dismissible !== false) {
            const button =
                document.createElement(
                    "button"
                );

            button.type = "button";
            button.className =
                "notification-close";

            button.setAttribute(
                "aria-label",
                "Dismiss notification"
            );

            button.textContent = "×";

            button.addEventListener(
                "click",
                () =>
                    this.dismiss(
                        notification
                    )
            );

            notification.appendChild(
                button
            );
        }

        container.appendChild(
            notification
        );

        if (duration > 0) {
            setTimeout(
                () =>
                    this.dismiss(
                        notification
                    ),
                duration
            );
        }

        return notification;
    }

    dismiss(notification) {
        if (!notification) {
            return;
        }

        notification.remove();
    }

    success(message, options = {}) {
        return this.show(
            message,
            {
                ...options,
                type: "success"
            }
        );
    }

    error(message, options = {}) {
        return this.show(
            message,
            {
                ...options,
                type: "error"
            }
        );
    }

    warning(message, options = {}) {
        return this.show(
            message,
            {
                ...options,
                type: "warning"
            }
        );
    }

    info(message, options = {}) {
        return this.show(
            message,
            {
                ...options,
                type: "info"
            }
        );
    }

    clear() {
        const container =
            document.getElementById(
                this.containerId
            );

        if (container) {
            container.replaceChildren();
        }
    }
}

export const notifications =
    new NotificationManager();

export {
    NotificationManager
};

export default notifications;
