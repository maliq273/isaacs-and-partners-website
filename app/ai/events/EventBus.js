export default class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    subscribe(event, handler) {
        if (!this.listeners.has(event)) {
            this.listeners.set(
                event,
                new Set()
            );
        }

        this.listeners
            .get(event)
            .add(handler);

        return () =>
            this.unsubscribe(
                event,
                handler
            );
    }

    unsubscribe(event, handler) {
        return this.listeners
            .get(event)
            ?.delete(handler);
    }

    async publish(
        event,
        payload = {}
    ) {
        const handlers =
            this.listeners.get(event) ||
            new Set();

        for (const handler of handlers) {
            await handler(payload);
        }
    }
}
