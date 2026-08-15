export default class Subscriptions {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.cleanups = [];
    }

    on(event, handler) {
        const cleanup =
            this.eventBus.subscribe(
                event,
                handler
            );

        this.cleanups.push(cleanup);

        return cleanup;
    }

    clear() {
        for (const cleanup of this.cleanups) {
            cleanup();
        }

        this.cleanups = [];
    }
}
