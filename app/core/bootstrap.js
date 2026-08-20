/**
 * Isaacs and Partners
 * Application Bootstrap
 *
 * Central application startup coordinator.
 *
 * Responsibilities:
 * - Initialise core application services
 * - Initialise storage
 * - Initialise application state
 * - Configure AuthGuard
 * - Configure Router
 * - Register application routes
 * - Start Router
 * - Initialise LoginController when applicable
 * - Dispatch application lifecycle events
 * - Prevent duplicate application startup
 *
 * IMPORTANT:
 *
 * bootstrap.js is the orchestration layer.
 *
 * Individual services must NOT import bootstrap.js.
 *
 * Dependency direction:
 *
 *     bootstrap
 *        |
 *        +--> events
 *        +--> state
 *        +--> storage
 *        +--> AuthService
 *        +--> AuthGuard
 *        +--> Router
 *        +--> route configuration
 *        +--> controllers
 *
 * This prevents circular application startup dependencies.
 */

import { eventBus } from "./events.js";
import { storage } from "./storage.js";
import { state } from "./state.js";

import auth from "../auth/AuthService.js";
import authGuard from "../auth/AuthGuard.js";
import { loginController } from "../auth/LoginController.js";

import router from "./router.js";

import {
    ROUTES,
    ROUTE_NAMES,
    ROUTE_DEFINITIONS,
} from "../config/routes.js";


class ApplicationBootstrap {
    constructor() {
        this.initialised = false;
        this.started = false;
        this.starting = false;
        this.stopping = false;

        this.services = new Map();

        this.startPromise = null;
        this.stopPromise = null;

        this.lifecycle = {
            startedAt: null,
            stoppedAt: null,
            startupDuration: null,
        };

        this.handleBeforeUnload =
            this.handleBeforeUnload.bind(this);

        this.handleVisibilityChange =
            this.handleVisibilityChange.bind(this);
    }

    /**
     * ----------------------------------------------------------------------
     * Initialise application
     * ----------------------------------------------------------------------
     *
     * Initialisation prepares services but does not necessarily start
     * browser event listeners or route processing.
     */
    async initialise() {
        if (this.initialised) {
            return this;
        }

        /*
         * Prevent duplicate initialisation when multiple callers
         * attempt startup at approximately the same time.
         */
        if (this.starting) {
            return this;
        }

        this.starting = true;

        const startTime =
            Date.now();

        try {
            eventBus.initialise();

            eventBus.emit(
                "application:initialising",
                {
                    application:
                        this,
                }
            );

            /*
             * ----------------------------------------------------------------
             * 1. Storage
             * ----------------------------------------------------------------
             *
             * Storage must be ready before state/authentication services
             * attempt to restore persisted information.
             */
            await storage.initialise();

            this.services.set(
                "storage",
                storage
            );

            /*
             * ----------------------------------------------------------------
             * 2. Application state
             * ----------------------------------------------------------------
             *
             * State is initialised after storage so persisted state can
             * be restored where supported by state.js.
             */
            if (
                typeof state.initialise ===
                "function"
            ) {
                await state.initialise();
            } else if (
                typeof state.init ===
                "function"
            ) {
                await state.init();
            }

            this.services.set(
                "state",
                state
            );

            /*
             * ----------------------------------------------------------------
             * 3. Authentication service
             * ----------------------------------------------------------------
             *
             * AuthService may restore a remembered session here.
             */
            if (
                typeof auth.initialise ===
                "function"
            ) {
                await auth.initialise();
            } else if (
                typeof auth.init ===
                "function"
            ) {
                await auth.init();
            }

            this.services.set(
                "auth",
                auth
            );

            /*
             * ----------------------------------------------------------------
             * 4. Authentication guard
             * ----------------------------------------------------------------
             *
             * AuthGuard is configured with the Router through dependency
             * injection.
             *
             * Router itself must not import AuthGuard.
             */
            if (
                typeof authGuard.setRouter ===
                "function"
            ) {
                authGuard.setRouter(
                    router
                );
            }

            if (
                typeof authGuard.initialise ===
                "function"
            ) {
                await authGuard.initialise();
            } else if (
                typeof authGuard.init ===
                "function"
            ) {
                await authGuard.init();
            }

            this.services.set(
                "authGuard",
                authGuard
            );

            /*
             * ----------------------------------------------------------------
             * 5. Router
             * ----------------------------------------------------------------
             *
             * Inject AuthGuard after both objects exist.
             */
            router.setAuthGuard(
                authGuard
            );

            router.initialise();

            this.services.set(
                "router",
                router
            );

            /*
             * ----------------------------------------------------------------
             * 6. Route registration
             * ----------------------------------------------------------------
             */
            this.registerRoutes();

            /*
             * ----------------------------------------------------------------
             * 7. Browser lifecycle listeners
             * ----------------------------------------------------------------
             */
            this.attachBrowserLifecycleListeners();

            this.initialised = true;

            this.lifecycle.startupDuration =
                Date.now() -
                startTime;

            eventBus.emit(
                "application:initialised",
                {
                    application:
                        this,

                    duration:
                        this.lifecycle
                            .startupDuration,
                }
            );

            return this;

        } catch (error) {
            eventBus.emit(
                "application:initialisationFailed",
                {
                    application:
                        this,

                    error,
                }
            );

            console.error(
                "[Bootstrap] Application initialisation failed:",
                error
            );

            throw error;

        } finally {
            this.starting = false;
        }
    }

    /**
     * Alias for initialise().
     */
    async init() {
        return this.initialise();
    }

    /**
     * ----------------------------------------------------------------------
     * Start application
     * ----------------------------------------------------------------------
     */
    async start() {
        if (this.started) {
            return this;
        }

        if (this.startPromise) {
            return this.startPromise;
        }

        this.startPromise =
            this._start();

        try {
            return await this.startPromise;
        } finally {
            this.startPromise = null;
        }
    }

    /**
     * Internal startup sequence.
     */
    async _start() {
        const startTime =
            Date.now();

        try {
            await this.initialise();

            eventBus.emit(
                "application:starting",
                {
                    application:
                        this,
                }
            );

            /*
             * Start router before resolving the current page.
             */
            await router.start();

            /*
             * Initialise login controller only when the current
             * document actually contains the login form.
             *
             * This avoids forcing LoginController onto every page.
             */
            await this.initialisePageController();

            this.started = true;

            this.lifecycle.startedAt =
                new Date().toISOString();

            this.lifecycle.startupDuration =
                Date.now() -
                startTime;

            eventBus.emit(
                "application:started",
                {
                    application:
                        this,

                    startedAt:
                        this.lifecycle
                            .startedAt,

                    duration:
                        this.lifecycle
                            .startupDuration,
                }
            );

            return this;

        } catch (error) {
            eventBus.emit(
                "application:startFailed",
                {
                    application:
                        this,

                    error,
                }
            );

            console.error(
                "[Bootstrap] Application startup failed:",
                error
            );

            throw error;
        }
    }

    /**
     * ----------------------------------------------------------------------
     * Register application routes
     * ----------------------------------------------------------------------
     *
     * Route handlers intentionally remain lightweight.
     *
     * A route handler can:
     * - dispatch page-level events
     * - initialise page-specific modules
     * - return a promise
     *
     * The bootstrap layer does not hard-code business logic into the router.
     */
    registerRoutes() {
        /*
         * Prevent duplicate route registration.
         */
        const existingRoutes =
            new Map(
                router.getRoutes()
            );

        ROUTE_DEFINITIONS.forEach(
            (definition) => {
                if (
                    existingRoutes.has(
                        definition.path
                    )
                ) {
                    return;
                }

                router.register(
                    definition.path,
                    this.createRouteHandler(
                        definition
                    ),
                    {
                        protected:
                            Boolean(
                                definition.protected
                            ),

                        meta:
                            definition.meta ||
                            {},

                        guard:
                            definition.guard ||
                            null,
                    }
                );
            }
        );

        /*
         * Central not-found route handling.
         *
         * The browser can still handle static documents when no
         * application route exists, but registered application
         * routes receive a consistent not-found lifecycle.
         */
        router.setNotFoundHandler(
            async ({
                path,
                query,
                ...context
            }) => {
                eventBus.emit(
                    "application:routeNotFound",
                    {
                        path,
                        query,
                        context,
                    }
                );

                /*
                 * Do not attempt to redirect to /404.html from here.
                 * That could cause recursive routing on installations
                 * where 404.html itself is routed.
                 *
                 * The page may handle the event and render its own
                 * not-found UI.
                 */
                return {
                    handled:
                        true,

                    route:
                        ROUTE_NAMES.NOT_FOUND,

                    path,
                    query,
                };
            }
        );

        return this;
    }

    /**
     * ----------------------------------------------------------------------
     * Create route handler
     * ----------------------------------------------------------------------
     */
    createRouteHandler(
        definition
    ) {
        return async (
            context = {}
        ) => {
            const routeContext = {
                name:
                    definition.name,

                path:
                    definition.path,

                protected:
                    Boolean(
                        definition.protected
                    ),

                public:
                    Boolean(
                        definition.public
                    ),

                meta:
                    definition.meta ||
                    {},

                ...context,
            };

            eventBus.emit(
                "application:route",
                routeContext
            );

            /*
             * Allow page-specific modules to listen for the route
             * rather than forcing every possible page controller
             * into bootstrap.js.
             */
            eventBus.emit(
                `application:route:${definition.name}`,
                routeContext
            );

            /*
             * Update document title when a route provides one.
             */
            this.updateDocumentTitle(
                definition.meta?.title
            );

            return routeContext;
        };
    }

    /**
     * ----------------------------------------------------------------------
     * Initialise page-specific controller
     * ----------------------------------------------------------------------
     *
     * At present LoginController is the authentication page controller.
     *
     * Other controllers should be registered here only when their
     * actual files exist and are ready.
     */
    async initialisePageController() {
        if (
            typeof window ===
            "undefined" ||
            typeof document ===
            "undefined"
        ) {
            return this;
        }

        const pathname =
            this.getCurrentPath();

        /*
         * Login page.
         */
        if (
            this.isRoute(
                pathname,
                ROUTES.LOGIN
            )
        ) {
            if (
                typeof loginController
                    ?.initialise ===
                "function"
            ) {
                await loginController.initialise();
            }

            this.services.set(
                "loginController",
                loginController
            );
        }

        return this;
    }

    /**
     * ----------------------------------------------------------------------
     * Browser lifecycle
     * ----------------------------------------------------------------------
     */
    attachBrowserLifecycleListeners() {
        if (
            typeof window ===
            "undefined" ||
            typeof document ===
            "undefined"
        ) {
            return this;
        }

        window.addEventListener(
            "beforeunload",
            this.handleBeforeUnload
        );

        document.addEventListener(
            "visibilitychange",
            this.handleVisibilityChange
        );

        return this;
    }

    /**
     * Remove browser lifecycle listeners.
     */
    detachBrowserLifecycleListeners() {
        if (
            typeof window ===
            "undefined" ||
            typeof document ===
            "undefined"
        ) {
            return this;
        }

        window.removeEventListener(
            "beforeunload",
            this.handleBeforeUnload
        );

        document.removeEventListener(
            "visibilitychange",
            this.handleVisibilityChange
        );

        return this;
    }

    /**
     * Browser before-unload event.
     *
     * Do not perform asynchronous operations here.
     */
    handleBeforeUnload() {
        eventBus.emit(
            "application:beforeUnload",
            {
                application:
                    this,
            }
        );
    }

    /**
     * Browser visibility event.
     *
     * This provides a central place for future idle/session
     * management without duplicating document listeners.
     */
    handleVisibilityChange() {
        if (
            typeof document ===
            "undefined"
        ) {
            return;
        }

        eventBus.emit(
            "application:visibilityChanged",
            {
                application:
                    this,

                hidden:
                    document.hidden,

                visibilityState:
                    document.visibilityState,
            }
        );
    }

    /**
     * ----------------------------------------------------------------------
     * Stop application
     * ----------------------------------------------------------------------
     */
    async stop() {
        if (!this.started && !this.initialised) {
            return this;
        }

        if (this.stopPromise) {
            return this.stopPromise;
        }

        this.stopPromise =
            this._stop();

        try {
            return await this.stopPromise;
        } finally {
            this.stopPromise = null;
        }
    }

    /**
     * Internal shutdown sequence.
     */
    async _stop() {
        if (this.stopping) {
            return this;
        }

        this.stopping = true;

        try {
            eventBus.emit(
                "application:stopping",
                {
                    application:
                        this,
                }
            );

            /*
             * Destroy page controller if active.
             */
            const login =
                this.services.get(
                    "loginController"
                );

            if (
                login &&
                typeof login.destroy ===
                    "function"
            ) {
                login.destroy();
            }

            this.services.delete(
                "loginController"
            );

            /*
             * Stop router.
             */
            if (
                router &&
                typeof router.stop ===
                    "function"
            ) {
                await router.stop();
            }

            /*
             * Remove application browser listeners.
             */
            this.detachBrowserLifecycleListeners();

            this.started = false;

            this.lifecycle.stoppedAt =
                new Date().toISOString();

            eventBus.emit(
                "application:stopped",
                {
                    application:
                        this,

                    stoppedAt:
                        this.lifecycle
                            .stoppedAt,
                }
            );

            return this;

        } finally {
            this.stopping = false;
        }
    }

    /**
     * ----------------------------------------------------------------------
     * Reset application bootstrap state
     * ----------------------------------------------------------------------
     *
     * This does not delete persisted storage.
     */
    reset() {
        this.started = false;
        this.initialised = false;

        this.startPromise = null;
        this.stopPromise = null;

        this.lifecycle = {
            startedAt: null,
            stoppedAt: null,
            startupDuration: null,
        };

        this.services.clear();

        return this;
    }

    /**
     * ----------------------------------------------------------------------
     * Route helpers
     * ----------------------------------------------------------------------
     */

    getCurrentPath() {
        if (
            typeof window ===
            "undefined"
        ) {
            return "/";
        }

        return (
            window.location.pathname ||
            "/"
        );
    }

    isRoute(
        currentPath,
        expectedPath
    ) {
        if (
            !currentPath ||
            !expectedPath
        ) {
            return false;
        }

        const normalise =
            (path) => {
                const value =
                    String(path)
                        .split("?")[0]
                        .split("#")[0]
                        .replace(
                            /\/+/g,
                            "/"
                        );

                if (
                    value === ""
                ) {
                    return "/";
                }

                if (
                    value !== "/" &&
                    value.endsWith("/")
                ) {
                    return value.slice(
                        0,
                        -1
                    );
                }

                return value;
            };

        return (
            normalise(
                currentPath
            ) ===
            normalise(
                expectedPath
            )
        );
    }

    /**
     * ----------------------------------------------------------------------
     * Document title
     * ----------------------------------------------------------------------
     */
    updateDocumentTitle(
        title
    ) {
        if (
            typeof document ===
            "undefined"
        ) {
            return;
        }

        if (
            typeof title !==
                "string" ||
            title.trim() === ""
        ) {
            return;
        }

        document.title =
            `${title} | Isaacs and Partners`;
    }

    /**
     * ----------------------------------------------------------------------
     * Status
     * ----------------------------------------------------------------------
     */
    getStatus() {
        return {
            initialised:
                this.initialised,

            started:
                this.started,

            starting:
                this.starting,

            stopping:
                this.stopping,

            services:
                [
                    ...this.services.keys()
                ],

            lifecycle:
                {
                    ...this.lifecycle,
                },

            router:
                typeof router
                    ?.getCurrentRoute ===
                "function"
                    ? router.getCurrentRoute()
                    : null,

            authentication:
                typeof auth
                    ?.isAuthenticated ===
                "function"
                    ? auth.isAuthenticated()
                    : false,

            storage:
                typeof storage
                    ?.getStatus ===
                "function"
                    ? storage.getStatus()
                    : null,
        };
    }

    /**
     * ----------------------------------------------------------------------
     * Access service
     * ----------------------------------------------------------------------
     */
    getService(
        name
    ) {
        return (
            this.services.get(
                name
            ) || null
        );
    }
}


/**
 * --------------------------------------------------------------------------
 * Singleton bootstrap
 * --------------------------------------------------------------------------
 */
export const bootstrap =
    new ApplicationBootstrap();


/**
 * --------------------------------------------------------------------------
 * Convenience startup function
 * --------------------------------------------------------------------------
 *
 * This is useful from index.html or a root application entry module:
 *
 *     import { startApplication } from "./app/core/bootstrap.js";
 *
 *     await startApplication();
 */
export async function startApplication() {
    return bootstrap.start();
}


/**
 * --------------------------------------------------------------------------
 * Convenience shutdown function
 * --------------------------------------------------------------------------
 */
export async function stopApplication() {
    return bootstrap.stop();
}


/**
 * --------------------------------------------------------------------------
 * Browser auto-start
 * --------------------------------------------------------------------------
 *
 * The bootstrap module intentionally does NOT automatically start merely
 * because it was imported.
 *
 * The root application entry point will explicitly call startApplication().
 *
 * This is important because:
 *
 * - tests may import the module without starting the application
 * - other modules may import bootstrap during configuration
 * - index.html remains the single startup authority
 * - startup ordering remains deterministic
 */


/**
 * Named class export.
 */
export {
    ApplicationBootstrap,
};


/**
 * Default export.
 */
export default bootstrap;
