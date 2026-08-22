/**
 * Isaacs and Partners
 * Authentication Service
 *
 * Central authentication service for the client application.
 *
 * Responsibilities:
 * - Authenticate users
 * - Maintain authentication state
 * - Restore sessions after page refresh
 * - Support Remember Me
 * - Persist authentication securely through the storage facade
 * - Manage access tokens/session tokens
 * - Manage authenticated user information
 * - Handle logout
 * - Handle session expiry
 * - Emit authentication lifecycle events
 *
 * IMPORTANT:
 * AuthService does NOT import Router.
 *
 * Router/AuthGuard may depend on AuthService, therefore importing
 * Router here would create unnecessary circular dependencies.
 *
 * Authentication navigation remains the responsibility of
 * AuthGuard / Router / LoginController.
 */

import { storage } from "../core/storage.js";
import { eventBus } from "../core/events.js";

/*
 * Storage keys are deliberately namespaced so that authentication
 * data cannot collide with unrelated application data.
 */
const STORAGE_KEYS = Object.freeze({
    AUTH_SESSION:
        "isaacs_partners.auth.session",

    AUTH_USER:
        "isaacs_partners.auth.user",

    AUTH_TOKEN:
        "isaacs_partners.auth.token",

    AUTH_EXPIRES_AT:
        "isaacs_partners.auth.expiresAt",

    AUTH_REMEMBER_ME:
        "isaacs_partners.auth.rememberMe"
});

/*
 * Default authentication configuration.
 *
 * The endpoint can be replaced during application bootstrap:
 *
 * auth.configure({
 *     loginEndpoint: "/api/auth/login"
 * });
 *
 * The service deliberately does not hard-code a remote
 * authentication provider such as Supabase.
 */
const DEFAULT_CONFIG = Object.freeze({
    loginEndpoint:
        "/api/auth/login",

    logoutEndpoint:
        "/api/auth/logout",

    refreshEndpoint:
        "/api/auth/refresh",

    requestTimeout:
        15000,

    /*
     * Default session duration when the authentication server
     * does not provide an explicit expiry.
     *
     * 8 hours for a normal browser session.
     */
    sessionDuration:
        8 * 60 * 60 * 1000,

    /*
     * Remember Me duration.
     *
     * 30 days.
     */
    rememberMeDuration:
        30 * 24 * 60 * 60 * 1000
});

class AuthService {
    constructor() {
        this.initialised =
            false;

        this.initialising =
            null;

        this.authenticated =
            false;

        this.user =
            null;

        this.token =
            null;

        this.expiresAt =
            null;

        this.rememberMe =
            false;

        this.session =
            null;

        this.config = {
            ...DEFAULT_CONFIG
        };

        this.refreshTimer =
            null;

        this.destroyed =
            false;
    }

    /**
     * Initialise authentication service.
     *
     * Restores an existing session from storage.
     */
    async initialise(options = {}) {
        if (this.destroyed) {
            throw new Error(
                "AuthService has been destroyed."
            );
        }

        if (this.initialised) {
            return this;
        }

        if (this.initialising) {
            return this.initialising;
        }

        this.initialising =
            this._initialise(options);

        try {
            await this.initialising;

            return this;
        } finally {
            this.initialising =
                null;
        }
    }

    /**
     * Internal initialisation.
     */
    async _initialise(options = {}) {
        this.configure(
            options
        );

        await storage.initialise();

        /*
         * Attempt to restore the most appropriate session.
         */
        const restored =
            await this._restoreSession();

        if (restored) {
            this._startExpiryMonitor();

            eventBus.emit(
                "auth:sessionRestored",
                {
                    user:
                        this.getCurrentUser(),

                    rememberMe:
                        this.rememberMe,

                    expiresAt:
                        this.expiresAt
                }
            );
        }

        this.initialised =
            true;

        eventBus.emit(
            "auth:initialised",
            {
                authenticated:
                    this.authenticated,

                user:
                    this.getCurrentUser(),

                rememberMe:
                    this.rememberMe
            }
        );

        return this;
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
     * Configure authentication service.
     */
    configure(options = {}) {
        if (
            !options ||
            typeof options !== "object"
        ) {
            throw new TypeError(
                "AuthService configuration must be an object."
            );
        }

        this.config = {
            ...this.config,
            ...options
        };

        return this;
    }

    /**
     * Return authentication configuration.
     *
     * A copy is returned so callers cannot mutate the internal
     * configuration accidentally.
     */
    getConfig() {
        return {
            ...this.config
        };
    }

    /**
     * Authenticate user.
     *
     * Compatible with LoginController:
     *
     * auth.login(
     *     identifier,
     *     password,
     *     {
     *         rememberMe
     *     }
     * );
     */
    async login(
        identifier,
        password,
        options = {}
    ) {
        await this.initialise();

        if (
            typeof identifier !==
            "string" ||
            identifier.trim() === ""
        ) {
            const error =
                this._createAuthError(
                    "IDENTIFIER_REQUIRED",
                    "Username or email address is required."
                );

            throw error;
        }

        if (
            typeof password !==
            "string" ||
            password === ""
        ) {
            const error =
                this._createAuthError(
                    "PASSWORD_REQUIRED",
                    "Password is required."
                );

            throw error;
        }

        const rememberMe =
            Boolean(
                options.rememberMe
            );

        /*
         * Prevent an old authentication state from remaining active
         * while a new login is being performed.
         */
        this._clearExpiryMonitor();

        eventBus.emit(
            "auth:loginStarted",
            {
                identifier:
                    identifier.trim(),

                rememberMe
            }
        );

        try {
            const response =
                await this._request(
                    this.config.loginEndpoint,
                    {
                        method: "POST",

                        body: {
                            identifier:
                                identifier.trim(),

                            password,

                            rememberMe
                        }
                    }
                );

            const normalised =
                this._normaliseLoginResponse(
                    response
                );

            if (
                !normalised.authenticated
            ) {
                throw this._createAuthError(
                    "AUTHENTICATION_FAILED",
                    "Authentication failed."
                );
            }

            await this._establishSession(
                normalised,
                rememberMe
            );

            eventBus.emit(
                "auth:loginSucceeded",
                {
                    user:
                        this.getCurrentUser(),

                    rememberMe:
                        this.rememberMe,

                    expiresAt:
                        this.expiresAt
                }
            );

            return {
                authenticated:
                    true,

                user:
                    this.getCurrentUser(),

                token:
                    this.getToken(),

                rememberMe:
                    this.rememberMe,

                expiresAt:
                    this.expiresAt
            };

        } catch (error) {
            eventBus.emit(
                "auth:loginFailed",
                {
                    error,
                    identifier:
                        identifier.trim(),

                    rememberMe
                }
            );

            throw this._normaliseError(
                error
            );
        }
    }

    /**
     * Logout the current user.
     */
    async logout(
        {
            remote = true,
            reason = "user"
        } = {}
    ) {
        await this.initialise();

        const previousUser =
            this.getCurrentUser();

        const previousToken =
            this.getToken();

        /*
         * Stop expiry handling immediately.
         */
        this._clearExpiryMonitor();

        /*
         * Attempt remote logout before destroying the local
         * session.
         *
         * Local logout still happens if the remote endpoint
         * fails.
         */
        if (
            remote &&
            previousToken &&
            this.config.logoutEndpoint
        ) {
            try {
                await this._request(
                    this.config.logoutEndpoint,
                    {
                        method: "POST",

                        body: {
                            token:
                                previousToken
                        },

                        token:
                            previousToken
                    }
                );
            } catch (error) {
                /*
                 * Remote logout failure must never prevent
                 * local logout.
                 */
                console.warn(
                    "[AuthService] Remote logout failed. Local session will still be cleared.",
                    error
                );
            }
        }

        await this._clearSessionStorage();

        this.authenticated =
            false;

        this.user =
            null;

        this.token =
            null;

        this.expiresAt =
            null;

        this.rememberMe =
            false;

        this.session =
            null;

        eventBus.emit(
            "auth:loggedOut",
            {
                previousUser,

                reason
            }
        );

        eventBus.emit(
            "auth:stateChanged",
            {
                authenticated:
                    false,

                user:
                    null,

                rememberMe:
                    false
            }
        );

        return {
            authenticated:
                false,

            loggedOut:
                true
        };
    }

    /**
     * Determine whether the user is authenticated.
     */
    isAuthenticated() {
        if (!this.authenticated) {
            return false;
        }

        /*
         * Check expiry synchronously where possible.
         */
        if (
            this.expiresAt &&
            this._isExpired(
                this.expiresAt
            )
        ) {
            this._expireSessionSync();

            return false;
        }

        return Boolean(
            this.token ||
            this.user
        );
    }

    /**
     * Return current authenticated user.
     */
    getCurrentUser() {
        if (!this.user) {
            return null;
        }

        /*
         * Return a copy rather than exposing the internal object.
         */
        return {
            ...this.user
        };
    }

    /**
     * Alias for getCurrentUser().
     */
    getUser() {
        return this.getCurrentUser();
    }

    /**
     * Return authentication token.
     */
    getToken() {
        return this.token;
    }

    /**
     * Return current session.
     */
    getSession() {
        if (!this.session) {
            return null;
        }

        return {
            ...this.session
        };
    }

    /**
     * Return Remember Me state.
     */
    getRememberMe() {
        return Boolean(
            this.rememberMe
        );
    }

    /**
     * Return session expiry.
     */
    getExpiresAt() {
        return this.expiresAt;
    }

    /**
     * Determine whether the current session has expired.
     */
    isSessionExpired() {
        if (!this.expiresAt) {
            return false;
        }

        return this._isExpired(
            this.expiresAt
        );
    }

    /**
     * Require authentication.
     *
     * Useful for AuthGuard.
     */
    async requireAuthentication() {
        await this.initialise();

        if (
            this.isAuthenticated()
        ) {
            return {
                allowed:
                    true,

                authenticated:
                    true,

                user:
                    this.getCurrentUser()
            };
        }

        return {
            allowed:
                false,

            authenticated:
                false,

            user:
                null
        };
    }

    /**
     * Refresh authentication session.
     */
    async refreshSession() {
        await this.initialise();

        if (
            !this.isAuthenticated()
        ) {
            return {
                authenticated:
                    false
            };
        }

        if (
            !this.config.refreshEndpoint
        ) {
            return {
                authenticated:
                    true,

                user:
                    this.getCurrentUser(),

                token:
                    this.getToken()
            };
        }

        try {
            const response =
                await this._request(
                    this.config.refreshEndpoint,
                    {
                        method: "POST",

                        body: {
                            token:
                                this.getToken()
                        },

                        token:
                            this.getToken()
                    }
                );

            const normalised =
                this._normaliseLoginResponse(
                    response
                );

            if (
                !normalised.authenticated
            ) {
                await this._expireSession(
                    "refresh_failed"
                );

                return {
                    authenticated:
                        false
                };
            }

            await this._establishSession(
                normalised,
                this.rememberMe
            );

            eventBus.emit(
                "auth:sessionRefreshed",
                {
                    user:
                        this.getCurrentUser(),

                    expiresAt:
                        this.expiresAt
                }
            );

            return {
                authenticated:
                    true,

                user:
                    this.getCurrentUser(),

                token:
                    this.getToken(),

                expiresAt:
                    this.expiresAt
            };

        } catch (error) {
            /*
             * A failed refresh does not automatically destroy
             * a still-valid local session unless the server
             * explicitly returns an authentication failure.
             */
            if (
                error?.code ===
                    "HTTP_401" ||
                error?.code ===
                    "HTTP_403"
            ) {
                await this._expireSession(
                    "refresh_rejected"
                );

                return {
                    authenticated:
                        false
                };
            }

            throw error;
        }
    }

    /**
     * Restore authentication session from storage.
     */
    async _restoreSession() {
        /*
         * A session-only login is stored in sessionStorage.
         *
         * Remember Me is stored in localStorage.
         *
         * The storage facade deliberately exposes both scopes.
         */

        let session =
            await storage.getSession(
                STORAGE_KEYS.AUTH_SESSION,
                null
            );

        let rememberMe =
            false;

        /*
         * If there is no active browser session, check persistent
         * Remember Me storage.
         */
        if (!session) {
            session =
                await storage.get(
                    STORAGE_KEYS.AUTH_SESSION,
                    null
                );

            if (session) {
                rememberMe =
                    true;
            }
        } else {
            rememberMe =
                false;
        }

        /*
         * Backward compatibility with individual storage keys.
         */
        if (!session) {
            const token =
                await storage.getSession(
                    STORAGE_KEYS.AUTH_TOKEN,
                    null
                );

            const user =
                await storage.getSession(
                    STORAGE_KEYS.AUTH_USER,
                    null
                );

            const expiresAt =
                await storage.getSession(
                    STORAGE_KEYS.AUTH_EXPIRES_AT,
                    null
                );

            if (
                token ||
                user
            ) {
                session = {
                    token,
                    user,
                    expiresAt,
                    rememberMe:
                        false
                };

                rememberMe =
                    false;
            }
        }

        if (!session) {
            /*
             * Try persistent individual keys.
             */
            const token =
                await storage.get(
                    STORAGE_KEYS.AUTH_TOKEN,
                    null
                );

            const user =
                await storage.get(
                    STORAGE_KEYS.AUTH_USER,
                    null
                );

            const expiresAt =
                await storage.get(
                    STORAGE_KEYS.AUTH_EXPIRES_AT,
                    null
                );

            const storedRememberMe =
                await storage.get(
                    STORAGE_KEYS.AUTH_REMEMBER_ME,
                    false
                );

            if (
                token ||
                user
            ) {
                session = {
                    token,
                    user,
                    expiresAt,

                    rememberMe:
                        Boolean(
                            storedRememberMe
                        )
                };

                rememberMe =
                    Boolean(
                        storedRememberMe
                    );
            }
        }

        if (!session) {
            return false;
        }

        const normalised =
            this._normaliseStoredSession(
                session,
                rememberMe
            );

        /*
         * Never restore an expired session.
         */
        if (
            normalised.expiresAt &&
            this._isExpired(
                normalised.expiresAt
            )
        ) {
            await this._removeStoredSession(
                normalised.rememberMe
            );

            eventBus.emit(
                "auth:sessionExpired",
                {
                    reason:
                        "expired_before_restore"
                }
            );

            return false;
        }

        if (
            !normalised.token &&
            !normalised.user
        ) {
            await this._removeStoredSession(
                normalised.rememberMe
            );

            return false;
        }

        this.authenticated =
            true;

        this.user =
            normalised.user;

        this.token =
            normalised.token;

        this.expiresAt =
            normalised.expiresAt;

        this.rememberMe =
            normalised.rememberMe;

        this.session = {
            authenticated:
                true,

            user:
                this.user,

            token:
                this.token,

            expiresAt:
                this.expiresAt,

            rememberMe:
                this.rememberMe
        };

        return true;
    }

    /**
     * Establish authenticated session.
     */
    async _establishSession(
        authentication,
        rememberMe
    ) {
        const expiresAt =
            authentication.expiresAt ||
            this._calculateExpiry(
                rememberMe
            );

        const session = {
            authenticated:
                true,

            user:
                authentication.user,

            token:
                authentication.token,

            refreshToken:
                authentication.refreshToken ||
                null,

            expiresAt,

            rememberMe:
                Boolean(
                    rememberMe
                )
        };

        this.authenticated =
            true;

        this.user =
            authentication.user;

        this.token =
            authentication.token;

        this.expiresAt =
            expiresAt;

        this.rememberMe =
            Boolean(
                rememberMe
            );

        this.session =
            session;

        /*
         * Clear both scopes first.
         *
         * This prevents an old Remember Me session from
         * surviving after a normal session login.
         */
        await this._clearSessionStorage();

        if (rememberMe) {
            await storage.set(
                STORAGE_KEYS.AUTH_SESSION,
                session
            );

            await storage.set(
                STORAGE_KEYS.AUTH_USER,
                authentication.user
            );

            await storage.set(
                STORAGE_KEYS.AUTH_TOKEN,
                authentication.token
            );

            await storage.set(
                STORAGE_KEYS.AUTH_EXPIRES_AT,
                expiresAt
            );

            await storage.set(
                STORAGE_KEYS.AUTH_REMEMBER_ME,
                true
            );
        } else {
            await storage.setSession(
                STORAGE_KEYS.AUTH_SESSION,
                session
            );

            await storage.setSession(
                STORAGE_KEYS.AUTH_USER,
                authentication.user
            );

            await storage.setSession(
                STORAGE_KEYS.AUTH_TOKEN,
                authentication.token
            );

            await storage.setSession(
                STORAGE_KEYS.AUTH_EXPIRES_AT,
                expiresAt
            );

            await storage.setSession(
                STORAGE_KEYS.AUTH_REMEMBER_ME,
                false
            );
        }

        this._startExpiryMonitor();

        eventBus.emit(
            "auth:stateChanged",
            {
                authenticated:
                    true,

                user:
                    this.getCurrentUser(),

                rememberMe:
                    this.rememberMe,

                expiresAt:
                    this.expiresAt
            }
        );
    }

    /**
     * Clear all authentication storage.
     */
    async _clearSessionStorage() {
        /*
         * Clear sessionStorage authentication data.
         */
        await storage.removeSession(
            STORAGE_KEYS.AUTH_SESSION
        );

        await storage.removeSession(
            STORAGE_KEYS.AUTH_USER
        );

        await storage.removeSession(
            STORAGE_KEYS.AUTH_TOKEN
        );

        await storage.removeSession(
            STORAGE_KEYS.AUTH_EXPIRES_AT
        );

        await storage.removeSession(
            STORAGE_KEYS.AUTH_REMEMBER_ME
        );

        /*
         * Clear persistent localStorage authentication data.
         */
        await storage.remove(
            STORAGE_KEYS.AUTH_SESSION
        );

        await storage.remove(
            STORAGE_KEYS.AUTH_USER
        );

        await storage.remove(
            STORAGE_KEYS.AUTH_TOKEN
        );

        await storage.remove(
            STORAGE_KEYS.AUTH_EXPIRES_AT
        );

        await storage.remove(
            STORAGE_KEYS.AUTH_REMEMBER_ME
        );
    }

    /**
     * Remove session from the selected storage scope.
     */
    async _removeStoredSession(
        rememberMe
    ) {
        if (rememberMe) {
            await storage.remove(
                STORAGE_KEYS.AUTH_SESSION
            );

            await storage.remove(
                STORAGE_KEYS.AUTH_USER
            );

            await storage.remove(
                STORAGE_KEYS.AUTH_TOKEN
            );

            await storage.remove(
                STORAGE_KEYS.AUTH_EXPIRES_AT
            );

            await storage.remove(
                STORAGE_KEYS.AUTH_REMEMBER_ME
            );

            return;
        }

        await storage.removeSession(
            STORAGE_KEYS.AUTH_SESSION
        );

        await storage.removeSession(
            STORAGE_KEYS.AUTH_USER
        );

        await storage.removeSession(
            STORAGE_KEYS.AUTH_TOKEN
        );

        await storage.removeSession(
            STORAGE_KEYS.AUTH_EXPIRES_AT
        );

        await storage.removeSession(
            STORAGE_KEYS.AUTH_REMEMBER_ME
        );
    }

    /**
     * Start automatic expiry monitoring.
     */
    _startExpiryMonitor() {
        this._clearExpiryMonitor();

        if (!this.expiresAt) {
            return;
        }

        const expiresAt =
            new Date(
                this.expiresAt
            ).getTime();

        if (
            Number.isNaN(
                expiresAt
            )
        ) {
            return;
        }

        const delay =
            Math.max(
                expiresAt -
                    Date.now(),
                1000
            );

        this.refreshTimer =
            setTimeout(
                () => {
                    this._handleSessionExpiry();
                },
                delay
            );
    }

    /**
     * Stop expiry monitoring.
     */
    _clearExpiryMonitor() {
        if (
            this.refreshTimer
        ) {
            clearTimeout(
                this.refreshTimer
            );

            this.refreshTimer =
                null;
        }
    }

    /**
     * Handle asynchronous session expiry.
     */
    async _handleSessionExpiry() {
        this.refreshTimer =
            null;

        if (
            !this.authenticated
        ) {
            return;
        }

        /*
         * Try refreshing first when an endpoint is configured.
         */
        if (
            this.config.refreshEndpoint &&
            this.token
        ) {
            try {
                const refreshed =
                    await this.refreshSession();

                if (
                    refreshed?.authenticated
                ) {
                    return;
                }
            } catch (error) {
                console.warn(
                    "[AuthService] Session refresh failed:",
                    error
                );
            }
        }

        await this._expireSession(
            "expired"
        );
    }

    /**
     * Expire authentication session.
     */
    async _expireSession(reason) {
        const previousUser =
            this.getCurrentUser();

        this._clearExpiryMonitor();

        await this._clearSessionStorage();

        this.authenticated =
            false;

        this.user =
            null;

        this.token =
            null;

        this.expiresAt =
            null;

        this.rememberMe =
            false;

        this.session =
            null;

        eventBus.emit(
            "auth:sessionExpired",
            {
                previousUser,

                reason
            }
        );

        eventBus.emit(
            "auth:stateChanged",
            {
                authenticated:
                    false,

                user:
                    null,

                rememberMe:
                    false
            }
        );

        return {
            authenticated:
                false
        };
    }

    /**
     * Synchronous expiry handling for isAuthenticated().
     */
    _expireSessionSync() {
        this._clearExpiryMonitor();

        this.authenticated =
            false;

        this.user =
            null;

        this.token =
            null;

        this.expiresAt =
            null;

        this.rememberMe =
            false;

        this.session =
            null;

        /*
         * Storage cleanup is asynchronous. Fire it without
         * blocking the synchronous authentication check.
         */
        this._clearSessionStorage().catch(
            (error) => {
                console.warn(
                    "[AuthService] Failed to clear expired session:",
                    error
                );
            }
        );

        eventBus.emit(
            "auth:sessionExpired",
            {
                reason:
                    "expired"
            }
        );

        eventBus.emit(
            "auth:stateChanged",
            {
                authenticated:
                    false,

                user:
                    null,

                rememberMe:
                    false
            }
        );
    }

    /**
     * Calculate default session expiry.
     */
    _calculateExpiry(
        rememberMe
    ) {
        const duration =
            rememberMe
                ? this.config.rememberMeDuration
                : this.config.sessionDuration;

        return new Date(
            Date.now() +
                duration
        ).toISOString();
    }

    /**
     * Determine whether expiry timestamp has passed.
     */
    _isExpired(expiresAt) {
        const timestamp =
            new Date(
                expiresAt
            ).getTime();

        if (
            Number.isNaN(
                timestamp
            )
        ) {
            return false;
        }

        return (
            timestamp <=
            Date.now()
        );
    }

    /**
     * Normalise authentication server response.
     *
     * Supports common response structures so the client is not
     * tightly coupled to one backend implementation.
     */
    _normaliseLoginResponse(
        response
    ) {
        if (!response) {
            return {
                authenticated:
                    false
            };
        }

        const data =
            response.data ||
            response.result ||
            response;

        const token =
            data.token ||
            data.accessToken ||
            data.access_token ||
            data.session?.accessToken ||
            data.session?.access_token ||
            null;

        const refreshToken =
            data.refreshToken ||
            data.refresh_token ||
            data.session?.refreshToken ||
            data.session?.refresh_token ||
            null;

        const user =
            data.user ||
            data.account ||
            data.profile ||
            data.session?.user ||
            null;

        const authenticated =
            Boolean(
                (data.authenticated ??
                data.success ??
                data.ok ??
                token) ||
                user
            );

        const expiresAt =
            data.expiresAt ||
            data.expires_at ||
            data.session?.expiresAt ||
            data.session?.expires_at ||
            null;

        return {
            authenticated,

            token,

            refreshToken,

            user:
                user
                    ? this._sanitiseUser(
                          user
                      )
                    : null,

            expiresAt
        };
    }

    /**
     * Normalise stored session.
     */
    _normaliseStoredSession(
        session,
        rememberMe
    ) {
        const token =
            session.token ||
            session.accessToken ||
            session.access_token ||
            null;

        const user =
            session.user ||
            session.account ||
            session.profile ||
            null;

        const expiresAt =
            session.expiresAt ||
            session.expires_at ||
            null;

        return {
            token,

            user:
                user
                    ? this._sanitiseUser(
                          user
                      )
                    : null,

            expiresAt,

            rememberMe:
                Boolean(
                    session.rememberMe ??
                    rememberMe
                )
        };
    }

    /**
     * Remove sensitive fields from user object.
     *
     * Passwords and credentials must never become part of the
     * client authentication state.
     */
    _sanitiseUser(user) {
        if (
            !user ||
            typeof user !== "object"
        ) {
            return null;
        }

        const {
            password,
            passwordHash,
            password_hash,
            secret,
            clientSecret,
            client_secret,
            ...safeUser
        } = user;

        return {
            ...safeUser
        };
    }

    /**
     * Perform HTTP request against authentication API.
     */
    async _request(
        endpoint,
        {
            method = "GET",
            body = null,
            token = null
        } = {}
    ) {
        if (
            typeof fetch !==
            "function"
        ) {
            throw this._createAuthError(
                "NETWORK_ERROR",
                "Fetch API is not available."
            );
        }

        if (!endpoint) {
            throw this._createAuthError(
                "AUTH_ENDPOINT_MISSING",
                "Authentication endpoint has not been configured."
            );
        }

        const controller =
            typeof AbortController !==
            "undefined"
                ? new AbortController()
                : null;

        let timeoutId =
            null;

        if (controller) {
            timeoutId =
                setTimeout(
                    () => {
                        controller.abort();
                    },
                    this.config.requestTimeout
                );
        }

        const headers = {
            Accept:
                "application/json"
        };

        if (
            body !== null
        ) {
            headers[
                "Content-Type"
            ] =
                "application/json";
        }

        if (token) {
            headers.Authorization =
                `Bearer ${token}`;
        }

        try {
            const response =
                await fetch(
                    endpoint,
                    {
                        method,

                        headers,

                        credentials:
                            "include",

                        body:
                            body !== null
                                ? JSON.stringify(
                                      body
                                  )
                                : undefined,

                        signal:
                            controller?.signal
                    }
                );

            const raw =
                await response.text();

            let data =
                null;

            if (raw) {
                try {
                    data =
                        JSON.parse(
                            raw
                        );
                } catch {
                    data =
                        raw;
                }
            }

            if (
                !response.ok
            ) {
                throw this._createHttpError(
                    response,
                    data
                );
            }

            return data;
        } catch (error) {
            if (
                error?.name ===
                "AbortError"
            ) {
                throw this._createAuthError(
                    "REQUEST_TIMEOUT",
                    "The authentication request timed out."
                );
            }

            if (
                error?.code
            ) {
                throw error;
            }

            throw this._createAuthError(
                "NETWORK_ERROR",
                error?.message ||
                    "Unable to connect to the authentication server."
            );
        } finally {
            if (timeoutId) {
                clearTimeout(
                    timeoutId
                );
            }
        }
    }

    /**
     * Create HTTP authentication error.
     */
    _createHttpError(
        response,
        data
    ) {
        const status =
            response?.status;

        let code =
            `HTTP_${status}`;

        if (
            status === 401
        ) {
            code =
                "HTTP_401";
        } else if (
            status === 403
        ) {
            code =
                "HTTP_403";
        }

        const serverMessage =
            data?.message ||
            data?.error ||
            data?.detail ||
            null;

        const error =
            new Error(
                serverMessage ||
                    `Authentication request failed with HTTP ${status}.`
            );

        error.code =
            code;

        error.status =
            status;

        error.response =
            data;

        return error;
    }

    /**
     * Create standard authentication error.
     */
    _createAuthError(
        code,
        message
    ) {
        const error =
            new Error(
                message
            );

        error.code =
            code;

        return error;
    }

    /**
     * Convert unknown authentication errors into the standard
     * error structure consumed by LoginController.
     */
    _normaliseError(error) {
        if (
            error &&
            typeof error === "object" &&
            error.code
        ) {
            return error;
        }

        const normalised =
            new Error(
                error?.message ||
                    "Authentication failed."
            );

        normalised.code =
            "AUTHENTICATION_FAILED";

        normalised.originalError =
            error;

        return normalised;
    }

    /**
     * Return authentication service status.
     */
    getStatus() {
        return {
            initialised:
                this.initialised,

            authenticated:
                this.isAuthenticated(),

            user:
                this.getCurrentUser(),

            hasToken:
                Boolean(
                    this.token
                ),

            rememberMe:
                this.rememberMe,

            expiresAt:
                this.expiresAt
        };
    }

    /**
     * Destroy authentication service.
     *
     * This clears runtime state and listeners/timers but does
     * not silently log the user out remotely.
     */
    destroy() {
        this._clearExpiryMonitor();

        this.authenticated =
            false;

        this.user =
            null;

        this.token =
            null;

        this.expiresAt =
            null;

        this.rememberMe =
            false;

        this.session =
            null;

        this.initialised =
            false;

        this.initialising =
            null;

        this.destroyed =
            true;

        return this;
    }

    /**
     * Re-enable a destroyed service.
     */
    reset() {
        this._clearExpiryMonitor();

        this.authenticated =
            false;

        this.user =
            null;

        this.token =
            null;

        this.expiresAt =
            null;

        this.rememberMe =
            false;

        this.session =
            null;

        this.initialised =
            false;

        this.initialising =
            null;

        this.destroyed =
            false;

        this.config = {
            ...DEFAULT_CONFIG
        };

        return this;
    }
}

/**
 * Singleton authentication service.
 *
 * Application modules should normally import:
 *
 * import auth from "./auth/AuthService.js";
 */
export const auth =
    new AuthService();

export {
    AuthService,
    STORAGE_KEYS
};

export default auth;
