/**
 * Isaacs and Partners
 * Session Manager
 *
 * Responsible for managing the client-side authentication session
 * lifecycle.
 *
 * Responsibilities:
 * - Restore persisted authentication sessions
 * - Track session expiration
 * - Refresh sessions when supported by AuthService
 * - Maintain session activity
 * - Handle session timeout
 * - Coordinate remember-me behaviour
 * - Synchronise session state with the application StateStore
 * - Emit session lifecycle events
 *
 * IMPORTANT:
 *
 * SessionManager does NOT authenticate users directly.
 * AuthService remains the source of truth for authentication.
 *
 * SessionManager does NOT own application state.
 * StateStore remains the runtime state representation.
 *
 * SessionManager does NOT own persistence.
 * Storage remains responsible for persistence.
 *
 * AuthService is injected to avoid circular dependencies.
 */

import { eventBus } from "../core/events.js";
import { state } from "../core/state.js";


class SessionManager {
    constructor({
        authService = null,
        storage = null,
        stateStore = state,
        options = {},
    } = {}) {
        this.authService =
            authService;

        this.storage =
            storage;

        this.state =
            stateStore;

        this.initialised =
            false;

        this.started =
            false;

        this.destroyed =
            false;

        this.initialising =
            null;

        this.refreshing =
            null;

        this.session =
            null;

        this.user =
            null;

        this.rememberMe =
            false;

        this.expiresAt =
            null;

        this.lastActivityAt =
            null;

        this.lastRefreshAt =
            null;

        this.sessionTimeoutTimer =
            null;

        this.refreshTimer =
            null;

        this.activityTimer =
            null;

        this.eventSubscriptions =
            [];

        this.options = {
            sessionKey:
                "isaacs.session",

            rememberKey:
                "isaacs.rememberMe",

            activityKey:
                "isaacs.session.activity",

            defaultSessionDuration:
                30 * 60 * 1000,

            rememberSessionDuration:
                30 * 24 * 60 * 60 * 1000,

            refreshBeforeExpiry:
                5 * 60 * 1000,

            activityThrottle:
                30 * 1000,

            ...options,
        };

        this._lastActivityWrite =
            0;

        this._boundActivity =
            this._handleActivity.bind(this);

        this._boundVisibilityChange =
            this._handleVisibilityChange.bind(
                this
            );
    }


    /**
     * Inject or replace AuthService.
     */
    setAuthService(
        authService
    ) {
        if (
            authService !== null &&
            typeof authService !== "object" &&
            typeof authService !== "function"
        ) {
            throw new TypeError(
                "AuthService must be an object, function or null."
            );
        }

        this.authService =
            authService;

        return this;
    }


    /**
     * Inject or replace storage service.
     */
    setStorage(
        storage
    ) {
        if (
            storage !== null &&
            typeof storage !== "object" &&
            typeof storage !== "function"
        ) {
            throw new TypeError(
                "Storage must be an object, function or null."
            );
        }

        this.storage =
            storage;

        return this;
    }


    /**
     * Initialise SessionManager.
     */
    async initialise() {
        if (this.destroyed) {
            throw new Error(
                "SessionManager has been destroyed."
            );
        }

        if (this.initialised) {
            return this;
        }

        if (this.initialising) {
            return this.initialising;
        }

        this.initialising =
            this._performInitialisation();

        try {
            await this.initialising;

            return this;
        } finally {
            this.initialising =
                null;
        }
    }


    /**
     * Alias for initialise().
     */
    async init() {
        return this.initialise();
    }


    /**
     * Perform initialisation.
     */
    async _performInitialisation() {
        eventBus.emit(
            "session:initialising",
            {}
        );

        if (
            this.state &&
            typeof this.state.initialise ===
                "function"
        ) {
            this.state.initialise();
        }

        await this._restorePersistedSession();

        this._bindEvents();

        this._installActivityListeners();

        this.initialised =
            true;

        eventBus.emit(
            "session:initialised",
            {
                authenticated:
                    this.isAuthenticated(),

                expiresAt:
                    this.expiresAt,
            }
        );

        return this;
    }


    /**
     * Start session monitoring.
     */
    async start() {
        if (this.destroyed) {
            throw new Error(
                "SessionManager has been destroyed."
            );
        }

        if (this.started) {
            return this;
        }

        await this.initialise();

        this.started =
            true;

        this._scheduleTimers();

        eventBus.emit(
            "session:started",
            {
                authenticated:
                    this.isAuthenticated(),

                expiresAt:
                    this.expiresAt,
            }
        );

        return this;
    }


    /**
     * Stop session monitoring.
     *
     * This does NOT log the user out.
     */
    stop() {
        this._clearTimers();

        this.started =
            false;

        eventBus.emit(
            "session:stopped",
            {}
        );

        return this;
    }


    /**
     * Restore session from storage.
     */
    async _restorePersistedSession() {
        const rememberMe =
            await this._readStorage(
                this.options.rememberKey
            );

        this.rememberMe =
            this._toBoolean(
                rememberMe
            );

        const persistedSession =
            await this._readStorage(
                this.options.sessionKey
            );

        if (!persistedSession) {
            return null;
        }

        const session =
            this._normaliseSession(
                persistedSession
            );

        if (!session) {
            await this._removeStorage(
                this.options.sessionKey
            );

            return null;
        }

        if (
            this._isExpired(
                session.expiresAt
            )
        ) {
            await this._removeStorage(
                this.options.sessionKey
            );

            eventBus.emit(
                "session:expired",
                {
                    reason:
                        "restored_session_expired",
                }
            );

            return null;
        }

        this.session =
            session;

        this.user =
            session.user ||
            null;

        this.expiresAt =
            session.expiresAt ||
            null;

        this.lastActivityAt =
            session.lastActivityAt ||
            Date.now();

        this._syncState();

        eventBus.emit(
            "session:restored",
            {
                session:
                    this._safeSession(),

                user:
                    this.user,

                rememberMe:
                    this.rememberMe,
            }
        );

        /*
         * Give AuthService the opportunity to restore
         * its own authentication state if it supports it.
         */
        if (
            this.authService &&
            typeof this.authService.restoreSession ===
                "function"
        ) {
            try {
                await this.authService.restoreSession(
                    session
                );
            } catch (error) {
                eventBus.emit(
                    "session:restoreError",
                    {
                        error,
                    }
                );
            }
        }

        return session;
    }


    /**
     * Establish or replace current session.
     */
    async setSession(
        session,
        {
            user = null,
            rememberMe = false,
            persist = true,
            source = "session",
        } = {}
    ) {
        if (this.destroyed) {
            throw new Error(
                "SessionManager has been destroyed."
            );
        }

        const normalised =
            this._normaliseSession(
                session,
                {
                    user,
                    rememberMe,
                }
            );

        if (!normalised) {
            throw new TypeError(
                "Invalid session supplied."
            );
        }

        if (
            !normalised.expiresAt
        ) {
            normalised.expiresAt =
                new Date(
                    Date.now() +
                    (
                        normalised.rememberMe
                            ? this.options.rememberSessionDuration
                            : this.options.defaultSessionDuration
                    )
                ).toISOString();
        }

        if (
            this._isExpired(
                normalised.expiresAt
            )
        ) {
            throw new Error(
                "Cannot establish an expired session."
            );
        }

        this.session =
            normalised;

        this.user =
            normalised.user ||
            null;

        this.rememberMe =
            Boolean(
                normalised.rememberMe
            );

        this.expiresAt =
            normalised.expiresAt;

        this.lastActivityAt =
            normalised.lastActivityAt ||
            Date.now();

        this.lastRefreshAt =
            normalised.lastRefreshAt ||
            null;

        this._syncState();

        if (persist) {
            await this._persistSession();
        }

        this._scheduleTimers();

        eventBus.emit(
            "session:set",
            {
                session:
                    this._safeSession(),

                user:
                    this.user,

                rememberMe:
                    this.rememberMe,

                source,
            }
        );

        return this._safeSession();
    }


    /**
     * Update session properties without replacing
     * the complete session.
     */
    async updateSession(
        updates = {},
        options = {}
    ) {
        if (!this.session) {
            return this.setSession(
                updates,
                options
            );
        }

        const merged = {
            ...this.session,
            ...updates,
        };

        return this.setSession(
            merged,
            {
                ...options,
                user:
                    updates.user ??
                    this.user,

                rememberMe:
                    updates.rememberMe ??
                    this.rememberMe,
            }
        );
    }


    /**
     * Refresh current authentication session.
     */
    async refresh() {
        if (
            this.destroyed ||
            !this.session
        ) {
            return null;
        }

        if (this.refreshing) {
            return this.refreshing;
        }

        if (
            !this.authService
        ) {
            return this._extendLocalSession();
        }

        this.refreshing =
            this._performRefresh();

        try {
            return await this.refreshing;
        } finally {
            this.refreshing =
                null;
        }
    }


    /**
     * Perform refresh.
     */
    async _performRefresh() {
        eventBus.emit(
            "session:refreshing",
            {
                expiresAt:
                    this.expiresAt,
            }
        );

        try {
            let refreshed = null;

            if (
                typeof this.authService.refreshSession ===
                    "function"
            ) {
                refreshed =
                    await this.authService.refreshSession();
            } else if (
                typeof this.authService.refresh ===
                    "function"
            ) {
                refreshed =
                    await this.authService.refresh();
            }

            if (refreshed) {
                const session =
                    refreshed.session ||
                    refreshed;

                const user =
                    refreshed.user ||
                    session.user ||
                    this.user;

                await this.setSession(
                    session,
                    {
                        user,

                        rememberMe:
                            this.rememberMe,

                        source:
                            "session.refresh",
                    }
                );

                this.lastRefreshAt =
                    Date.now();

                eventBus.emit(
                    "session:refreshed",
                    {
                        session:
                            this._safeSession(),

                        user:
                            this.user,
                    }
                );

                return this._safeSession();
            }

            /*
             * If AuthService does not provide a refresh
             * method, extend the local session only.
             */
            return this._extendLocalSession();

        } catch (error) {
            eventBus.emit(
                "session:refreshError",
                {
                    error,
                }
            );

            /*
             * Do not immediately destroy the session
             * if refresh fails. The existing expiry remains
             * authoritative.
             */
            return null;
        }
    }


    /**
     * Extend a locally-managed session.
     */
    async _extendLocalSession() {
        if (!this.session) {
            return null;
        }

        const duration =
            this.rememberMe
                ? this.options.rememberSessionDuration
                : this.options.defaultSessionDuration;

        this.session.expiresAt =
            new Date(
                Date.now() +
                duration
            ).toISOString();

        this.expiresAt =
            this.session.expiresAt;

        this.lastRefreshAt =
            Date.now();

        await this._persistSession();

        this._syncState();

        this._scheduleTimers();

        eventBus.emit(
            "session:refreshed",
            {
                session:
                    this._safeSession(),

                local:
                    true,
            }
        );

        return this._safeSession();
    }


    /**
     * Determine whether current session is active.
     */
    isActive() {
        return (
            Boolean(
                this.session
            ) &&
            !this._isExpired(
                this.expiresAt
            )
        );
    }


    /**
     * Determine whether authenticated.
     */
    isAuthenticated() {
        return this.isActive();
    }


    /**
     * Determine whether session is expired.
     */
    isExpired() {
        if (!this.expiresAt) {
            return Boolean(
                this.session
            );
        }

        return this._isExpired(
            this.expiresAt
        );
    }


    /**
     * Return current session.
     */
    getSession() {
        return this._clone(
            this.session
        );
    }


    /**
     * Return current user.
     */
    getUser() {
        return this._clone(
            this.user
        );
    }


    /**
     * Return expiry date.
     */
    getExpiresAt() {
        return this.expiresAt;
    }


    /**
     * Return remaining session time in milliseconds.
     */
    getRemainingTime() {
        if (!this.expiresAt) {
            return 0;
        }

        return Math.max(
            0,
            new Date(
                this.expiresAt
            ).getTime() -
            Date.now()
        );
    }


    /**
     * Return remaining session time in seconds.
     */
    getRemainingSeconds() {
        return Math.floor(
            this.getRemainingTime() /
            1000
        );
    }


    /**
     * Return whether remember-me is enabled.
     */
    isRememberMeEnabled() {
        return this.rememberMe;
    }


    /**
     * Record user activity.
     */
    recordActivity() {
        if (
            !this.session ||
            this.destroyed
        ) {
            return;
        }

        const now =
            Date.now();

        this.lastActivityAt =
            now;

        this.session.lastActivityAt =
            now;

        /*
         * Avoid writing to storage on every mouse
         * movement or key press.
         */
        if (
            now -
            this._lastActivityWrite >=
            this.options.activityThrottle
        ) {
            this._lastActivityWrite =
                now;

            this._persistSession()
                .catch(
                    (error) => {
                        eventBus.emit(
                            "session:persistenceError",
                            {
                                error,
                            }
                        );
                    }
                );
        }

        eventBus.emit(
            "session:activity",
            {
                timestamp:
                    new Date(
                        now
                    ).toISOString(),
            }
        );
    }


    /**
     * Set remember-me preference.
     */
    async setRememberMe(
        enabled
    ) {
        this.rememberMe =
            Boolean(
                enabled
            );

        if (this.session) {
            this.session.rememberMe =
                this.rememberMe;
        }

        await this._writeStorage(
            this.options.rememberKey,
            this.rememberMe
        );

        if (this.session) {
            await this._persistSession();
        }

        this._syncState();

        eventBus.emit(
            "session:rememberMeChanged",
            {
                rememberMe:
                    this.rememberMe,
            }
        );

        return this.rememberMe;
    }


    /**
     * Clear current session.
     *
     * This clears session state and persistence.
     *
     * AuthService remains responsible for performing
     * the actual authentication logout operation.
     */
    async clear({
        logout = false,
        source = "session.clear",
    } = {}) {
        const previousSession =
            this._safeSession();

        this._clearTimers();

        this.session =
            null;

        this.user =
            null;

        this.expiresAt =
            null;

        this.lastActivityAt =
            null;

        this.lastRefreshAt =
            null;

        this.rememberMe =
            false;

        await this._removeStorage(
            this.options.sessionKey
        );

        await this._removeStorage(
            this.options.rememberKey
        );

        await this._removeStorage(
            this.options.activityKey
        );

        this._syncState();

        eventBus.emit(
            "session:cleared",
            {
                previousSession,
                source,
            }
        );

        /*
         * Explicit logout is delegated to AuthService.
         */
        if (
            logout &&
            this.authService
        ) {
            try {
                if (
                    typeof this.authService.logout ===
                        "function"
                ) {
                    await this.authService.logout();
                }
            } catch (error) {
                eventBus.emit(
                    "session:logoutError",
                    {
                        error,
                    }
                );

                throw error;
            }
        }

        return true;
    }


    /**
     * Handle session expiry.
     */
    async expire(
        reason = "expired"
    ) {
        const previousSession =
            this._safeSession();

        this._clearTimers();

        this.session =
            null;

        this.user =
            null;

        this.expiresAt =
            null;

        this.lastActivityAt =
            null;

        this.lastRefreshAt =
            null;

        this.rememberMe =
            false;

        await this._removeStorage(
            this.options.sessionKey
        );

        await this._removeStorage(
            this.options.activityKey
        );

        await this._removeStorage(
            this.options.rememberKey
        );

        this._syncState();

        eventBus.emit(
            "session:expired",
            {
                reason,
                previousSession,
            }
        );

        /*
         * If AuthService provides a session-expiry hook,
         * allow it to synchronise authentication.
         */
        if (
            this.authService &&
            typeof this.authService.handleSessionExpired ===
                "function"
        ) {
            try {
                await this.authService.handleSessionExpired(
                    {
                        reason,
                    }
                );
            } catch (error) {
                eventBus.emit(
                    "session:expiryHandlerError",
                    {
                        error,
                    }
                );
            }
        }

        return true;
    }


    /**
     * Schedule refresh and expiry timers.
     */
    _scheduleTimers() {
        this._clearTimers();

        if (
            !this.started ||
            !this.session
        ) {
            return;
        }

        const remaining =
            this.getRemainingTime();

        if (remaining <= 0) {
            this.expire(
                "expired"
            ).catch(
                (error) => {
                    eventBus.emit(
                        "session:error",
                        {
                            phase:
                                "expiry",

                            error,
                        }
                    );
                }
            );

            return;
        }

        /*
         * Schedule refresh before expiry.
         */
        const refreshDelay =
            Math.max(
                1000,
                remaining -
                this.options.refreshBeforeExpiry
            );

        this.refreshTimer =
            setTimeout(
                () => {
                    this.refresh()
                        .catch(
                            (error) => {
                                eventBus.emit(
                                    "session:error",
                                    {
                                        phase:
                                            "refresh",

                                        error,
                                    }
                                );
                            }
                        );
                },
                refreshDelay
            );


        /*
         * Schedule exact expiry.
         */
        this.sessionTimeoutTimer =
            setTimeout(
                () => {
                    this.expire(
                        "expired"
                    ).catch(
                        (error) => {
                            eventBus.emit(
                                "session:error",
                                {
                                    phase:
                                        "expiry",

                                    error,
                                }
                            );
                        }
                    );
                },
                remaining
            );
    }


    /**
     * Clear all timers.
     */
    _clearTimers() {
        if (
            this.sessionTimeoutTimer
        ) {
            clearTimeout(
                this.sessionTimeoutTimer
            );

            this.sessionTimeoutTimer =
                null;
        }

        if (
            this.refreshTimer
        ) {
            clearTimeout(
                this.refreshTimer
            );

            this.refreshTimer =
                null;
        }

        if (
            this.activityTimer
        ) {
            clearTimeout(
                this.activityTimer
            );

            this.activityTimer =
                null;
        }
    }


    /**
     * Bind application events.
     */
    _bindEvents() {
        this._clearEventSubscriptions();


        this.eventSubscriptions.push(
            eventBus.on(
                "auth:login",
                async (payload = {}) => {
                    try {
                        if (
                            payload.session
                        ) {
                            await this.setSession(
                                payload.session,
                                {
                                    user:
                                        payload.user ||
                                        null,

                                    rememberMe:
                                        payload.rememberMe ||
                                        false,

                                    source:
                                        "auth.login",
                                }
                            );
                        }
                    } catch (error) {
                        eventBus.emit(
                            "session:error",
                            {
                                phase:
                                    "auth.login",

                                error,
                            }
                        );
                    }
                }
            )
        );


        this.eventSubscriptions.push(
            eventBus.on(
                "auth:logout",
                () => {
                    this.clear({
                        logout:
                            false,

                        source:
                            "auth.logout",
                    }).catch(
                        (error) => {
                            eventBus.emit(
                                "session:error",
                                {
                                    phase:
                                        "auth.logout",

                                    error,
                                }
                            );
                        }
                    );
                }
            )
        );


        this.eventSubscriptions.push(
            eventBus.on(
                "auth:sessionChanged",
                async (payload = {}) => {
                    if (
                        payload.session
                    ) {
                        try {
                            await this.setSession(
                                payload.session,
                                {
                                    user:
                                        payload.user ||
                                        null,

                                    rememberMe:
                                        payload.rememberMe ??
                                        this.rememberMe,

                                    source:
                                        "auth.sessionChanged",
                                }
                            );
                        } catch (error) {
                            eventBus.emit(
                                "session:error",
                                {
                                    phase:
                                        "auth.sessionChanged",

                                    error,
                                }
                            );
                        }
                    }
                }
            )
        );


        this.eventSubscriptions.push(
            eventBus.on(
                "auth:stateChanged",
                (payload = {}) => {
                    if (
                        payload.authenticated ===
                        false
                    ) {
                        this.clear({
                            logout:
                                false,

                            source:
                                "auth.stateChanged",
                        }).catch(
                            (error) => {
                                eventBus.emit(
                                    "session:error",
                                    {
                                        phase:
                                            "auth.stateChanged",

                                        error,
                                    }
                                );
                            }
                        );
                    }
                }
            )
        );
    }


    /**
     * Remove event subscriptions.
     */
    _clearEventSubscriptions() {
        for (
            const unsubscribe of
                this.eventSubscriptions
        ) {
            try {
                if (
                    typeof unsubscribe ===
                        "function"
                ) {
                    unsubscribe();
                }
            } catch {
                // Ignore cleanup errors.
            }
        }

        this.eventSubscriptions =
            [];
    }


    /**
     * Install browser activity listeners.
     */
    _installActivityListeners() {
        if (
            typeof window ===
                "undefined"
        ) {
            return;
        }

        const events = [
            "click",
            "keydown",
            "mousemove",
            "scroll",
            "touchstart",
        ];

        for (
            const eventName of
                events
        ) {
            window.addEventListener(
                eventName,
                this._boundActivity,
                {
                    passive:
                        true,
                }
            );
        }

        document.addEventListener(
            "visibilitychange",
            this._boundVisibilityChange
        );
    }


    /**
     * Remove browser activity listeners.
     */
    _removeActivityListeners() {
        if (
            typeof window ===
                "undefined"
        ) {
            return;
        }

        const events = [
            "click",
            "keydown",
            "mousemove",
            "scroll",
            "touchstart",
        ];

        for (
            const eventName of
                events
        ) {
            window.removeEventListener(
                eventName,
                this._boundActivity
            );
        }

        document.removeEventListener(
            "visibilitychange",
            this._boundVisibilityChange
        );
    }


    /**
     * Browser activity handler.
     */
    _handleActivity() {
        if (
            !this.isActive()
        ) {
            return;
        }

        this.recordActivity();
    }


    /**
     * Visibility change handler.
     */
    _handleVisibilityChange() {
        if (
            typeof document ===
                "undefined"
        ) {
            return;
        }

        if (
            document.visibilityState ===
            "visible"
        ) {
            if (
                this.isExpired()
            ) {
                this.expire(
                    "visibility_check"
                ).catch(
                    (error) => {
                        eventBus.emit(
                            "session:error",
                            {
                                phase:
                                    "visibility",

                                error,
                            }
                        );
                    }
                );

                return;
            }

            this.recordActivity();
        }
    }


    /**
     * Persist current session.
     */
    async _persistSession() {
        if (!this.session) {
            return;
        }

        const serialised =
            this._safeSession();

        await this._writeStorage(
            this.options.sessionKey,
            serialised
        );

        await this._writeStorage(
            this.options.rememberKey,
            this.rememberMe
        );

        await this._writeStorage(
            this.options.activityKey,
            this.lastActivityAt
        );
    }


    /**
     * Synchronise SessionManager with StateStore.
     */
    _syncState() {
        if (
            !this.state
        ) {
            return;
        }

        if (
            typeof this.state.setAuthenticationState ===
                "function"
        ) {
            this.state.setAuthenticationState(
                {
                    authenticated:
                        this.isAuthenticated(),

                    user:
                        this.user,

                    session:
                        this._safeSession(),

                    rememberMe:
                        this.rememberMe,

                    loading:
                        false,
                },
                {
                    source:
                        "SessionManager",
                }
            );

            return;
        }

        if (
            typeof this.state.update ===
                "function"
        ) {
            this.state.update(
                {
                    "auth.authenticated":
                        this.isAuthenticated(),

                    "auth.user":
                        this.user,

                    "auth.session":
                        this._safeSession(),

                    "auth.rememberMe":
                        this.rememberMe,

                    "auth.loading":
                        false,
                },
                {
                    source:
                        "SessionManager",
                }
            );
        }
    }


    /**
     * Read from configured storage.
     */
    async _readStorage(
        key
    ) {
        if (!this.storage) {
            return null;
        }

        try {
            if (
                typeof this.storage.get ===
                    "function"
            ) {
                return await this.storage.get(
                    key
                );
            }

            if (
                typeof this.storage.read ===
                    "function"
            ) {
                return await this.storage.read(
                    key
                );
            }

            if (
                typeof this.storage.getItem ===
                    "function"
            ) {
                return await this.storage.getItem(
                    key
                );
            }
        } catch (error) {
            eventBus.emit(
                "session:storageError",
                {
                    operation:
                        "read",

                    key,

                    error,
                }
            );
        }

        return null;
    }


    /**
     * Write to configured storage.
     */
    async _writeStorage(
        key,
        value
    ) {
        if (!this.storage) {
            return false;
        }

        try {
            if (
                typeof this.storage.set ===
                    "function"
            ) {
                await this.storage.set(
                    key,
                    value
                );

                return true;
            }

            if (
                typeof this.storage.write ===
                    "function"
            ) {
                await this.storage.write(
                    key,
                    value
                );

                return true;
            }

            if (
                typeof this.storage.setItem ===
                    "function"
            ) {
                const serialised =
                    typeof value ===
                        "string"
                        ? value
                        : JSON.stringify(
                            value
                        );

                await this.storage.setItem(
                    key,
                    serialised
                );

                return true;
            }
        } catch (error) {
            eventBus.emit(
                "session:storageError",
                {
                    operation:
                        "write",

                    key,

                    error,
                }
            );
        }

        return false;
    }


    /**
     * Remove storage value.
     */
    async _removeStorage(
        key
    ) {
        if (!this.storage) {
            return false;
        }

        try {
            if (
                typeof this.storage.remove ===
                    "function"
            ) {
                await this.storage.remove(
                    key
                );

                return true;
            }

            if (
                typeof this.storage.delete ===
                    "function"
            ) {
                await this.storage.delete(
                    key
                );

                return true;
            }

            if (
                typeof this.storage.removeItem ===
                    "function"
            ) {
                await this.storage.removeItem(
                    key
                );

                return true;
            }
        } catch (error) {
            eventBus.emit(
                "session:storageError",
                {
                    operation:
                        "remove",

                    key,

                    error,
                }
            );
        }

        return false;
    }


    /**
     * Normalise a session object.
     */
    _normaliseSession(
        session,
        defaults = {}
    ) {
        if (
            !session ||
            typeof session !==
                "object"
        ) {
            return null;
        }

        const now =
            Date.now();

        const expiresAt =
            session.expiresAt ||
            session.expires_at ||
            session.expiry ||
            null;

        const normalisedExpiry =
            this._normaliseExpiry(
                expiresAt
            );

        return {
            ...this._clone(
                session
            ),

            id:
                session.id ||
                session.sessionId ||
                session.session_id ||
                null,

            user:
                session.user ??
                defaults.user ??
                null,

            token:
                session.token ||
                session.accessToken ||
                session.access_token ||
                null,

            refreshToken:
                session.refreshToken ||
                session.refresh_token ||
                null,

            expiresAt:
                normalisedExpiry,

            createdAt:
                session.createdAt ||
                session.created_at ||
                new Date(
                    now
                ).toISOString(),

            lastActivityAt:
                session.lastActivityAt ||
                session.last_activity_at ||
                now,

            lastRefreshAt:
                session.lastRefreshAt ||
                session.last_refresh_at ||
                null,

            rememberMe:
                session.rememberMe ??
                session.remember_me ??
                defaults.rememberMe ??
                false,
        };
    }


    /**
     * Normalise expiry to ISO string.
     */
    _normaliseExpiry(
        value
    ) {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return null;
        }

        if (
            typeof value ===
                "number"
        ) {
            /*
             * Support both seconds and milliseconds.
             */
            const timestamp =
                value < 10000000000
                    ? value * 1000
                    : value;

            const date =
                new Date(
                    timestamp
                );

            return Number.isNaN(
                date.getTime()
            )
                ? null
                : date.toISOString();
        }

        const date =
            new Date(
                value
            );

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return null;
        }

        return date.toISOString();
    }


    /**
     * Determine whether expiry has passed.
     */
    _isExpired(
        expiresAt
    ) {
        if (!expiresAt) {
            return false;
        }

        const timestamp =
            new Date(
                expiresAt
            ).getTime();

        if (
            Number.isNaN(
                timestamp
            )
        ) {
            return true;
        }

        return (
            timestamp <=
            Date.now()
        );
    }


    /**
     * Return safe session representation.
     *
     * Tokens are intentionally retained here because
     * the session object is required by AuthService,
     * but consumers receive a clone rather than the
     * internal object.
     */
    _safeSession() {
        return this._clone(
            this.session
        );
    }


    /**
     * Convert arbitrary value to boolean.
     */
    _toBoolean(
        value
    ) {
        if (
            typeof value ===
                "boolean"
        ) {
            return value;
        }

        if (
            typeof value ===
                "string"
        ) {
            return (
                value === "true" ||
                value === "1" ||
                value === "yes"
            );
        }

        if (
            typeof value ===
                "number"
        ) {
            return value === 1;
        }

        return Boolean(
            value
        );
    }


    /**
     * Clone supported application data.
     */
    _clone(
        value
    ) {
        if (
            value === null ||
            value === undefined
        ) {
            return value;
        }

        if (
            typeof structuredClone ===
                "function"
        ) {
            try {
                return structuredClone(
                    value
                );
            } catch {
                // Fall through.
            }
        }

        if (
            Array.isArray(
                value
            )
        ) {
            return value.map(
                (item) =>
                    this._clone(
                        item
                    )
            );
        }

        if (
            typeof value ===
                "object"
        ) {
            const result = {};

            for (
                const [
                    key,
                    item
                ] of Object.entries(
                    value
                )
            ) {
                result[key] =
                    this._clone(
                        item
                    );
            }

            return result;
        }

        return value;
    }


    /**
     * Return SessionManager status.
     */
    getStatus() {
        return {
            initialised:
                this.initialised,

            started:
                this.started,

            destroyed:
                this.destroyed,

            authenticated:
                this.isAuthenticated(),

            active:
                this.isActive(),

            expired:
                this.isExpired(),

            rememberMe:
                this.rememberMe,

            expiresAt:
                this.expiresAt,

            remainingSeconds:
                this.getRemainingSeconds(),

            lastActivityAt:
                this.lastActivityAt,

            lastRefreshAt:
                this.lastRefreshAt,
        };
    }


    /**
     * Destroy SessionManager.
     */
    destroy() {
        if (
            this.destroyed
        ) {
            return;
        }

        this.stop();

        this._clearEventSubscriptions();

        this._removeActivityListeners();

        this.session =
            null;

        this.user =
            null;

        this.expiresAt =
            null;

        this.lastActivityAt =
            null;

        this.lastRefreshAt =
            null;

        this.initialised =
            false;

        this.destroyed =
            true;

        eventBus.emit(
            "session:destroyed",
            {}
        );
    }
}


/**
 * Singleton SessionManager.
 *
 * AuthService and Storage are injected later by the
 * application bootstrap process when available.
 */
export const sessionManager =
    new SessionManager();


/**
 * Named exports.
 */
export {
    SessionManager,
};


/**
 * Default export.
 */
export default sessionManager;