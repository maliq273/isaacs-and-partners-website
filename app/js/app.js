/**
 * Isaacs & Partners
 * Frontend Application Entry Point
 *
 * File:
 * app/js/app.js
 *
 * Responsibilities:
 * - Start the central application runtime
 * - Expose the frontend application adapter
 * - Synchronise application state with the DOM
 * - Bridge core lifecycle events to browser events
 * - Synchronise authentication state
 * - Synchronise route state
 * - Register network listeners
 * - Provide controlled startup/shutdown
 *
 * IMPORTANT:
 * The actual application lifecycle is owned by:
 *
 * app/core/bootstrap.js
 * app/core/application.js
 *
 * This file MUST NOT create a second Application runtime.
 */

"use strict";


/* =========================================================
   CORE IMPORTS
   ========================================================= */

import bootstrap, {
    shutdown as shutdownApplication
} from "../core/bootstrap.js";

import application from "../core/application.js";

import {
    appState
} from "../core/state.js";

import {
    router
} from "../core/router.js";


/* =========================================================
   FRONTEND APPLICATION ADAPTER
   ========================================================= */

class FrontendApplication {

    constructor() {

        /*
         * The core Application instance remains the single
         * source of application lifecycle truth.
         */
        this.application =
            application;


        /*
         * Shared application state.
         *
         * app.js synchronises state but does not replace
         * the state manager.
         */
        this.state =
            appState;


        /*
         * Shared application router.
         *
         * app.js observes route changes but does not create
         * another router.
         */
        this.router =
            router;


        /*
         * Frontend lifecycle state.
         */
        this.started =
            false;


        /*
         * All browser/core event cleanup callbacks are
         * registered here.
         */
        this.listeners =
            [];


        /*
         * Prevent duplicate startup attempts.
         */
        this.startPromise =
            null;

    }


    /* =====================================================
       START
       ===================================================== */

    async start() {

        if (this.started) {
            return this;
        }


        /*
         * If another startup operation is already running,
         * wait for it rather than starting another runtime.
         */
        if (this.startPromise) {
            return this.startPromise;
        }


        this.startPromise =
            this.performStart();


        try {

            await this.startPromise;

            return this;

        } finally {

            this.startPromise =
                null;

        }

    }


    /* =====================================================
       PERFORM START
       ===================================================== */

    async performStart() {

        try {

            /*
             * The core bootstrap owns application startup.
             *
             * DO NOT instantiate Application here.
             *
             * DO NOT call application.start() separately.
             */
            await this.runBootstrap();


            /*
             * Configure the document after the core runtime
             * has successfully initialised.
             */
            this.initialiseDom();


            /*
             * Register browser-level listeners.
             */
            this.registerNetworkListeners();

            this.registerApplicationListeners();

            this.registerAuthenticationListeners();


            /*
             * Synchronise the initial route.
             */
            this.syncRouteState();


            /*
             * Synchronise the current network state.
             */
            this.syncNetworkState();


            /*
             * Synchronise authentication state if the core
             * application exposes it.
             */
            this.syncAuthenticationState();


            this.started =
                true;


            this.emit(
                "app:started",
                {
                    application:
                        this.application,

                    status:
                        this.getStatus()
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


    /* =====================================================
       BOOTSTRAP ADAPTER
       ===================================================== */

    async runBootstrap() {

        /*
         * The project currently uses bootstrap.js as the
         * central lifecycle coordinator.
         *
         * Prefer its exported start function when available.
         */

        if (
            typeof bootstrap ===
            "function"
        ) {

            return bootstrap();

        }


        /*
         * Defensive compatibility for a bootstrap module
         * that exposes a .start() method instead.
         */
        if (
            bootstrap &&
            typeof bootstrap.start ===
            "function"
        ) {

            return bootstrap.start();

        }


        /*
         * Final compatibility fallback.
         *
         * The imported application remains the existing
         * singleton from core/application.js.
         */
        if (
            this.application &&
            typeof this.application.start ===
            "function"
        ) {

            return this.application.start();

        }


        throw new Error(
            "Application bootstrap is unavailable."
        );

    }


    /* =====================================================
       DOM INITIALISATION
       ===================================================== */

    initialiseDom() {

        if (
            typeof document ===
            "undefined"
        ) {
            return;
        }


        const root =
            document.documentElement;


        /*
         * Application identity.
         */
        root.dataset.application =
            "isaacs-and-partners";


        /*
         * Preserve an existing version if index.html has
         * already supplied one.
         */
        root.dataset.version =
            root.dataset.version ||
            "1.0.0";


        /*
         * Environment detection.
         */
        root.dataset.environment =
            this.detectEnvironment();


        /*
         * Initial connectivity state.
         */
        root.dataset.online =
            this.isOnline()
                ? "true"
                : "false";


        /*
         * Initial authentication state.
         */
        root.dataset.authenticated =
            this.isAuthenticated()
                ? "true"
                : "false";

    }


    /* =====================================================
       ENVIRONMENT
       ===================================================== */

    detectEnvironment() {

        if (
            typeof window ===
            "undefined"
        ) {

            return "unknown";

        }


        const hostname =
            window.location.hostname;


        if (
            hostname ===
            "localhost" ||
            hostname ===
            "127.0.0.1" ||
            hostname ===
            "::1"
        ) {

            return "development";

        }


        /*
         * GitHub Pages is still a production-style
         * environment for this application.
         */
        return "production";

    }


    /* =====================================================
       NETWORK LISTENERS
       ===================================================== */

    registerNetworkListeners() {

        if (
            typeof window ===
            "undefined"
        ) {
            return;
        }


        const onlineHandler =
            () => {

                this.setOnlineState(
                    true
                );


                this.emit(
                    "network:online",
                    {
                        online:
                            true
                    }
                );

            };


        const offlineHandler =
            () => {

                this.setOnlineState(
                    false
                );


                this.emit(
                    "network:offline",
                    {
                        online:
                            false
                    }
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


    /* =====================================================
       NETWORK STATE
       ===================================================== */

    syncNetworkState() {

        this.setOnlineState(
            this.isOnline()
        );

    }


    setOnlineState(
        online
    ) {

        const value =
            Boolean(online);


        /*
         * Use the existing state manager when available.
         *
         * State path:
         *
         * system.online
         */
        this.setStateValue(
            "system.online",
            value
        );


        /*
         * Keep the DOM synchronised.
         */
        if (
            typeof document !==
            "undefined"
        ) {

            document.documentElement.dataset.online =
                value
                    ? "true"
                    : "false";

        }

    }


    /* =====================================================
       CORE APPLICATION LISTENERS
       ===================================================== */

    registerApplicationListeners() {

        const events =
            this.getEventBus();


        if (
            !events ||
            typeof events.on !==
            "function"
        ) {
            return;
        }


        /*
         * Core application started.
         */
        const startedHandler =
            (event) => {

                this.emit(
                    "app:coreStarted",
                    event || null
                );

            };


        /*
         * Core application stopped.
         */
        const stoppedHandler =
            (event) => {

                this.emit(
                    "app:coreStopped",
                    event || null
                );

            };


        /*
         * Router navigation.
         */
        const routeHandler =
            (event) => {

                const route =
                    this.extractRoute(
                        event
                    );


                if (route) {

                    this.setRoute(
                        route
                    );

                }

            };


        this.registerCoreListener(
            events,
            "application:started",
            startedHandler
        );


        this.registerCoreListener(
            events,
            "application:stopped",
            stoppedHandler
        );


        this.registerCoreListener(
            events,
            "router:navigated",
            routeHandler
        );


        this.registerCoreListener(
            events,
            "route:change",
            routeHandler
        );

    }


    /* =====================================================
       AUTHENTICATION LISTENERS
       ===================================================== */

    registerAuthenticationListeners() {

        const events =
            this.getEventBus();


        if (
            !events ||
            typeof events.on !==
            "function"
        ) {
            return;
        }


        /*
         * Support the existing authentication event naming
         * without creating a second authentication system.
         */
        const authenticationHandler =
            (event) => {

                const user =
                    this.extractUser(
                        event
                    );


                this.setUser(
                    user
                );

            };


        this.registerCoreListener(
            events,
            "auth:login",
            authenticationHandler
        );


        this.registerCoreListener(
            events,
            "auth:authenticated",
            authenticationHandler
        );


        this.registerCoreListener(
            events,
            "authentication:success",
            authenticationHandler
        );


        const logoutHandler =
            () => {

                this.clearUser();

            };


        this.registerCoreListener(
            events,
            "auth:logout",
            logoutHandler
        );


        this.registerCoreListener(
            events,
            "authentication:logout",
            logoutHandler
        );

    }


    /* =====================================================
       EVENT BUS
       ===================================================== */

    getEventBus() {

        /*
         * application.dependencies.events may exist in
         * future/alternate builds.
         */
        if (
            this.application &&
            this.application.dependencies &&
            this.application.dependencies.events
        ) {

            return this.application
                .dependencies
                .events;

        }


        /*
         * Some application implementations expose events
         * directly.
         */
        if (
            this.application &&
            this.application.events
        ) {

            return this.application.events;

        }


        /*
         * Router may expose the central event bus.
         */
        if (
            this.router &&
            this.router.events
        ) {

            return this.router.events;

        }


        /*
         * No event bus available.
         */
        return null;

    }


    /* =====================================================
       CORE LISTENER REGISTRATION
       ===================================================== */

    registerCoreListener(
        events,
        eventName,
        handler
    ) {

        if (
            !events ||
            typeof events.on !==
            "function"
        ) {
            return;
        }


        try {

            const cleanup =
                events.on(
                    eventName,
                    handler
                );


            if (
                typeof cleanup ===
                "function"
            ) {

                this.listeners.push(
                    cleanup
                );

            }

        } catch (error) {

            console.warn(
                `[App] Unable to register event: ${eventName}`,
                error
            );

        }

    }


    /* =====================================================
       ROUTE SYNCHRONISATION
       ===================================================== */

    syncRouteState() {

        if (
            typeof window ===
            "undefined"
        ) {
            return;
        }


        let current =
            null;


        /*
         * Use the existing router first.
         */
        if (
            this.router &&
            typeof this.router.getCurrentRoute ===
            "function"
        ) {

            try {

                current =
                    this.router.getCurrentRoute();

            } catch (error) {

                console.warn(
                    "[App] Unable to read current route:",
                    error
                );

            }

        }


        const route =
            this.extractRoute(
                current
            );


        if (route) {

            this.setRoute(
                route
            );

            return;

        }


        /*
         * Fall back to the browser URL.
         */
        this.setRoute(
            window.location.pathname
        );

    }


    /* =====================================================
       ROUTE STATE
       ===================================================== */

    setRoute(
        route
    ) {

        const value =
            route || null;


        /*
         * Use the central application state.
         *
         * State path:
         *
         * navigation.currentPath
         */
        this.setStateValue(
            "navigation.currentPath",
            value
        );


        /*
         * DOM synchronisation.
         */
        if (
            typeof document !==
            "undefined"
        ) {

            document.documentElement.dataset.route =
                value || "";

        }


        this.emit(
            "route:change",
            value
        );

    }


    getRoute() {

        const stateValue =
            this.getStateValue(
                "navigation.currentPath",
                null
            );


        if (stateValue) {
            return stateValue;
        }


        if (
            typeof window !==
            "undefined"
        ) {

            return window.location.pathname;

        }


        return null;

    }


    /* =====================================================
       USER MANAGEMENT
       ===================================================== */

    setUser(
        user
    ) {

        const authenticated =
            Boolean(user);


        /*
         * Authentication state is owned by the central
         * state manager.
         *
         * State paths:
         *
         * auth.authenticated
         * auth.user
         */
        this.setStateValue(
            "auth.authenticated",
            authenticated
        );


        this.setStateValue(
            "auth.user",
            user || null
        );


        /*
         * DOM synchronisation.
         */
        if (
            typeof document !==
            "undefined"
        ) {

            document.documentElement.dataset.authenticated =
                authenticated
                    ? "true"
                    : "false";

        }


        this.emit(
            "auth:userchange",
            user || null
        );


        return user || null;

    }


    clearUser() {

        return this.setUser(
            null
        );

    }


    getUser() {

        return this.getStateValue(
            "auth.user",
            null
        );

    }


    isAuthenticated() {

        return Boolean(
            this.getStateValue(
                "auth.authenticated",
                false
            )
        );

    }


    /* =====================================================
       AUTHENTICATION SYNCHRONISATION
       ===================================================== */

    syncAuthenticationState() {

        /*
         * Do not invent authentication data here.
         *
         * AuthService / SessionManager remain responsible
         * for the actual session.
         *
         * We only synchronise an already available state.
         */
        const user =
            this.getUser();


        if (user) {

            this.setUser(
                user
            );

            return;

        }


        const authenticated =
            Boolean(
                this.getStateValue(
                    "auth.authenticated",
                    false
                )
            );


        if (!authenticated) {

            this.clearUser();

        }

    }


    /* =====================================================
       STATE HELPERS
       ===================================================== */

    setStateValue(
        path,
        value
    ) {

        if (
            !this.state ||
            typeof this.state.set !==
            "function"
        ) {
            return;
        }


        try {

            this.state.set(
                path,
                value
            );

        } catch (error) {

            /*
             * Compatibility fallback for state managers
             * which expect nested objects instead of paths.
             */
            this.setNestedStateValue(
                path,
                value,
                error
            );

        }

    }


    getStateValue(
        path,
        defaultValue = null
    ) {

        if (
            !this.state ||
            typeof this.state.get !==
            "function"
        ) {

            return defaultValue;

        }


        try {

            const value =
                this.state.get(
                    path,
                    defaultValue
                );


            return value === undefined
                ? defaultValue
                : value;

        } catch (error) {

            return defaultValue;

        }

    }


    setNestedStateValue(
        path,
        value,
        originalError = null
    ) {

        if (
            !this.state
        ) {
            return;
        }


        const parts =
            String(path)
                .split(".")
                .filter(
                    Boolean
                );


        if (
            parts.length !== 2
        ) {

            if (originalError) {

                console.warn(
                    `[App] Unable to set state "${path}".`,
                    originalError
                );

            }

            return;

        }


        const [
            parent,
            child
        ] =
            parts;


        try {

            const existing =
                typeof this.state.get ===
                "function"
                    ? this.state.get(
                        parent,
                        {}
                    )
                    : {};


            const next =
                {
                    ...(existing || {}),
                    [child]:
                        value
                };


            this.state.set(
                parent,
                next
            );

        } catch (error) {

            console.warn(
                `[App] Unable to synchronise state "${path}".`,
                error
            );

        }

    }


    /* =====================================================
       ONLINE STATUS
       ===================================================== */

    isOnline() {

        if (
            typeof navigator ===
            "undefined"
        ) {

            return true;

        }


        return navigator.onLine;

    }


    /* =====================================================
       EVENT BRIDGE
       ===================================================== */

    emit(
        eventName,
        detail = null
    ) {

        if (
            typeof window ===
            "undefined"
        ) {
            return;
        }


        /*
         * CustomEvent is supported by modern browsers.
         */
        window.dispatchEvent(
            new CustomEvent(
                eventName,
                {
                    detail
                }
            )
        );

    }


    /* =====================================================
       ROUTE EXTRACTION
       ===================================================== */

    extractRoute(
        event
    ) {

        if (!event) {
            return null;
        }


        if (
            typeof event ===
            "string"
        ) {

            return event;

        }


        if (
            event.path
        ) {

            return event.path;

        }


        if (
            event.pathname
        ) {

            return event.pathname;

        }


        if (
            event.route
        ) {

            if (
                typeof event.route ===
                "string"
            ) {

                return event.route;

            }


            if (
                event.route.path
            ) {

                return event.route.path;

            }

        }


        if (
            event.detail
        ) {

            return this.extractRoute(
                event.detail
            );

        }


        return null;

    }


    /* =====================================================
       USER EXTRACTION
       ===================================================== */

    extractUser(
        event
    ) {

        if (!event) {
            return null;
        }


        if (
            event.user
        ) {

            return event.user;

        }


        if (
            event.detail
        ) {

            return this.extractUser(
                event.detail
            );

        }


        return null;

    }


    /* =====================================================
       STARTUP ERROR
       ===================================================== */

    handleStartupError(
        error
    ) {

        console.error(
            "[App] Application startup failed:",
            error
        );


        if (
            typeof document !==
            "undefined"
        ) {

            document.documentElement.dataset.applicationError =
                "true";

        }


        this.emit(
            "app:startupError",
            {
                error
            }
        );

    }


    /* =====================================================
       SHUTDOWN
       ===================================================== */

    async shutdown() {

        /*
         * Nothing to shut down if the frontend adapter
         * was never started.
         */
        if (
            !this.started
        ) {

            return;

        }


        /*
         * Remove every browser/core listener registered
         * by this adapter.
         */
        const cleanupFunctions =
            this.listeners.splice(
                0
            );


        for (
            const cleanup
            of cleanupFunctions
        ) {

            try {

                if (
                    typeof cleanup ===
                    "function"
                ) {

                    cleanup();

                }

            } catch (error) {

                console.error(
                    "[App] Listener cleanup failed:",
                    error
                );

            }

        }


        /*
         * Shut down the SAME core application runtime.
         *
         * No new runtime is created.
         */
        try {

            if (
                typeof shutdownApplication ===
                "function"
            ) {

                await shutdownApplication();

            } else if (
                this.application &&
                typeof this.application.shutdown ===
                "function"
            ) {

                await this.application.shutdown();

            }

        } catch (error) {

            console.error(
                "[App] Application shutdown failed:",
                error
            );

        }


        this.started =
            false;


        this.emit(
            "app:shutdown"
        );

    }


    /* =====================================================
       STATUS
       ===================================================== */

    getStatus() {

        let coreStatus =
            null;


        if (
            this.application &&
            typeof this.application.getStatus ===
            "function"
        ) {

            try {

                coreStatus =
                    this.application.getStatus();

            } catch (error) {

                coreStatus =
                    {
                        error:
                            error.message
                    };

            }

        }


        return {

            started:
                this.started,

            core:
                coreStatus,

            route:
                this.getRoute(),

            authenticated:
                this.isAuthenticated(),

            user:
                this.getUser(),

            online:
                this.isOnline(),

            environment:
                this.detectEnvironment()

        };

    }

}


/* =========================================================
   SINGLE FRONTEND APPLICATION INSTANCE
   ========================================================= */

/*
 * Exactly ONE frontend adapter instance.
 *
 * The underlying Application instance still comes from:
 *
 * app/core/application.js
 */
export const app =
    new FrontendApplication();


export {
    FrontendApplication
};


export default app;


/* =========================================================
   BROWSER STARTUP
   ========================================================= */

/*
 * Only browser environments should automatically start
 * the frontend application.
 *
 * Node/test environments can import the module without
 * triggering browser startup.
 */
if (
    typeof document !==
    "undefined"
) {

    const startApplication =
        () => {

            app.start()
                .catch(
                    (error) => {

                        console.error(
                            "[App] Fatal startup error:",
                            error
                        );

                    }
                );

        };


    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            startApplication,
            {
                once:
                    true
            }
        );

    } else {

        startApplication();

    }

}
