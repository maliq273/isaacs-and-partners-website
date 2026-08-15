export default class DebugConsole {
    constructor({
        enabled = false,
        logger = console
    } = {}) {
        this.enabled = enabled;
        this.logger = logger;
    }

    log(...args) {
        if (this.enabled) {
            this.logger.log(...args);
        }
    }

    warn(...args) {
        if (this.enabled) {
            this.logger.warn(...args);
        }
    }

    error(...args) {
        if (this.enabled) {
            this.logger.error(...args);
        }
    }
}
