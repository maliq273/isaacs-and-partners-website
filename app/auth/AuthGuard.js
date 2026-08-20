/**
 * Isaacs and Partners
 * Authentication Guard
 *
 * Responsibilities:
 * - Protect application routes
 * - Verify authentication through AuthService
 * - Restore/check an existing session before allowing navigation
 * - Redirect unauthenticated users to the login route
 * - Preserve a safe return URL
 * - Prevent open redirects
 * - Avoid redirect loops
 * - Support Router dependency injection
 *
 * IMPORTANT:
 *
 * AuthGuard does NOT import Router.
 *
 * Router depends on AuthGuard through dependency injection:
 *
 *     router.setAuthGuard(authGuard)
 *
 * This prevents a circular dependency.
 */

import auth from "./AuthService.js";
import { eventBus } from "../core/events.js";
import { ROUTES } from "../config/routes.js";


class AuthGuard {
    constructor() {
        this.initialised = false;

        this.initialising = null;

        this.redirecting = false;

        this.loginRoute =
            this._resolveRoute(
                "LOGIN",
                "/login.html"
            );

        this.defaultAuthenticatedRoute =
            this._resolveRoute(
                "DASHBOARD",
                "/dashboard/"
            );

        this.handleAuthStateChanged =
            this.handleAuthStateChanged.bind(
                this
            );

        this.unsubscribeAuthState =
            null;
    }


    /**
     * Initialise authentication guard.
     *
     * The guard does not require Router to be
     * initialised first.
     */
    async initialise() {
        if (this.initialised) {
            return this;
        }

        if (this.initialising) {
            await this.initialising;

            return this;
        }

        this.initialising =
            this._initialise();

        try {
            await this.initialising;
        } finally {
            this.initialising = null;
        }

        return this;
    }


    /**
     * Alias for initialise().
     */
    async init() {
        return this.initialise();
    }


    /**
     * Internal initialisation.
     */
    async _initialise() {
        /*
         * AuthService is responsible for restoring
         * the existing authentication/session state.
         */
        await auth.initialise();

        /*
         * Listen for authentication state changes so
         * other application components can remain
         * synchronised.
         */
        this.unsubscribeAuthState =
            eventBus.on(
                "auth:stateChanged",
                this.handleAuthStateChanged
            );

        this.initialised = true;

        return this;
    }


    /**
     * Router-compatible guard method.
     *
     * Router calls:
     *
     *     guard.guard(path, context)
     *
     * Returns:
     *
     *     {
     *         allowed: true
     *     }
     *
     * or:
     *
     *     {
     *         allowed: false,
     *         redirected: true
     *     }
     */
    async guard(
        path,
        context = {}
    ) {
        await this.initialise();

        /*
         * Never attempt to protect the login route
         * itself.
         */
        if (
            this.isLoginRoute(path)
        ) {
            return {
                allowed: true,
                authenticated:
                    auth.isAuthenticated(),
                path
            };
        }

        /*
         * Verify authentication state.
         *
         * AuthService owns the actual authentication
         * and session rules.
         */
        let authenticated =
            false;

        try {
            authenticated =
                Boolean(
                    auth.isAuthenticated()
                );
        } catch (error) {
            console.error(
                "[AuthGuard] Authentication state check failed:",
                error
            );

            authenticated = false;
        }

        /*
         * Authenticated users may continue.
         */
        if (authenticated) {
            return {
                allowed: true,
                authenticated: true,
                path,
                user:
                    this._getAuthenticatedUser()
            };
        }

        /*
         * Not authenticated.
         *
         * Redirect to login and preserve the requested
         * application URL.
         */
        const returnUrl =
            this._buildSafeReturnUrl(
                path,
                context
            );

        await this.redirectToLogin(
            returnUrl
        );

        return {
            allowed: false,
            authenticated: false,
            redirected: true,
            returnUrl
        };
    }


    /**
     * Check whether a user is authenticated.
     */
    async isAuthenticated() {
        await this.initialise();

        try {
            return Boolean(
                auth.isAuthenticated()
            );
        } catch (error) {
            console.error(
                "[AuthGuard] Failed to determine authentication state:",
                error
            );

            return false;
        }
    }


    /**
     * Require an authenticated user.
     *
     * Useful outside Router where a component needs
     * to explicitly verify access.
     */
    async requireAuthentication(
        returnUrl = null
    ) {
        await this.initialise();

        if (
            auth.isAuthenticated()
        ) {
            return {
                allowed: true,
                authenticated: true,
                user:
                    this._getAuthenticatedUser()
            };
        }

        const safeReturnUrl =
            this._buildSafeReturnUrl(
                returnUrl ||
                    this._getCurrentPath(),
                {}
            );

        await this.redirectToLogin(
            safeReturnUrl
        );

        return {
            allowed: false,
            authenticated: false,
            redirected: true,
            returnUrl:
                safeReturnUrl
        };
    }


    /**
     * Redirect unauthenticated user to login.
     *
     * Uses location.replace() rather than pushing
     * another history entry.
     *
     * This prevents the user from pressing Back and
     * immediately returning to a protected page.
     */
    async redirectToLogin(
        returnUrl = null
    ) {
        if (
            typeof window ===
            "undefined"
        ) {
            return false;
        }

        /*
         * Prevent multiple simultaneous redirects.
         */
        if (this.redirecting) {
            return false;
        }

        const currentPath =
            this._getCurrentPath();

        /*
         * Never redirect to login when already on login.
         */
        if (
            this.isLoginRoute(
                currentPath
            )
        ) {
            return false;
        }

        this.redirecting = true;

        try {
            const safeReturnUrl =
                this._buildSafeReturnUrl(
                    returnUrl ||
                        currentPath,
                    {}
                );

            const loginUrl =
                this._buildLoginUrl(
                    safeReturnUrl
                );

            eventBus.emit(
                "auth:redirectToLogin",
                {
                    from:
                        currentPath,

                    returnUrl:
                        safeReturnUrl,

                    loginUrl
                }
            );

            window.location.replace(
                loginUrl
            );

            return true;

        } finally {
            /*
             * The page will normally unload immediately.
             *
             * Resetting this asynchronously also allows
             * the guard to remain usable in tests and
             * non-navigation environments.
             */
            setTimeout(
                () => {
                    this.redirecting =
                        false;
                },
                0
            );
        }
    }


    /**
     * Determine whether a route is the login route.
     */
    isLoginRoute(path) {
        if (!path) {
            return false;
        }

        try {
            const parsed =
                this._parseUrl(
                    path
                );

            const loginPath =
                this._normalisePath(
                    this.loginRoute
                );

            const currentPath =
                this._normalisePath(
                    parsed.pathname
                );

            return (
                currentPath ===
                loginPath
            );

        } catch {
            return false;
        }
    }


    /**
     * Determine whether the requested route is
     * already an authenticated destination.
     */
    isAuthenticatedRoute(path) {
        if (!path) {
            return false;
        }

        try {
            const parsed =
                this._parseUrl(
                    path
                );

            const dashboardPath =
                this._normalisePath(
                    this.defaultAuthenticatedRoute
                );

            const currentPath =
                this._normalisePath(
                    parsed.pathname
                );

            return (
                currentPath ===
                    dashboardPath ||
                currentPath.startsWith(
                    `${dashboardPath}/`
                )
            );

        } catch {
            return false;
        }
    }


    /**
     * Build login URL with a safe return URL.
     */
    _buildLoginUrl(
        returnUrl
    ) {
        const loginPath =
            this._normalisePath(
                this.loginRoute
            );

        if (!returnUrl) {
            return loginPath;
        }

        const params =
            new URLSearchParams();

        params.set(
            "return",
            returnUrl
        );

        return (
            `${loginPath}?${params.toString()}`
        );
    }


    /**
     * Build a safe internal return URL.
     *
     * Open redirects are explicitly rejected.
     *
     * Only same-origin URLs are allowed.
     */
    _buildSafeReturnUrl(
        path,
        context = {}
    ) {
        if (
            typeof window ===
            "undefined"
        ) {
            return this._normalisePath(
                path
            );
        }

        let candidate =
            path;

        /*
         * Prefer the complete requested URL supplied
         * by Router when available.
         */
        if (
            context?.url
        ) {
            candidate =
                context.url;
        }

        if (!candidate) {
            candidate =
                this._getCurrentPath();
        }

        try {
            const parsed =
                new URL(
                    candidate,
                    window.location.origin
                );

            /*
             * Only same-origin URLs are accepted.
             */
            if (
                parsed.origin !==
                window.location.origin
            ) {
                return this._getCurrentPath();
            }

            /*
             * Only http/https URLs belonging to the
             * current application are accepted.
             */
            if (
                parsed.protocol !==
                    window.location.protocol
            ) {
                return this._getCurrentPath();
            }

            /*
             * Never return the login page itself.
             */
            if (
                this.isLoginRoute(
                    parsed.pathname
                )
            ) {
                return this.defaultAuthenticatedRoute;
            }

            return (
                parsed.pathname +
                parsed.search +
                parsed.hash
            );

        } catch {
            return this._getCurrentPath();
        }
    }


    /**
     * Return the current browser URL.
     */
    _getCurrentPath() {
        if (
            typeof window ===
            "undefined"
        ) {
            return "/";
        }

        return (
            window.location.pathname +
            window.location.search +
            window.location.hash
        );
    }


    /**
     * Safely retrieve authenticated user.
     *
     * AuthService remains the source of truth.
     */
    _getAuthenticatedUser() {
        try {
            if (
                typeof auth.getCurrentUser ===
                "function"
            ) {
                return auth.getCurrentUser();
            }

            if (
                typeof auth.getUser ===
                "function"
            ) {
                return auth.getUser();
            }

            if (
                typeof auth.currentUser !==
                "undefined"
            ) {
                return auth.currentUser;
            }
        } catch (error) {
            console.error(
                "[AuthGuard] Unable to retrieve authenticated user:",
                error
            );
        }

        return null;
    }


    /**
     * React to authentication state changes.
     */
    handleAuthStateChanged(
        payload = {}
    ) {
        /*
         * Keep this component deliberately lightweight.
         *
         * AuthService remains responsible for changing
         * authentication state.
         *
         * AuthGuard only reacts to the resulting state
         * and exposes a central event for application
         * consumers.
         */
        eventBus.emit(
            "authGuard:stateChanged",
            {
                authenticated:
                    Boolean(
                        payload.authenticated ??
                        auth.isAuthenticated()
                    ),

                user:
                    payload.user ??
                    this._getAuthenticatedUser(),

                source:
                    payload.source ||
                    "AuthService"
            }
        );
    }


    /**
     * Resolve a route from ROUTES safely.
     */
    _resolveRoute(
        key,
        fallback
    ) {
        try {
            if (
                ROUTES &&
                typeof ROUTES[key] ===
                    "string" &&
                ROUTES[key].trim() !== ""
            ) {
                return ROUTES[key];
            }
        } catch {
            /*
             * Use fallback below.
             */
        }

        return fallback;
    }


    /**
     * Parse URL safely.
     */
    _parseUrl(
        path
    ) {
        return new URL(
            path,
            typeof window !==
                "undefined"
                ? window.location.origin
                : "http://localhost"
        );
    }


    /**
     * Normalise a route path.
     */
    _normalisePath(
        path
    ) {
        if (
            !path ||
            path === "/"
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
            clean === ""
        ) {
            return "/";
        }

        if (
            clean === "/"
        ) {
            return "/";
        }

        return clean.endsWith("/")
            ? clean.slice(0, -1)
            : clean;
    }


    /**
     * Return the current guard status.
     */
    getStatus() {
        let authenticated =
            false;

        try {
            authenticated =
                Boolean(
                    auth.isAuthenticated()
                );
        } catch {
            authenticated = false;
        }

        return {
            initialised:
                this.initialised,

            initialising:
                Boolean(
                    this.initialising
                ),

            authenticated,

            redirecting:
                this.redirecting,

            loginRoute:
                this.loginRoute,

            defaultAuthenticatedRoute:
                this.defaultAuthenticatedRoute
        };
    }


    /**
     * Destroy guard.
     */
    destroy() {
        if (
            typeof this.unsubscribeAuthState ===
            "function"
        ) {
            this.unsubscribeAuthState();
        }

        this.unsubscribeAuthState =
            null;

        this.initialised = false;

        this.initialising = null;

        this.redirecting = false;
    }
}


/**
 * Singleton authentication guard.
 */
export const authGuard =
    new AuthGuard();


export {
    AuthGuard
};


export default authGuard;