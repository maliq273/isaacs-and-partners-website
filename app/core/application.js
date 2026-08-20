/**
 * Isaacs and Partners
 * Application Core
 *
 * Central application lifecycle coordinator.
 *
 * Responsibilities:
 * - Coordinate application startup and shutdown
 * - Initialise core infrastructure
 * - Connect Router, State, Storage and Authentication
 * - Maintain application lifecycle state
 * - Prevent duplicate initialisation
 * - Provide safe application status information
 * - Emit application lifecycle events
 *
 * IMPORTANT:
 *
 * Application does NOT implement authentication.
 * AuthService remains responsible for authentication.
 *
 * Application does NOT implement routing.
 * Router remains responsible for navigation.
 *
 * Application does NOT implement persistence.
 * CoreStorage remains responsible for storage.
 *
 * This module coordinates the major application services.
 */

import { eventBus } from "./events.js";
import { state } from "./state.js";
import { router } from "./router.js";

import { authService } from "../auth/AuthService.js";
import { authGuard } from "../auth/AuthGuard.js";

import { coreStorage } from "./storage.js";


class Application {
    constructor() {
        this.initialised = false;
        this.started = false;
        this.stopping = false;
        this.destroyed = false;

        this.initialising = null;
        this.starting = null;

        this.version = null;
        this.environment = null;

        this.startedAt = null;
        this.stoppedAt = null;

        this.services = {
            state,
            router,
            authService,
            authGuard,
            storage: coreStorage,
        };

        this._boundBeforeUnload =
            this._handleBeforeUnload.bind(this);
    }


    /**
     * Initialise the application.
     *
     * Initialisation is safe to call multiple times.
     */
    async initialise(options = {}) {
        if (this.destroyed) {
            throw new Error(
                "Application has been destroyed."
            );
        }

        if (this.initialised) {
            return this;
        }

        if (this.initialising) {
            return this.initialising;
        }

        this.initialising =
            this._performInitialisation(
                options
            );

        try {
            await this.initialising;
            return this;
        } finally {
            this.initialising = null;
        }
    }


    /**
     * Alias for initialise().
     */
    async init(options = {}) {
        return this.initialise(
            options
        );
    }


    /**
     * Perform application initialisation.
     */
    async _performInitialisation(
        options = {}
    ) {
        eventBus.emit(
            "application:initialising",
            {
                options,
            }
        );

        /*
         * Read application configuration where available.
         *
         * Configuration is intentionally resolved
         * defensively because the application can also
         * operate in lightweight/static environments.
         */
        this.version =
            options.version ||
            this._readApplicationVersion();

        this.environment =
            options.environment ||
            this._readEnvironment();


        /*
         * Initialise central state first.
         */
        state.initialise();


        /*
         * Initialise storage.
         *
         * CoreStorage may expose initialise(), init(),
         * or no lifecycle method depending on the
         * configured storage implementation.
         */
        await this._initialiseService(
            coreStorage,
            "storage"
        );


        /*
         * Configure the authentication guard.
         *
         * Router does not import AuthGuard directly.
         * Dependency injection keeps the architecture
         * free from circular imports.
         */
        if (
            router &&
            typeof router.setAuthGuard ===
                "function"
        ) {
            router.setAuthGuard(
                authGuard
            );
        }


        /*
         * Initialise authentication.
         *
         * AuthService remains the source of truth.
         */
        await this._initialiseService(
            authService,
            "authentication"
        );


        /*
         * Initialise router.
         */
        await this._initialiseService(
            router,
            "router"
        );


        /*
         * Synchronise application metadata.
         */
        state.update(
            {
                "app.version":
                    this.version,

                "app.environment":
                    this.environment,

                "app.initialised":
                    true,
            },
            {
                source:
                    "application",
            }
        );


        this.initialised = true;


        eventBus.emit(
            "application:initialised",
            {
                version:
                    this.version,

                environment:
                    this.environment,
            }
        );


        return this;
    }


    /**
     * Start the application.
     *
     * Startup automatically performs initialisation
     * if required.
     */
    async start(options = {}) {
        if (this.destroyed) {
            throw new Error(
                "Application has been destroyed."
            );
        }

        if (this.started) {
            return this;
        }

        if (this.starting) {
            return this.starting;
        }

        this.starting =
            this._performStart(
                options
            );

        try {
            await this.starting;
            return this;
        } finally {
            this.starting = null;
        }
    }


    /**
     * Perform application startup.
     */
    async _performStart(
        options = {}
    ) {
        await this.initialise(
            options
        );

        eventBus.emit(
            "application:starting",
            {
                options,
            }
        );


        /*
         * Start Router.
         */
        if (
            router &&
            typeof router.start ===
                "function"
        ) {
            await router.start();
        }


        /*
         * Mark application as started.
         */
        this.started = true;
        this.stopping = false;

        this.startedAt =
            new Date().toISOString();

        this.stoppedAt = null;


        state.update(
            {
                "app.started":
                    true,

                "app.initialised":
                    true,
            },
            {
                source:
                    "application",
            }
        );


        /*
         * Browser lifecycle integration.
         */
        if (
            typeof window !==
            "undefined"
        ) {
            window.addEventListener(
                "beforeunload",
                this._boundBeforeUnload
            );
        }


        eventBus.emit(
            "application:started",
            {
                startedAt:
                    this.startedAt,

                version:
                    this.version,

                environment:
                    this.environment,
            }
        );


        return this;
    }


    /**
     * Stop the application.
     */
    async stop(options = {}) {
        if (!this.started) {
            return this;
        }

        if (this.stopping) {
            return this;
        }

        this.stopping = true;

        eventBus.emit(
            "application:stopping",
            {
                options,
            }
        );


        /*
         * Stop Router first so no new navigation
         * is processed while services shut down.
         */
        if (
            router &&
            typeof router.stop ===
                "function"
        ) {
            await router.stop();
        }


        /*
         * Give authentication service an opportunity
         * to stop background/session activity.
         *
         * Do not automatically log the user out here.
         */
        if (
            authService &&
            typeof authService.stop ===
                "function"
        ) {
            await authService.stop();
        }


        /*
         * Storage shutdown.
         */
        if (
            coreStorage &&
            typeof coreStorage.stop ===
                "function"
        ) {
            await coreStorage.stop();
        }


        if (
            typeof window !==
            "undefined"
        ) {
            window.removeEventListener(
                "beforeunload",
                this._boundBeforeUnload
            );
        }


        this.started = false;
        this.stopping = false;

        this.stoppedAt =
            new Date().toISOString();


        state.update(
            {
                "app.started":
                    false,
            },
            {
                source:
                    "application",
            }
        );


        eventBus.emit(
            "application:stopped",
            {
                stoppedAt:
                    this.stoppedAt,
            }
        );


        return this;
    }


    /**
     * Destroy application.
     *
     * Destruction is terminal for this instance.
     */
    async destroy() {
        if (this.destroyed) {
            return;
        }

        try {
            await this.stop({
                source:
                    "application.destroy",
            });
        } catch (error) {
            eventBus.emit(
                "application:error",
                {
                    phase:
                        "destroy",

                    error,
                }
            );
        }


        /*
         * Destroy individual infrastructure where
         * supported.
         */
        const destroyableServices = [
            router,
            authService,
            coreStorage,
        ];


        for (
            const service of
                destroyableServices
        ) {
            if (
                service &&
                typeof service.destroy ===
                    "function"
            ) {
                try {
                    await service.destroy();
                } catch (error) {
                    eventBus.emit(
                        "application:error",
                        {
                            phase:
                                "destroy",

                            error,
                        }
                    );
                }
            }
        }


        /*
         * State is destroyed last because other
         * infrastructure may still rely on it during
         * cleanup.
         */
        if (
            state &&
            typeof state.destroy ===
                "function"
        ) {
            state.destroy();
        }


        this.initialised = false;
        this.started = false;
        this.destroyed = true;
        this.stopping = false;

        this.initialising = null;
        this.starting = null;

        eventBus.emit(
            "application:destroyed",
            {
                destroyed:
                    true,
            }
        );
    }


    /**
     * Return application status.
     */
    getStatus() {
        return {
            initialised:
                this.initialised,

            started:
                this.started,

            stopping:
                this.stopping,

            destroyed:
                this.destroyed,

            version:
                this.version,

            environment:
                this.environment,

            startedAt:
                this.startedAt,

            stoppedAt:
                this.stoppedAt,

            services: {
                state:
                    Boolean(
                        this.services.state
                    ),

                router:
                    Boolean(
                        this.services.router
                    ),

                authService:
                    Boolean(
                        this.services.authService
                    ),

                authGuard:
                    Boolean(
                        this.services.authGuard
                    ),

                storage:
                    Boolean(
                        this.services.storage
                    ),
            },
        };
    }


    /**
     * Return application service.
     */
    getService(
        name
    ) {
        if (
            typeof name !== "string" ||
            name.trim() === ""
        ) {
            return null;
        }

        return (
            this.services[name] ||
            null
        );
    }


    /**
     * Return all application services.
     */
    getServices() {
        return {
            ...this.services,
        };
    }


    /**
     * Determine whether application is ready.
     */
    isReady() {
        return (
            this.initialised &&
            this.started &&
            !this.destroyed
        );
    }


    /**
     * Handle browser beforeunload.
     *
     * Do not perform asynchronous work here.
     */
    _handleBeforeUnload() {
        if (!this.started) {
            return;
        }

        eventBus.emit(
            "application:beforeUnload",
            {
                timestamp:
                    new Date().toISOString(),
            }
        );
    }


    /**
     * Initialise a service safely.
     */
    async _initialiseService(
        service,
        name
    ) {
        if (!service) {
            return;
        }

        try {
            if (
                typeof service.initialise ===
                    "function"
            ) {
                await service.initialise();
                return;
            }

            if (
                typeof service.init ===
                    "function"
            ) {
                await service.init();
                return;
            }
        } catch (error) {
            eventBus.emit(
                "application:error",
                {
                    phase:
                        "initialise",

                    service:
                        name,

                    error,
                }
            );

            throw error;
        }
    }


    /**
     * Read application version.
     *
     * Supports optional global configuration
     * without creating a hard dependency on config.
     */
    _readApplicationVersion() {
        if (
            typeof window !==
                "undefined" &&
            window.APP_CONFIG
        ) {
            return (
                window.APP_CONFIG.version ||
                null
            );
        }

        return null;
    }


    /**
     * Read runtime environment.
     */
    _readEnvironment() {
        if (
            typeof window !==
                "undefined" &&
            window.APP_CONFIG
        ) {
            return (
                window.APP_CONFIG.environment ||
                null
            );
        }

        if (
            typeof import.meta !==
                "undefined" &&
            import.meta.env
        ) {
            return (
                import.meta.env.MODE ||
                null
            );
        }

        return null;
    }
}


/**
 * Singleton application instance.
 */
export const application =
    new Application();


/**
 * Named export.
 */
export {
    Application,
};


/**
 * Default export.
 */
export default application;
