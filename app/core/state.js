/**
 * Isaacs and Partners
 * Application State Store
 *
 * Central reactive state container.
 */

import { eventBus } from "./events.js";

const cloneValue = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return value;
  }

  if (
    typeof structuredClone === "function"
  ) {
    try {
      return structuredClone(value);
    } catch {
      // Fall through.
    }
  }

  if (
    typeof value === "object"
  ) {
    return JSON.parse(
      JSON.stringify(value)
    );
  }

  return value;
};

class StateStore {
  constructor() {
    this.state = {};
    this.initialState = {};
    this.subscribers = new Map();
    this.initialised = false;
  }

  initialise(initialState = {}) {
    if (this.initialised) {
      return this;
    }

    this.initialState =
      cloneValue(initialState);

    this.state =
      cloneValue(initialState);

    this.initialised = true;

    return this;
  }

  init(initialState = {}) {
    return this.initialise(initialState);
  }

  getState() {
    return cloneValue(this.state);
  }

  get(path, defaultValue = undefined) {
    if (!path) {
      return this.getState();
    }

    const parts =
      Array.isArray(path)
        ? path
        : String(path)
            .split(".")
            .filter(Boolean);

    let current = this.state;

    for (const part of parts) {
      if (
        current === null ||
        current === undefined ||
        !Object.prototype.hasOwnProperty.call(
          current,
          part
        )
      ) {
        return defaultValue;
      }

      current = current[part];
    }

    return cloneValue(current);
  }

  set(path, value) {
    const parts =
      Array.isArray(path)
        ? path
        : String(path)
            .split(".")
            .filter(Boolean);

    if (parts.length === 0) {
      throw new TypeError(
        "State path cannot be empty."
      );
    }

    let current = this.state;

    for (
      let index = 0;
      index < parts.length - 1;
      index += 1
    ) {
      const part = parts[index];

      if (
        typeof current[part] !== "object" ||
        current[part] === null
      ) {
        current[part] = {};
      }

      current = current[part];
    }

    const finalKey =
      parts[parts.length - 1];

    const previousValue =
      current[finalKey];

    current[finalKey] =
      cloneValue(value);

    this._notify(
      parts.join("."),
      current[finalKey],
      previousValue
    );

    return this.get(parts.join("."));
  }

  update(path, updater) {
    if (typeof updater !== "function") {
      throw new TypeError(
        "State updater must be a function."
      );
    }

    const current =
      this.get(path);

    const updated =
      updater(cloneValue(current));

    return this.set(
      path,
      updated
    );
  }

  merge(values) {
    if (
      !values ||
      typeof values !== "object" ||
      Array.isArray(values)
    ) {
      throw new TypeError(
        "State merge requires an object."
      );
    }

    const previous =
      this.getState();

    this.state = {
      ...this.state,
      ...cloneValue(values),
    };

    this._notify(
      "*",
      this.getState(),
      previous
    );

    return this.getState();
  }

  subscribe(path, callback) {
    if (typeof callback !== "function") {
      throw new TypeError(
        "State subscriber must be a function."
      );
    }

    const key =
      path || "*";

    if (!this.subscribers.has(key)) {
      this.subscribers.set(
        key,
        new Set()
      );
    }

    const subscribers =
      this.subscribers.get(key);

    subscribers.add(callback);

    return () => {
      subscribers.delete(callback);

      if (subscribers.size === 0) {
        this.subscribers.delete(key);
      }
    };
  }

  reset(path = null) {
    if (path === null) {
      const previous =
        this.getState();

      this.state =
        cloneValue(this.initialState);

      this._notify(
        "*",
        this.getState(),
        previous
      );

      return this.getState();
    }

    return this.set(
      path,
      this._getInitialValue(path)
    );
  }

  clear() {
    const previous =
      this.getState();

    this.state = {};

    this._notify(
      "*",
      {},
      previous
    );
  }

  has(path) {
    return (
      this.get(
        path,
        Symbol.for("missing")
      ) !== Symbol.for("missing")
    );
  }

  _getInitialValue(path) {
    const parts =
      Array.isArray(path)
        ? path
        : String(path)
            .split(".")
            .filter(Boolean);

    let current =
      this.initialState;

    for (const part of parts) {
      if (
        current === null ||
        current === undefined
      ) {
        return undefined;
      }

      current = current[part];
    }

    return cloneValue(current);
  }

  _notify(path, value, previousValue) {
    const event = {
      path,
      value: cloneValue(value),
      previousValue:
        cloneValue(previousValue),
      state: this.getState(),
      timestamp:
        new Date().toISOString(),
    };

    const directSubscribers =
      this.subscribers.get(path);

    if (directSubscribers) {
      for (
        const subscriber of [
          ...directSubscribers,
        ]
      ) {
        try {
          subscriber(event);
        } catch (error) {
          console.error(
            "[State] Subscriber failed:",
            error
          );
        }
      }
    }

    const globalSubscribers =
      this.subscribers.get("*");

    if (globalSubscribers) {
      for (
        const subscriber of [
          ...globalSubscribers,
        ]
      ) {
        try {
          subscriber(event);
        } catch (error) {
          console.error(
            "[State] Global subscriber failed:",
            error
          );
        }
      }
    }

    eventBus.emit(
      "state:changed",
      event
    );
  }
}

export const appState =
  new StateStore();

export default appState;
