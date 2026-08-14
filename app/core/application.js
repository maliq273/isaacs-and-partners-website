/**
 * Isaacs and Partners
 * Application Runtime
 *
 * Central application lifecycle coordinator.
 *
 * Responsibilities:
 * - Initialise the application
 * - Coordinate bootstrap dependencies
 * - Manage application lifecycle
 * - Connect router, state, storage and events
 * - Prevent duplicate initialisation
 * - Provide controlled shutdown
 */

import { appState } from "./state.js";
import { eventBus } from "./events.js";
import { router } from "./router.js";
import { storage } from "./storage.js";

class Application {
  constructor() {
    this.initialised = false;
    this.started = false;
    this.stopping = false;

    this.dependencies = {
      state: appState,
      events: eventBus,
      router,
      storage,
    };

    this.cleanupHandlers = [];
  }

  /**
   * Initialise application dependencies.
   */
  async initialise() {
    if (this.initialised) {
      return this;
    }

    this.stopping = false;

    await this._initialiseStorage();
    this._initialiseState();
    this._initialiseEvents();
    this._initialiseRouter();

    this.initialised = true;

    eventBus.emit("application:initialised", {
      application: this,
    });

    return this;
  }

  /**
   * Start application runtime.
   */
  async start() {
    if (this.started) {
      return this;
    }

    if (!this.initialised) {
      await this.initialise();
    }

    this.stopping = false;

    await this._startRouter();

    this.started = true;

    eventBus.emit("application:started", {
      application: this,
    });

    return this;
  }

  /**
   * Stop application runtime safely.
   */
  async stop() {
    if (!this.started || this.stopping) {
      return;
    }

    this.stopping = true;

    for (const cleanup of this.cleanupHandlers.splice(0)) {
      try {
        await cleanup();
      } catch (error) {
        console.error(
          "[Application] Cleanup failed:",
          error
        );
      }
    }

    try {
      if (
        router &&
        typeof router.stop === "function"
      ) {
        await router.stop();
      }
    } catch (error) {
      console.error(
        "[Application] Router shutdown failed:",
        error
      );
    }

    this.started = false;
    this.stopping = false;

    eventBus.emit("application:stopped", {
      application: this,
    });
  }

  /**
   * Completely reset runtime state.
   *
   * Intended for controlled logout/session termination
   * and testing rather than normal navigation.
   */
  async reset() {
    await this.stop();

    try {
      if (
        appState &&
        typeof appState.reset === "function"
      ) {
        appState.reset();
      }
    } catch (error) {
      console.error(
        "[Application] State reset failed:",
        error
      );
    }

    this.initialised = false;
    this.started = false;
  }

  /**
   * Register an application cleanup handler.
   */
  registerCleanup(handler) {
    if (typeof handler !== "function") {
      throw new TypeError(
        "Application cleanup handler must be a function."
      );
    }

    this.cleanupHandlers.push(handler);

    return () => {
      const index =
        this.cleanupHandlers.indexOf(handler);

      if (index !== -1) {
        this.cleanupHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Return application runtime status.
   */
  getStatus() {
    return {
      initialised: this.initialised,
      started: this.started,
      stopping: this.stopping,
    };
  }

  /**
   * Return application dependencies.
   */
  getDependencies() {
    return this.dependencies;
  }

  async _initialiseStorage() {
    if (
      storage &&
      typeof storage.initialise === "function"
    ) {
      await storage.initialise();
    } else if (
      storage &&
      typeof storage.init === "function"
    ) {
      await storage.init();
    }
  }

  _initialiseState() {
    if (
      appState &&
      typeof appState.initialise === "function"
    ) {
      appState.initialise();
    } else if (
      appState &&
      typeof appState.init === "function"
    ) {
      appState.init();
    }
  }

  _initialiseEvents() {
    if (
      eventBus &&
      typeof eventBus.initialise === "function"
    ) {
      eventBus.initialise();
    }
  }

  _initialiseRouter() {
    if (
      router &&
      typeof router.initialise === "function"
    ) {
      router.initialise();
    } else if (
      router &&
      typeof router.init === "function"
    ) {
      router.init();
    }
  }

  async _startRouter() {
    if (
      router &&
      typeof router.start === "function"
    ) {
      await router.start();
    } else if (
      router &&
      typeof router.listen === "function"
    ) {
      await router.listen();
    }
  }
}

export const application = new Application();

export default application;
