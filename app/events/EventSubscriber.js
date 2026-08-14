/**
 * EventSubscriber
 * ------------------------------------------------------------
 * Base class for event subscribers.
 *
 * Subscribers expose the events they are interested in and
 * their corresponding handlers.
 */

export class EventSubscriber {
    constructor({
        name = null
    } = {}) {
        this.name =
            name ||
            this.constructor.name;
    }

    getEvents() {
        return [];
    }

    getHandlers() {
        return {};
    }

    subscribe(dispatcher) {
        if (
            !dispatcher ||
            typeof dispatcher.on !==
                "function"
        ) {
            throw new TypeError(
                "A valid EventDispatcher is required"
            );
        }

        const handlers =
            this.getHandlers();

        this.getEvents().forEach(
            (eventName) => {
                const handler =
                    handlers[
                        eventName
                    ];

                if (
                    typeof handler ===
                    "function"
                ) {
                    dispatcher.on(
                        eventName,
                        handler
                    );
                }
            }
        );

        return this;
    }

    unsubscribe(dispatcher) {
        if (
            !dispatcher ||
            typeof dispatcher.off !==
                "function"
        ) {
            return this;
        }

        const handlers =
            this.getHandlers();

        this.getEvents().forEach(
            (eventName) => {
                const handler =
                    handlers[
                        eventName
                    ];

                if (
                    typeof handler ===
                    "function"
                ) {
                    dispatcher.off(
                        eventName,
                        handler
                    );
                }
            }
        );

        return this;
    }
}

export default EventSubscriber;
