/**
 * Isaacs and Partners
 * Application Bootstrap
 *
 * Entry point for starting the application runtime.
 */

import application from "./application.js";

let bootstrapped = false;
let bootstrapPromise = null;

/**
 * Bootstrap the application exactly once.
 */
export async function bootstrap() {
  if (bootstrapped) {
    return application;
  }

  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    try {
      await application.initialise();
      await application.start();

      bootstrapped = true;

      return application;
    } catch (error) {
      bootstrapPromise = null;

      console.error(
        "[Bootstrap] Application startup failed:",
        error
      );

      throw error;
    }
  })();

  return bootstrapPromise;
}

/**
 * Shutdown application runtime.
 */
export async function shutdown() {
  if (!bootstrapped) {
    return;
  }

  try {
    await application.stop();
  } finally {
    bootstrapped = false;
    bootstrapPromise = null;
  }
}

/**
 * Register browser lifecycle handlers.
 */
function registerLifecycleHandlers() {
  if (typeof window === "undefined") {
    return;
  }

  window.addEventListener(
    "beforeunload",
    () => {
      /*
       * Do not perform asynchronous application shutdown
       * here. Browser unload does not guarantee completion.
       */
    }
  );

  window.addEventListener(
    "unhandledrejection",
    (event) => {
      console.error(
        "[Bootstrap] Unhandled promise rejection:",
        event.reason
      );
    }
  );

  window.addEventListener(
    "error",
    (event) => {
      console.error(
        "[Bootstrap] Unhandled runtime error:",
        event.error || event.message
      );
    }
  );
}

registerLifecycleHandlers();

export default bootstrap;
