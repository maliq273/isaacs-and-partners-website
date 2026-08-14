/**
 * Isaacs and Partners
 * Application Event Bus
 *
 * Lightweight internal event system used to decouple
 * application modules.
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
    this.initialised = false;
  }

  initialise() {
    if (this.initialised) {
      return this;
    }

    this.initialised = true;

    return this;
  }

  on(eventName, handler) {
    this._validateEvent(eventName);
    this._validateHandler(handler);

    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }

    const handlers =
      this.listeners.get(eventName);

    handlers.add(handler);

    return () => {
      this.off(eventName, handler);
    };
  }

  once(eventName, handler) {
    this._validateEvent(eventName);
    this._validateHandler(handler);

    const wrappedHandler = (...args) => {
      this.off(eventName, wrappedHandler);
      return handler(...args);
    };

    return this.on(eventName, wrappedHandler);
  }

  off(eventName, handler) {
    if (!this.listeners.has(eventName)) {
      return false;
    }

    const handlers =
      this.listeners.get(eventName);

    const removed = handlers.delete(handler);

    if (handlers.size === 0) {
      this.listeners.delete(eventName);
    }

    return removed;
  }

  emit(eventName, payload) {
    this._validateEvent(eventName);

    const handlers =
      this.listeners.get(eventName);

    if (!handlers || handlers.size === 0) {
      return [];
    }

    const results = [];

    for (const handler of [...handlers]) {
      try {
        results.push(
          handler(payload)
        );
      } catch (error) {
        console.error(
          `[EventBus] Handler failed for "${eventName}":`,
          error
        );
      }
    }

    return results;
  }

  async emitAsync(eventName, payload) {
    this._validateEvent(eventName);

    const handlers =
      this.listeners.get(eventName);

    if (!handlers || handlers.size === 0) {
      return [];
    }

    return Promise.all(
      [...handlers].map(async (handler) => {
        try {
          return await handler(payload);
        } catch (error) {
          console.error(
            `[EventBus] Async handler failed for "${eventName}":`,
            error
          );

          return undefined;
        }
      })
    );
  }

  clear(eventName = null) {
    if (eventName === null) {
      this.listeners.clear();
      return;
    }

    this.listeners.delete(eventName);
  }

  hasListeners(eventName) {
    return (
      this.listeners.has(eventName) &&
      this.listeners.get(eventName).size > 0
    );
  }

  listenerCount(eventName) {
    if (!this.listeners.has(eventName)) {
      return 0;
    }

    return this.listeners.get(eventName).size;
  }

  _validateEvent(eventName) {
    if (
      typeof eventName !== "string" ||
      eventName.trim() === ""
    ) {
      throw new TypeError(
        "Event name must be a non-empty string."
      );
    }
  }

  _validateHandler(handler) {
    if (typeof handler !== "function") {
      throw new TypeError(
        "Event handler must be a function."
      );
    }
  }
}

export const eventBus = new EventBus();

export default eventBus;
