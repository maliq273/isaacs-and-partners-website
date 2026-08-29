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

    async initialise() {
        if (this.initialised) {
            return this;
        }

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

            await storage.initialise();

            this.services.set(
                "storage",
                storage
            );

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

            router.setAuthGuard(
                authGuard
            );

            router.initialise();

            this.services.set(
                "router",
                router
            );

            this.registerRoutes();
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

    async init() {
        return this.initialise();
    }

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

            await router.start();
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

    registerRoutes() {
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

            eventBus.emit(
                `application:route:${definition.name}`,
                routeContext
            );

            this.updateDocumentTitle(
                definition.meta?.title
            );

            return routeContext;
        };
    }

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

    handleBeforeUnload() {
        eventBus.emit(
            "application:beforeUnload",
            {
                application:
                    this,
            }
        );
    }

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

            if (
                router &&
                typeof router.stop ===
                    "function"
            ) {
                await router.stop();
            }

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

export const bootstrap =
    new ApplicationBootstrap();

export async function startApplication() {
    return bootstrap.start();
}

export async function stopApplication() {
    return bootstrap.stop();
}

// Backward-compatible lifecycle alias used by app/js/app.js.
export async function shutdown() {
    return stopApplication();
}

export {
    ApplicationBootstrap,
};

export default bootstrap;
