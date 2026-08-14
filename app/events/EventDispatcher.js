/**
 * EventHandler
 * ------------------------------------------------------------
 * Base class for event handlers.
 *
 * A handler should implement:
 *
 * async handle(event)
 */

export class EventHandler {
    constructor({
        name = null,
        logger = console
    } = {}) {
        this.name =
            name ||
            this.constructor.name;

        this.logger =
            logger;
    }

    supports(event) {
        return true;
    }

    async handle() {
        throw new Error(
            `${this.name} must implement handle(event)`
        );
    }

    async execute(event) {
        if (
            !this.supports(event)
        ) {
            return {
                handled: false,
                skipped: true
            };
        }

        return this.handle(
            event
        );
    }
}

export default EventHandler;
