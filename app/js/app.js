/**
 * Isaacs & Partners
 * Application Bootstrap
 *
 * Central frontend entry point.
 *
 * Responsibilities:
 * - Initialise global application services
 * - Initialise theme
 * - Register global event handlers
 * - Expose application state
 * - Provide controlled startup/shutdown lifecycle
 */

import api from "./api.js";
import storage from "./storage.js";
import notifications from "./notifications.js";
import theme from "./theme.js";
import {
    generateId
} from "./utils.js";

class Application {
    constructor() {
        this.id =
            generateId("app");

        this.started = false;

        this.services = {
            api,
            storage,
            notifications,
            theme
        };

        this.state = {
            authenticated: false,
            user: null,
            currentRoute: null,
            online:
                typeof navigator !==
                "undefined"
                    ? navigator.onLine
                    : true
        };

        this.listeners = [];
    }

    async start() {
        if (this.started) {
            return this;
        }

        try {
            this.initialiseTheme();
            this.registerNetworkListeners();
            this.registerGlobalErrorHandlers();
            this.initialiseDom();
            this.restoreApplicationState();

            this.started = true;

            this.emit(
                "app:started",
                {
                    applicationId:
                        this.id
                }
            );

            return this;
        } catch (error) {
            this.handleStartupError(
                error
            );

            throw error;
        }
    }

    initialiseTheme() {
        this.services.theme.init();
    }

    initialiseDom() {
        if (
            typeof document ===
            "undefined"
        ) {
            return;
        }

        document.documentElement.dataset
            .application =
            "isaacs-and-partners";

        document.documentElement.dataset
            .applicationVersion =
            document.documentElement
                .dataset.version ||
            "1.0.0";
    }

    restoreApplicationState() {
        try {
            const user =
                this.services.storage.get(
                    "current_user",
                    {
                        storage:
                            "session"
                    }
                );

            if (user) {
                this.state.user = user;
                this.state.authenticated =
                    true;
            }
        } catch {
            this.state.user = null;
            this.state.authenticated =
                false;
        }
    }

    registerNetworkListeners() {
        if (
            typeof window ===
            "undefined"
        ) {
            return;
        }

        const onlineHandler = () => {
            this.state.online = true;

            this.services.notifications.info(
                "Connection restored.",
                {
                    duration: 3000
                }
            );

            this.emit(
                "network:online"
            );
        };

        const offlineHandler = () => {
            this.state.online = false;

            this.services.notifications.warning(
                "You are currently offline.",
                {
                    duration: 5000
                }
            );

            this.emit(
                "network:offline"
            );
        };

        window.addEventListener(
            "online",
            onlineHandler
        );

        window.addEventListener(
            "offline",
            offlineHandler
        );

        this.listeners.push(
            () =>
                window.removeEventListener(
                    "online",
                    onlineHandler
                )
        );

        this.listeners.push(
            () =>
                window.removeEventListener(
                    "offline",
                    offlineHandler
                )
        );
    }

    registerGlobalErrorHandlers() {
        if (
            typeof window ===
            "undefined"
        ) {
            return;
        }

        const errorHandler = (
            event
        ) => {
            console.error(
                "Unhandled application error:",
                event.error ||
                    event.message
            );

            this.emit(
                "app:error",
                event.error
            );
        };

        const rejectionHandler = (
            event
        ) => {
            console.error(
                "Unhandled promise rejection:",
                event.reason
            );

            this.emit(
                "app:rejection",
                event.reason
            );
        };

        window.addEventListener(
            "error",
            errorHandler
        );

        window.addEventListener(
            "unhandledrejection",
            rejectionHandler
        );

        this.listeners.push(
            () =>
                window.removeEventListener(
                    "error",
                    errorHandler
                )
        );

        this.listeners.push(
            () =>
                window.removeEventListener(
                    "unhandledrejection",
                    rejectionHandler
                )
        );
    }

    setUser(user) {
        this.state.user =
            user || null;

        this.state.authenticated =
            Boolean(user);

        if (user) {
            this.services.storage.set(
                "current_user",
                user,
                {
                    storage:
                        "session"
                }
            );
        } else {
            this.services.storage.remove(
                "current_user",
                {
                    storage:
                        "session"
                }
            );
        }

        this.emit(
            "auth:userchange",
            user
        );
    }

    clearUser() {
        this.setUser(null);
    }

    getUser() {
        return this.state.user;
    }

    isAuthenticated() {
        return (
            this.state.authenticated
        );
    }

    setRoute(route) {
        this.state.currentRoute =
            route;

        this.emit(
            "route:change",
            route
        );
    }

    getRoute() {
        return this.state.currentRoute;
    }

    emit(eventName, detail = null) {
        if (
            typeof window !==
            "undefined"
        ) {
            window.dispatchEvent(
                new CustomEvent(
                    eventName,
                    {
                        detail
                    }
                )
            );
        }
    }

    handleStartupError(error) {
        console.error(
            "Application startup failed:",
            error
        );

        try {
            this.services.notifications.error(
                "The application could not be started. Please reload the page."
            );
        } catch {
            // Avoid cascading startup failure.
        }
    }

    async shutdown() {
        if (!this.started) {
            return;
        }

        this.listeners.forEach(
            (cleanup) => {
                try {
                    cleanup();
                } catch {
                    // Ignore cleanup errors.
                }
            }
        );

        this.listeners = [];
        this.started = false;

        this.emit(
            "app:shutdown"
        );
    }
}

export const app =
    new Application();

export {
    Application
};

export default app;

/**
 * Browser bootstrap.
 */
if (
    typeof document !==
    "undefined"
) {
    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            () => app.start(),
            {
                once: true
            }
        );
    } else {
        app.start();
    }
}
