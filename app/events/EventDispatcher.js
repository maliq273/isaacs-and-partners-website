/**
 * EventDispatcher
 * ------------------------------------------------------------
 * Production event bus.
 *
 * Supports:
 * - synchronous handlers
 * - asynchronous handlers
 * - once listeners
 * - wildcard listeners
 * - subscriber registration
 * - error isolation
 * - event history hooks
 *
 * Event structure:
 *
 * {
 *     name: "domain.client.created",
 *     payload: {...},
 *     metadata: {...},
 *     timestamp: "..."
 * }
 */

export class EventDispatcher {
    constructor({
        logger = console,
        onError = null,
        historyEnabled = false,
        maxHistory = 500
    } = {}) {
        this.listeners =
            new Map();

        this.onceListeners =
            new Map();

        this.wildcardListeners =
            new Set();

        this.logger =
            logger;

        this.onError =
            onError;

        this.historyEnabled =
            historyEnabled;

        this.maxHistory =
            Math.max(
                1,
                maxHistory
            );

        this.history = [];
    }

    on(
        eventName,
        handler
    ) {
        this.assertHandler(
            eventName,
            handler
        );

        if (
            eventName === "*"
        ) {
            this.wildcardListeners.add(
                handler
            );

            return () =>
                this.off(
                    eventName,
                    handler
                );
        }

        if (
            !this.listeners.has(
                eventName
            )
        ) {
            this.listeners.set(
                eventName,
                new Set()
            );
        }

        this.listeners
            .get(eventName)
            .add(handler);

        return () =>
            this.off(
                eventName,
                handler
            );
    }

    once(
        eventName,
        handler
    ) {
        this.assertHandler(
            eventName,
            handler
        );

        if (
            eventName === "*"
        ) {
            const wrapper =
                async (...args) => {
                    this.wildcardListeners.delete(
                        wrapper
                    );

                    return handler(
                        ...args
                    );
                };

            this.wildcardListeners.add(
                wrapper
            );

            return () =>
                this.off(
                    "*",
                    wrapper
                );
        }

        if (
            !this.onceListeners.has(
                eventName
            )
        ) {
            this.onceListeners.set(
                eventName,
                new Map()
            );
        }

        const wrapper =
            async (...args) => {
                this.off(
                    eventName,
                    wrapper
                );

                return handler(
                    ...args
                );
            };

        this.onceListeners
            .get(eventName)
            .set(
                handler,
                wrapper
            );

        this.on(
            eventName,
            wrapper
        );

        return () =>
            this.off(
                eventName,
                wrapper
            );
    }

    off(
        eventName,
        handler
    ) {
        if (
            eventName === "*"
        ) {
            this.wildcardListeners.delete(
                handler
            );

            return this;
        }

        this.listeners
            .get(eventName)
            ?.delete(handler);

        const onceMap =
            this.onceListeners.get(
                eventName
            );

        if (onceMap) {
            onceMap.delete(
                handler
            );
        }

        return this;
    }

    removeAll(eventName = null) {
        if (
            eventName === null
        ) {
            this.listeners.clear();
            this.onceListeners.clear();
            this.wildcardListeners.clear();

            return this;
        }

        this.listeners.delete(
            eventName
        );

        this.onceListeners.delete(
            eventName
        );

        return this;
    }

    listenersFor(eventName) {
        return [
            ...(
                this.listeners.get(
                    eventName
                ) || []
            ),
            ...this.wildcardListeners
        ];
    }

    async emit(
        eventName,
        payload = {},
        metadata = {}
    ) {
        const event =
            this.createEvent(
                eventName,
                payload,
                metadata
            );

        this.record(
            event
        );

        const handlers =
            this.listenersFor(
                eventName
            );

        const results = [];

        for (
            const handler of handlers
        ) {
            try {
                results.push(
                    await handler(
                        event
                    )
                );
            } catch (error) {
                await this.handleError(
                    error,
                    event
                );
            }
        }

        return {
            event,
            handled:
                handlers.length,
            results
        };
    }

    async dispatch(event) {
        if (
            !event ||
            !event.name
        ) {
            throw new TypeError(
                "A valid event is required"
            );
        }

        return this.emit(
            event.name,
            event.payload || {},
            event.metadata || {}
        );
    }

    subscribe(subscriber) {
        if (
            !subscriber ||
            typeof subscriber.subscribe !==
                "function"
        ) {
            throw new TypeError(
                "A valid EventSubscriber is required"
            );
        }

        subscriber.subscribe(
            this
        );

        return subscriber;
    }

    unsubscribe(subscriber) {
        if (
            !subscriber ||
            typeof subscriber.unsubscribe !==
                "function"
        ) {
            return this;
        }

        subscriber.unsubscribe(
            this
        );

        return this;
    }

    createEvent(
        name,
        payload,
        metadata
    ) {
        return Object.freeze({
            id:
                this.createId(),

            name,

            payload,

            metadata,

            timestamp:
                new Date().toISOString()
        });
    }

    createId() {
        if (
            typeof crypto !==
                "undefined" &&
            typeof crypto.randomUUID ===
                "function"
        ) {
            return crypto.randomUUID();
        }

        return `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`;
    }

    record(event) {
        if (
            !this.historyEnabled
        ) {
            return;
        }

        this.history.push(
            event
        );

        if (
            this.history.length >
            this.maxHistory
        ) {
            this.history.shift();
        }
    }

    getHistory() {
        return [
            ...this.history
        ];
    }

    clearHistory() {
        this.history = [];
        return this;
    }

    async handleError(
        error,
        event
    ) {
        if (
            typeof this.onError ===
            "function"
        ) {
            return this.onError(
                error,
                event
            );
        }

        this.logger?.error?.(
            "Event handler failed",
            {
                error,
                event
            }
        );
    }

    assertHandler(
        eventName,
        handler
    ) {
        if (
            !eventName ||
            typeof eventName !==
                "string"
        ) {
            throw new TypeError(
                "Event name must be a non-empty string"
            );
        }

        if (
            typeof handler !==
            "function"
        ) {
            throw new TypeError(
                "Event handler must be a function"
            );
        }
    }
}

export default EventDispatcher;
