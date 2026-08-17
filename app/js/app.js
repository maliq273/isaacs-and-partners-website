/**
 * Isaacs & Partners
 * Frontend Application Entry Point
 *
 * File:
 * app/js/app.js
 *
 * Responsibilities:
 * - Start the central application runtime
 * - Expose the application instance
 * - Synchronise application state with the DOM
 * - Register frontend lifecycle listeners
 * - Provide controlled startup/shutdown
 *
 * IMPORTANT:
 * The actual application lifecycle is owned by:
 *
 * app/core/bootstrap.js
 * app/core/application.js
 *
 * This file must NOT create a second Application runtime.
 */

"use strict";

import bootstrap, {
    shutdown as shutdownApplication
} from "../core/bootstrap.js";

import application from "../core/application.js";
import { appState } from "../core/state.js";
import { router } from "../core/router.js";


/* =====================================================
   FRONTEND APPLICATION ADAPTER
   ===================================================== */

class FrontendApplication {

    constructor() {

        this.application =
            application;

        this.state =
            appState;

        this.router =
            router;

        this.started =
            false;

        this.listeners =
            [];

    }


    /* =================================================
       START
       ================================================= */

    async start() {

        if (this.started) {
            return this;
        }

        try {

            await bootstrap();

            this.initialiseDom();

            this.registerNetworkListeners();

            this.registerApplicationListeners();

            this.syncRouteState();

            this.started = true;

            this.emit(
                "app:started",
                {
                    application:
                        this.application
                }
            );

            return this;

        } catch (error) {

            this.handleStartupError(error);

            throw error;

        }

    }


    /* =================================================
       DOM INITIALISATION
       ================================================= */

    initialiseDom() {

        if (
            typeof document ===
            "undefined"
        ) {
            return;
        }

        document.documentElement.dataset.application =
            "isaacs-and-partners";

        document.documentElement.dataset.version =
            document.documentElement.dataset.version ||
            "1.0.0";

        document.documentElement.dataset.environment =
            window.location.hostname === "localhost" ||
            window.location.hostname === "127.0.0.1"
                ? "development"
                : "production";

    }


    /* =================================================
       NETWORK STATUS
       ================================================= */

    registerNetworkListeners() {

        if (
            typeof window ===
            "undefined"
        ) {
            return;
        }

        const onlineHandler = () => {

            this.state.set(
                "online",
                true
            );

            this.emit(
                "network:online"
            );

        };


        const offlineHandler = () => {

            this.state.set(
                "online",
                false
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


    /* =================================================
       APPLICATION EVENT LISTENERS
       ================================================= */

    registerApplicationListeners() {

        if (
            !this.application ||
            !this.application.dependencies
        ) {
            return;
        }

        const events =
            this.application.dependencies.events;

        if (
            !events ||
            typeof events.on !==
            "function"
        ) {
            return;
        }


        const startedHandler =
            (event) => {

                this.emit(
                    "app:coreStarted",
                    event
                );

            };


        const stoppedHandler =
            (event) => {

                this.emit(
                    "app:coreStopped",
                    event
                );

            };


        const routeHandler =
            (event) => {

                if (
                    event &&
                    event.path
                ) {

                    this.setRoute(
                        event.path
                    );

                }

            };


        const removeStarted =
            events.on(
                "application:started",
                startedHandler
            );


        const removeStopped =
            events.on(
                "application:stopped",
                stoppedHandler
            );


        const removeRoute =
            events.on(
                "router:navigated",
                routeHandler
            );


        if (
            typeof removeStarted ===
            "function"
        ) {
            this.listeners.push(
                removeStarted
            );
        }


        if (
            typeof removeStopped ===
            "function"
        ) {
            this.listeners.push(
                removeStopped
            );
        }


        if (
            typeof removeRoute ===
            "function"
        ) {
            this.listeners.push(
                removeRoute
            );
        }

    }


    /* =================================================
       ROUTE SYNCHRONISATION
       ================================================= */

    syncRouteState() {

        if (
            typeof window ===
            "undefined"
        ) {
            return;
        }

        const current =
            this.router.getCurrentRoute();

        if (current) {

            this.setRoute(
                current.pathname
            );

            return;

        }

        this.setRoute(
            window.location.pathname
        );

    }


    /* =================================================
       USER MANAGEMENT
       ================================================= */

    setUser(user) {

        this.state.set(
            "authenticated",
            Boolean(user)
        );

        this.state.set(
            "user",
            user || null
        );


        this.emit(
            "auth:userchange",
            user || null
        );

    }


    clearUser() {

        this.setUser(null);

    }


    getUser() {

        return this.state.get(
            "user",
            null
        );

    }


    isAuthenticated() {

        return Boolean(
            this.state.get(
                "authenticated",
                false
            )
        );

    }


    /* =================================================
       ROUTE STATE
       ================================================= */

    setRoute(route) {

        this.state.set(
            "currentRoute",
            route || null
        );

        this.emit(
            "route:change",
            route || null
        );

    }


    getRoute() {

        return this.state.get(
            "currentRoute",
            null
        );

    }


    /* =================================================
       ONLINE STATUS
       ================================================= */

    isOnline() {

        if (
            typeof navigator ===
            "undefined"
        ) {
            return true;
        }

        return navigator.onLine;

    }


    /* =================================================
       EVENT BRIDGE
       ================================================= */

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

        window.dispatchEvent(
            new CustomEvent(
                eventName,
                {
                    detail
                }
            )
        );

    }


    /* =================================================
       STARTUP ERROR
       ================================================= */

    handleStartupError(error) {

        console.error(
            "[App] Application startup failed:",
            error
        );


        if (
            typeof document ===
            "undefined"
        ) {
            return;
        }


        this.emit(
            "app:startupError",
            {
                error
            }
        );

    }


    /* =================================================
       SHUTDOWN
       ================================================= */

    async shutdown() {

        if (
            !this.started
        ) {
            return;
        }


        for (
            const cleanup
            of this.listeners.splice(0)
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


        try {

            await shutdownApplication();

        } catch (error) {

            console.error(
                "[App] Application shutdown failed:",
                error
            );

        }


        this.started = false;


        this.emit(
            "app:shutdown"
        );

    }


    /* =================================================
       STATUS
       ================================================= */

    getStatus() {

        return {
            started:
                this.started,

            core:
                this.application.getStatus(),

            route:
                this.getRoute(),

            authenticated:
                this.isAuthenticated(),

            online:
                this.isOnline()
        };

    }

}


/* =====================================================
   SINGLE FRONTEND APPLICATION INSTANCE
   ===================================================== */

export const app =
    new FrontendApplication();


export {
    FrontendApplication
};


export default app;


/* =====================================================
   BROWSER BOOTSTRAP
   ===================================================== */

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
                once: true
            }
        );

    } else {

        startApplication();

    }

}
