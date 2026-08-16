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
 * - Support dependency injection
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

    try {
      await this._initialiseStorage();
      this._initialiseState();
      this._initialiseEvents();
      this._initialiseRouter();

      this.initialised = true;

      eventBus.emit("application:initialised", {
        application: this,
      });

      return this;
    } catch (error) {
      this.initialised = false;

      eventBus.emit("application:initialisationFailed", {
        application: this,
        error,
      });

      throw error;
    }
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

    try {
      await this._startRouter();

      this.started = true;

      eventBus.emit("application:started", {
        application: this,
      });

      return this;
    } catch (error) {
      this.started = false;

      eventBus.emit("application:startFailed", {
        application: this,
        error,
      });

      throw error;
    }
  }

  /**
   * Stop application runtime safely.
   */
  async stop() {
    if (!this.started || this.stopping) {
      return this;
    }

    this.stopping = true;

    try {
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

      eventBus.emit("application:stopped", {
        application: this,
      });
    } finally {
      this.stopping = false;
    }

    return this;
  }

  /**
   * Reset runtime state.
   *
   * This does not destroy persistent storage.
   * Persistent data must be explicitly cleared by the
   * storage/repository layer.
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
    this.stopping = false;

    eventBus.emit("application:reset", {
      application: this,
    });

    return this;
  }

  /**
   * Register application cleanup handler.
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
    return {
      ...this.dependencies,
    };
  }

  /**
   * Replace a dependency.
   *
   * Useful for testing and controlled integration.
   */
  setDependency(name, dependency) {
    if (!name || typeof name !== "string") {
      throw new TypeError(
        "Dependency name must be a non-empty string."
      );
    }

    if (!dependency) {
      throw new TypeError(
        `Dependency "${name}" cannot be empty.`
      );
    }

    this.dependencies[name] = dependency;

    return this;
  }

  async _initialiseStorage() {
    const currentStorage =
      this.dependencies.storage;

    if (
      currentStorage &&
      typeof currentStorage.initialise === "function"
    ) {
      await currentStorage.initialise();
    } else if (
      currentStorage &&
      typeof currentStorage.init === "function"
    ) {
      await currentStorage.init();
    }
  }

  _initialiseState() {
    const currentState =
      this.dependencies.state;

    if (
      currentState &&
      typeof currentState.initialise === "function"
    ) {
      currentState.initialise();
    } else if (
      currentState &&
      typeof currentState.init === "function"
    ) {
      currentState.init();
    }
  }

  _initialiseEvents() {
    const currentEvents =
      this.dependencies.events;

    if (
      currentEvents &&
      typeof currentEvents.initialise === "function"
    ) {
      currentEvents.initialise();
    }
  }

  _initialiseRouter() {
    const currentRouter =
      this.dependencies.router;

    if (
      currentRouter &&
      typeof currentRouter.initialise === "function"
    ) {
      currentRouter.initialise();
    } else if (
      currentRouter &&
      typeof currentRouter.init === "function"
    ) {
      currentRouter.init();
    }
  }

  async _startRouter() {
    const currentRouter =
      this.dependencies.router;

    if (
      currentRouter &&
      typeof currentRouter.start === "function"
    ) {
      await currentRouter.start();
    } else if (
      currentRouter &&
      typeof currentRouter.listen === "function"
    ) {
      await currentRouter.listen();
    }
  }
}

export const application =
  new Application();

export default application;
