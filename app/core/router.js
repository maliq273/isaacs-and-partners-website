/**
 * Isaacs and Partners
 * Client-side Application Router
 *
 * Lightweight History API router.
 *
 * Responsibilities:
 * - Register application routes
 * - Resolve routes
 * - Handle browser navigation
 * - Handle internal link navigation
 * - Support route parameters
 * - Support protected routes
 * - Support custom route guards
 * - Integrate with AuthGuard through dependency injection
 * - Maintain current-route state
 * - Emit navigation lifecycle events
 *
 * IMPORTANT:
 * The router does NOT import AuthGuard directly.
 *
 * AuthGuard depends on Router, therefore importing AuthGuard
 * here would create a circular dependency.
 *
 * Instead:
 *
 *     router.setAuthGuard(authGuard)
 *
 * is used during application configuration.
 *
 * The router is intentionally independent from:
 * - AuthService
 * - AuthGuard
 * - application state implementation
 * - storage providers
 * - Supabase
 * - localStorage
 * - sessionStorage
 *
 * Those dependencies are injected/configured elsewhere.
 */

import { eventBus } from "./events.js";

class Router {
    constructor() {
        this.routes = new Map();

        this.started = false;
        this.initialised = false;

        this.currentRoute = null;

        this.notFoundHandler = null;

        /*
         * Authentication guard is injected after both
         * Router and AuthGuard have been created.
         */
        this.authGuard = null;

        /*
         * Prevent duplicate navigation requests.
         */
        this.navigationInProgress = false;

        /*
         * Bound browser event handlers.
         */
        this.handlePopState =
            this.handlePopState.bind(this);

        this.handleClick =
            this.handleClick.bind(this);
    }

    /**
     * Initialise router.
     */
    initialise() {
        if (this.initialised) {
            return this;
        }

        this.initialised = true;

        eventBus.initialise?.();

        return this;
    }

    /**
     * Alias for initialise().
     */
    init() {
        return this.initialise();
    }

    /**
     * Inject authentication guard.
     *
     * This avoids a circular dependency between Router
     * and AuthGuard.
     */
    setAuthGuard(guard) {
        if (
            guard !== null &&
            typeof guard !== "object" &&
            typeof guard !== "function"
        ) {
            throw new TypeError(
                "Authentication guard must be an object, function or null."
            );
        }

        this.authGuard = guard;

        return this;
    }

    /**
     * Return configured authentication guard.
     */
    getAuthGuard() {
        return this.authGuard;
    }

    /**
     * Register application route.
     *
     * Example:
     *
     * router.register(
     *     "/dashboard/",
     *     handler,
     *     {
     *         protected: true
     *     }
     * );
     */
    register(
        path,
        handler,
        options = {}
    ) {
        if (
            typeof path !== "string" ||
            path.trim() === ""
        ) {
            throw new TypeError(
                "Route path must be a non-empty string."
            );
        }

        if (
            typeof handler !== "function"
        ) {
            throw new TypeError(
                "Route handler must be a function."
            );
        }

        if (
            options === null ||
            typeof options !== "object"
        ) {
            throw new TypeError(
                "Route options must be an object."
            );
        }

        const normalisedPath =
            this._normalisePath(path);

        this.routes.set(
            normalisedPath,
            {
                path: normalisedPath,

                handler,

                protected:
                    Boolean(
                        options.protected
                    ),

                meta:
                    options.meta &&
                    typeof options.meta === "object"
                        ? options.meta
                        : {},

                guard:
                    options.guard || null
            }
        );

        return this;
    }

    /**
     * Unregister route.
     */
    unregister(path) {
        return this.routes.delete(
            this._normalisePath(path)
        );
    }

    /**
     * Register not-found handler.
     */
    setNotFoundHandler(handler) {
        if (
            handler !== null &&
            typeof handler !== "function"
        ) {
            throw new TypeError(
                "Not-found handler must be a function or null."
            );
        }

        this.notFoundHandler =
            handler;

        return this;
    }

    /**
     * Start router.
     */
    async start() {
        if (this.started) {
            return this;
        }

        if (
            typeof window ===
            "undefined"
        ) {
            this.initialise();

            return this;
        }

        this.initialise();

        window.addEventListener(
            "popstate",
            this.handlePopState
        );

        document.addEventListener(
            "click",
            this.handleClick
        );

        this.started = true;

        const initialPath =
            window.location.pathname +
            window.location.search +
            window.location.hash;

        const initialMatch =
            this._matchRoute(
                window.location.pathname
            );

        /*
         * Only resolve the initial URL when:
         *
         * 1. It is a registered application route, or
         * 2. A not-found handler exists.
         *
         * This allows normal static documents to continue
         * behaving normally.
         */
        if (
            initialMatch ||
            this.notFoundHandler
        ) {
            await this.resolve(
                initialPath,
                {
                    replace: true,
                    initial: true,
                    fromPopState: false
                }
            );
        }

        eventBus.emit(
            "router:started",
            {
                path:
                    window.location.pathname
            }
        );

        return this;
    }

    /**
     * Stop router.
     */
    async stop() {
        if (!this.started) {
            return this;
        }

        if (
            typeof window !==
            "undefined"
        ) {
            window.removeEventListener(
                "popstate",
                this.handlePopState
            );

            document.removeEventListener(
                "click",
                this.handleClick
            );
        }

        this.started = false;

        eventBus.emit(
            "router:stopped",
            {}
        );

        return this;
    }

    /**
     * Navigate to application route.
     *
     * Protected navigation is checked BEFORE the
     * browser history is modified.
     *
     * This prevents an unauthorised route from being
     * inserted into browser history.
     */
    async navigate(
        path,
        {
            replace = false,
            state = {}
        } = {}
    ) {
        const target =
            this._normaliseUrl(path);

        const url =
            this._parseUrl(target);

        const match =
            this._matchRoute(
                url.pathname
            );

        /*
         * Unknown route.
         *
         * If there is no application route and no
         * not-found handler, allow the browser to handle
         * the destination as a normal document.
         */
        if (
            !match &&
            !this.notFoundHandler
        ) {
            if (
                typeof window !==
                "undefined"
            ) {
                if (replace) {
                    window.location.replace(
                        target
                    );
                } else {
                    window.location.assign(
                        target
                    );
                }
            }

            return null;
        }

        /*
         * Server/non-browser execution.
         */
        if (
            typeof window ===
            "undefined"
        ) {
            return this.resolve(
                target,
                {
                    state,
                    replace,
                    programmatic: true
                }
            );
        }

        /*
         * Prevent accidental duplicate navigation.
         *
         * This is deliberately lightweight. A later
         * navigation can still be triggered after the
         * previous navigation completes.
         */
        if (
            this.navigationInProgress
        ) {
            return null;
        }

        this.navigationInProgress = true;

        try {
            /*
             * If this is an application route, run the
             * guard BEFORE changing history.
             */
            if (match) {
                const guardResult =
                    await this._checkGuard(
                        match.route,
                        {
                            path:
                                url.pathname,

                            params:
                                match.params,

                            query:
                                url.searchParams,

                            route:
                                match.route,

                            context: {
                                state,
                                replace,
                                programmatic: true
                            }
                        }
                    );

                if (
                    guardResult === false ||
                    guardResult?.allowed === false
                ) {
                    eventBus.emit(
                        "router:navigationBlocked",
                        {
                            path:
                                url.pathname,

                            route:
                                match.route,

                            params:
                                match.params,

                            guardResult
                        }
                    );

                    return guardResult;
                }
            }

            /*
             * History is changed only after the route has
             * passed its authentication/custom guard.
             */
            if (replace) {
                window.history.replaceState(
                    state,
                    "",
                    target
                );
            } else {
                window.history.pushState(
                    state,
                    "",
                    target
                );
            }

            /*
             * Resolve the route while telling resolve()
             * that the guard has already been checked.
             */
            return await this.resolve(
                target,
                {
                    state,
                    replace,
                    programmatic: true,
                    guardAlreadyChecked: Boolean(match)
                }
            );

        } finally {
            this.navigationInProgress = false;
        }
    }

    /**
     * Browser history back.
     */
    back() {
        if (
            typeof window !==
            "undefined"
        ) {
            window.history.back();
        }
    }

    /**
     * Browser history forward.
     */
    forward() {
        if (
            typeof window !==
            "undefined"
        ) {
            window.history.forward();
        }
    }

    /**
     * Resolve route.
     *
     * Resolution does not modify browser history.
     */
    async resolve(
        path,
        context = {}
    ) {
        const url =
            this._parseUrl(path);

        const match =
            this._matchRoute(
                url.pathname
            );

        /*
         * No matching application route.
         */
        if (!match) {
            if (
                this.notFoundHandler
            ) {
                try {
                    const result =
                        await this.notFoundHandler({
                            path:
                                url.pathname,

                            query:
                                url.searchParams,

                            url,

                            ...context
                        });

                    this._setCurrentRoute(
                        url.pathname,
                        null,
                        context
                    );

                    return result;

                } catch (error) {
                    eventBus.emit(
                        "router:error",
                        {
                            path:
                                url.pathname,

                            route:
                                null,

                            params:
                                {},

                            error
                        }
                    );

                    throw error;
                }
            }

            this._setCurrentRoute(
                url.pathname,
                null,
                context
            );

            return null;
        }

        const route =
            match.route;

        /*
         * Authentication/custom guard.
         *
         * navigate() already runs this guard before
         * changing history. resolve() therefore skips it
         * when guardAlreadyChecked is true.
         *
         * Popstate and initial page loads still run it.
         */
        if (
            !context.guardAlreadyChecked
        ) {
            const guardResult =
                await this._checkGuard(
                    route,
                    {
                        path:
                            url.pathname,

                        params:
                            match.params,

                        query:
                            url.searchParams,

                        route,

                        context
                    }
                );

            if (
                guardResult === false ||
                guardResult?.allowed === false
            ) {
                eventBus.emit(
                    "router:navigationBlocked",
                    {
                        path:
                            url.pathname,

                        route,

                        params:
                            match.params,

                        guardResult
                    }
                );

                return guardResult;
            }
        }

        eventBus.emit(
            "router:beforeNavigate",
            {
                path:
                    url.pathname,

                route,

                params:
                    match.params,

                query:
                    url.searchParams,

                context
            }
        );

        try {
            const result =
                await route.handler({
                    path:
                        url.pathname,

                    params:
                        match.params,

                    query:
                        url.searchParams,

                    meta:
                        route.meta,

                    protected:
                        route.protected,

                    route,

                    url,

                    ...context
                });

            this._setCurrentRoute(
                url.pathname,
                route,
                {
                    ...context,
                    params:
                        match.params,
                    query:
                        url.searchParams
                }
            );

            /*
             * Keep central state synchronised.
             */
            eventBus.emit(
                "router:navigated",
                {
                    path:
                        url.pathname,

                    route,

                    params:
                        match.params,

                    query:
                        url.searchParams,

                    result
                }
            );

            return result;

        } catch (error) {
            eventBus.emit(
                "router:error",
                {
                    path:
                        url.pathname,

                    route,

                    params:
                        match.params,

                    error
                }
            );

            throw error;
        }
    }

    /**
     * Execute authentication/custom guard.
     *
     * Route-level custom guards take priority over
     * the global AuthGuard.
     */
    async _checkGuard(
        route,
        context
    ) {
        if (!route) {
            return true;
        }

        const guard =
            route.guard ||
            (
                route.protected
                    ? this.authGuard
                    : null
            );

        /*
         * Public route.
         */
        if (!guard) {
            return true;
        }

        return this._runGuard(
            guard,
            context
        );
    }

    /**
     * Execute authentication/custom guard.
     */
    async _runGuard(
        guard,
        context
    ) {
        /*
         * Function guard.
         *
         * Example:
         *
         * guard: ({ path, params }) => {
         *     return true;
         * }
         */
        if (
            typeof guard ===
            "function"
        ) {
            return guard(
                context
            );
        }

        /*
         * Object-based guard.
         *
         * Example:
         *
         * router.setAuthGuard(authGuard);
         *
         * where authGuard implements:
         *
         * guard(path, options)
         */
        if (
            guard &&
            typeof guard.guard ===
            "function"
        ) {
            return guard.guard(
                context.path,
                {
                    params:
                        context.params,

                    query:
                        context.query,

                    route:
                        context.route,

                    context:
                        context.context
                }
            );
        }

        throw new TypeError(
            "Configured route guard does not implement guard()."
        );
    }

    /**
     * Return current route.
     */
    getCurrentRoute() {
        return this.currentRoute;
    }

    /**
     * Return current pathname.
     */
    getCurrentPath() {
        return (
            this.currentRoute?.pathname ||
            null
        );
    }

    /**
     * Return current route parameters.
     */
    getCurrentParams() {
        return (
            this.currentRoute?.params ||
            {}
        );
    }

    /**
     * Return all routes.
     */
    getRoutes() {
        return [
            ...this.routes.entries()
        ];
    }

    /**
     * Determine whether route exists.
     */
    hasRoute(path) {
        return Boolean(
            this._matchRoute(
                this._normalisePath(path)
            )
        );
    }

    /**
     * Browser popstate handler.
     *
     * Back/forward navigation cannot be prevented
     * before the browser changes the URL, so resolve()
     * performs the authentication check.
     */
    handlePopState(event) {
        if (
            typeof window ===
            "undefined"
        ) {
            return;
        }

        const path =
            window.location.pathname +
            window.location.search +
            window.location.hash;

        this.resolve(
            path,
            {
                state:
                    event.state,
                fromPopState: true
            }
        ).catch(
            (error) => {
                console.error(
                    "[Router] Navigation failed:",
                    error
                );

                eventBus.emit(
                    "router:error",
                    {
                        path,
                        error
                    }
                );
            }
        );
    }

    /**
     * Intercept internal application links.
     */
    handleClick(event) {
        if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey
        ) {
            return;
        }

        const target =
            event.target;

        if (
            !target ||
            typeof target.closest !==
                "function"
        ) {
            return;
        }

        const link =
            target.closest("a");

        if (!link) {
            return;
        }

        /*
         * Respect browser behaviour.
         */
        if (
            link.target === "_blank" ||
            link.hasAttribute("download") ||
            link.hasAttribute("data-no-router")
        ) {
            return;
        }

        /*
         * Respect modifier-generated browser behaviour.
         */
        if (
            link.rel &&
            link.rel
                .toLowerCase()
                .includes("external")
        ) {
            return;
        }

        const href =
            link.getAttribute("href");

        if (!href) {
            return;
        }

        /*
         * Ignore anchors and special protocols.
         */
        if (
            href.startsWith("#") ||
            href.startsWith("mailto:") ||
            href.startsWith("tel:") ||
            href.startsWith("javascript:") ||
            href.startsWith("data:") ||
            href.startsWith("blob:")
        ) {
            return;
        }

        let url;

        try {
            url = new URL(
                href,
                window.location.href
            );
        } catch {
            return;
        }

        /*
         * External URL.
         */
        if (
            url.origin !==
            window.location.origin
        ) {
            return;
        }

        /*
         * Only intercept registered application
         * routes.
         *
         * This is important because Isaacs & Partners
         * may continue to use normal static HTML pages.
         */
        const match =
            this._matchRoute(
                url.pathname
            );

        if (!match) {
            return;
        }

        /*
         * Same URL should behave like a normal anchor
         * unless a hash is being changed.
         */
        if (
            url.pathname ===
                window.location.pathname &&
            url.search ===
                window.location.search &&
            url.hash ===
                window.location.hash
        ) {
            return;
        }

        event.preventDefault();

        this.navigate(
            url.pathname +
            url.search +
            url.hash
        ).catch(
            (error) => {
                console.error(
                    "[Router] Link navigation failed:",
                    error
                );
            }
        );
    }

    /**
     * Match route.
     *
     * Matching order:
     *
     * 1. Exact route
     * 2. Parameterised route
     */
    _matchRoute(pathname) {
        const normalisedPath =
            this._normalisePath(
                pathname
            );

        /*
         * Exact match first.
         *
         * This prevents a parameterised route from
         * accidentally taking precedence over a specific
         * registered route.
         */
        const direct =
            this.routes.get(
                normalisedPath
            );

        if (direct) {
            return {
                route: direct,
                params: {}
            };
        }

        /*
         * Parameterised routes.
         */
        for (
            const [
                routePath,
                route
            ] of this.routes
        ) {
            /*
             * Exact paths have already been checked.
             */
            if (
                routePath ===
                normalisedPath
            ) {
                continue;
            }

            const params =
                this._matchPattern(
                    routePath,
                    normalisedPath
                );

            if (params) {
                return {
                    route,
                    params
                };
            }
        }

        return null;
    }

    /**
     * Match parameterised route.
     *
     * Example:
     *
     * /matters/:id
     *
     * matches:
     *
     * /matters/123
     *
     * and returns:
     *
     * {
     *     id: "123"
     * }
     */
    _matchPattern(
        pattern,
        pathname
    ) {
        const patternParts =
            this._normalisePath(
                pattern
            )
                .split("/")
                .filter(Boolean);

        const pathParts =
            this._normalisePath(
                pathname
            )
                .split("/")
                .filter(Boolean);

        if (
            patternParts.length !==
            pathParts.length
        ) {
            return null;
        }

        const params = {};

        for (
            let index = 0;
            index <
            patternParts.length;
            index += 1
        ) {
            const patternPart =
                patternParts[index];

            const pathPart =
                pathParts[index];

            /*
             * Dynamic parameter.
             */
            if (
                patternPart.startsWith(":")
            ) {
                const parameterName =
                    patternPart.slice(1);

                if (
                    !parameterName
                ) {
                    return null;
                }

                /*
                 * Prevent malformed parameter names.
                 */
                if (
                    !/^[A-Za-z0-9_-]+$/.test(
                        parameterName
                    )
                ) {
                    return null;
                }

                try {
                    params[
                        parameterName
                    ] =
                        decodeURIComponent(
                            pathPart
                        );
                } catch {
                    return null;
                }

                continue;
            }

            /*
             * Static path segment.
             */
            if (
                patternPart !==
                pathPart
            ) {
                return null;
            }
        }

        return params;
    }

    /**
     * Set current route.
     */
    _setCurrentRoute(
        pathname,
        route,
        context = {}
    ) {
        this.currentRoute = {
            pathname,

            route,

            timestamp:
                new Date().toISOString(),

            ...context
        };

        /*
         * Synchronise central state if possible.
         */
        eventBus.emit(
            "router:stateChanged",
            {
                currentRoute:
                    this.currentRoute
            }
        );
    }

    /**
     * Normalise route path.
     *
     * Examples:
     *
     * "/dashboard/"
     *     -> "/dashboard"
     *
     * "/dashboard/?a=1"
     *     -> "/dashboard"
     *
     * "/"
     *     -> "/"
     */
    _normalisePath(path) {
        if (
            path === null ||
            path === undefined ||
            path === ""
        ) {
            return "/";
        }

        const clean =
            String(path)
                .split("?")[0]
                .split("#")[0]
                .replace(
                    /\/+/g,
                    "/"
                );

        if (
            clean === "" ||
            clean === "/"
        ) {
            return "/";
        }

        /*
         * Ensure route paths always begin with "/".
         */
        const withLeadingSlash =
            clean.startsWith("/")
                ? clean
                : `/${clean}`;

        /*
         * Remove trailing slash except root.
         */
        return withLeadingSlash.endsWith("/")
            ? withLeadingSlash.slice(0, -1)
            : withLeadingSlash;
    }

    /**
     * Normalise URL.
     *
     * Query strings and hashes are preserved.
     */
    _normaliseUrl(path) {
        if (
            path === null ||
            path === undefined ||
            String(path).trim() === ""
        ) {
            return "/";
        }

        if (
            typeof window ===
            "undefined"
        ) {
            return String(path);
        }

        const url =
            new URL(
                String(path),
                window.location.origin
            );

        return (
            url.pathname +
            url.search +
            url.hash
        );
    }

    /**
     * Parse URL safely.
     */
    _parseUrl(path) {
        return new URL(
            String(path || "/"),
            typeof window !==
                "undefined"
                ? window.location.origin
                : "http://localhost"
        );
    }
}

/**
 * Singleton router.
 *
 * Application modules should normally import:
 *
 *     import router from "./core/router.js";
 *
 * or:
 *
 *     import { router } from "./core/router.js";
 */
export const router =
    new Router();

export {
    Router
};

export default router;
