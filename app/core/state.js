/**
 * Isaacs and Partners
 * Application State Store
 *
 * Central reactive runtime state for the application.
 *
 * Responsibilities:
 * - Maintain application-wide runtime state
 * - Provide safe state reads/writes
 * - Support dot-notation state paths
 * - Support partial state updates
 * - Support nested state updates
 * - Emit state change events
 * - Provide global subscriptions
 * - Provide path-specific subscriptions
 * - Synchronise authentication state
 * - Synchronise router/navigation state
 * - Track browser online/offline state
 * - Support Remember Me state
 *
 * IMPORTANT ARCHITECTURE RULES
 *
 * StateStore does NOT own authentication.
 * AuthService remains the authentication source of truth.
 *
 * StateStore does NOT own persistence.
 * CoreStorage remains responsible for persistence.
 *
 * StateStore does NOT import Router or AuthService.
 * Synchronisation happens through EventBus to avoid
 * circular dependencies.
 */

import { eventBus } from "./events.js";


/**
 * Default application state.
 */
const DEFAULT_STATE = {
    app: {
        initialised: false,
        started: false,
        version: null,
        environment: null,
    },

    auth: {
        authenticated: false,
        user: null,
        session: null,
        rememberMe: false,
        loading: false,
    },

    navigation: {
        currentPath: null,
        previousPath: null,
        currentRoute: null,
        navigating: false,
    },

    ui: {
        loading: false,
        sidebarOpen: false,
        mobileMenuOpen: false,
        activeModal: null,
        notification: null,
    },

    consultation: {
        active: false,
        step: null,
        data: {},
    },

    matter: {
        currentMatterId: null,
        currentMatter: null,
    },

    documents: {
        outstanding: [],
        uploaded: [],
        currentDocumentId: null,
    },

    system: {
        online:
            typeof navigator !== "undefined"
                ? navigator.onLine
                : true,

        lastError: null,
        lastUpdated: null,
    },
};


class StateStore {
    constructor(initialState = {}) {
        this.state =
            this._deepMerge(
                this._clone(DEFAULT_STATE),
                initialState
            );

        this.initialised = false;
        this.initialising = null;
        this.destroyed = false;

        this.subscribers = new Set();
        this.pathSubscribers = new Map();

        this.eventSubscriptions = [];

        this.previousState = null;

        this._boundOnline =
            this._handleOnline.bind(this);

        this._boundOffline =
            this._handleOffline.bind(this);
    }


    /**
     * Initialise the state store.
     *
     * Safe to call multiple times.
     */
    initialise() {
        if (this.destroyed) {
            throw new Error(
                "StateStore has been destroyed."
            );
        }

        if (this.initialised) {
            return this;
        }

        if (
            typeof window !== "undefined"
        ) {
            window.addEventListener(
                "online",
                this._boundOnline
            );

            window.addEventListener(
                "offline",
                this._boundOffline
            );
        }

        this._bindApplicationEvents();

        this.state.app.initialised = true;

        this.state.system.online =
            typeof navigator !== "undefined"
                ? navigator.onLine
                : true;

        this.state.system.lastUpdated =
            new Date().toISOString();

        this.initialised = true;

        return this;
    }


    /**
     * Alias for initialise().
     */
    init() {
        return this.initialise();
    }


    /**
     * Get complete application state.
     *
     * Returns a clone so callers cannot mutate
     * the internal store directly.
     */
    getState() {
        this._assertNotDestroyed();

        return this._clone(
            this.state
        );
    }


    /**
     * Get state value using dot notation.
     *
     * Example:
     *
     * state.get("auth.authenticated")
     */
    get(
        path,
        defaultValue = null
    ) {
        this._assertNotDestroyed();

        const parts =
            this._normalisePath(path);

        if (parts.length === 0) {
            return defaultValue;
        }

        let current =
            this.state;

        for (
            const part of parts
        ) {
            if (
                current === null ||
                current === undefined ||
                !Object.prototype.hasOwnProperty.call(
                    current,
                    part
                )
            ) {
                return defaultValue;
            }

            current =
                current[part];
        }

        return this._clone(
            current
        );
    }


    /**
     * Set a state value using dot notation.
     *
     * Example:
     *
     * state.set(
     *     "auth.rememberMe",
     *     true
     * );
     */
    set(
        path,
        value,
        options = {}
    ) {
        this._assertUsable();

        const parts =
            this._normalisePath(path);

        if (parts.length === 0) {
            throw new TypeError(
                "State path must be a non-empty string."
            );
        }

        const previous =
            this._clone(
                this.state
            );

        const oldValue =
            this.get(
                path,
                undefined
            );

        this._setNestedValue(
            this.state,
            parts,
            value
        );

        this.state.system.lastUpdated =
            new Date().toISOString();

        this.previousState =
            previous;

        this._notify(
            path,
            value,
            oldValue,
            previous,
            options
        );

        return this._clone(
            value
        );
    }


    /**
     * Update multiple state paths.
     *
     * Example:
     *
     * state.update({
     *     "auth.authenticated": true,
     *     "auth.rememberMe": true
     * });
     */
    update(
        updates,
        options = {}
    ) {
        this._assertUsable();

        if (
            !updates ||
            typeof updates !== "object" ||
            Array.isArray(updates)
        ) {
            throw new TypeError(
                "State updates must be an object."
            );
        }

        const previous =
            this._clone(
                this.state
            );

        const changedPaths = [];

        for (
            const [
                path,
                value
            ] of Object.entries(
                updates
            )
        ) {
            const parts =
                this._normalisePath(
                    path
                );

            if (parts.length === 0) {
                continue;
            }

            const oldValue =
                this.get(
                    path,
                    undefined
                );

            this._setNestedValue(
                this.state,
                parts,
                value
            );

            changedPaths.push({
                path,
                value,
                oldValue,
            });
        }

        if (
            changedPaths.length === 0
        ) {
            return this.getState();
        }

        this.state.system.lastUpdated =
            new Date().toISOString();

        this.previousState =
            previous;

        for (
            const change of changedPaths
        ) {
            this._notifyPathSubscribers(
                change.path,
                change.value,
                change.oldValue,
                previous,
                options
            );
        }

        this._notifySubscribers(
            previous,
            this.state,
            {
                ...options,
                changedPaths:
                    changedPaths.map(
                        (change) =>
                            change.path
                    ),
            }
        );

        eventBus.emit(
            "state:changed",
            {
                state:
                    this._clone(
                        this.state
                    ),

                previousState:
                    previous,

                changedPaths:
                    changedPaths.map(
                        (change) =>
                            change.path
                    ),

                source:
                    options.source ||
                    "state",
            }
        );

        return this.getState();
    }


    /**
     * Merge an object into a state path.
     *
     * Example:
     *
     * state.merge(
     *     "auth",
     *     {
     *         rememberMe: true
     *     }
     * );
     */
    merge(
        path,
        value,
        options = {}
    ) {
        this._assertUsable();

        if (
            !value ||
            typeof value !== "object" ||
            Array.isArray(value)
        ) {
            throw new TypeError(
                "State merge value must be an object."
            );
        }

        const existing =
            this.get(
                path,
                {}
            );

        const merged =
            this._deepMerge(
                this._clone(existing),
                value
            );

        return this.set(
            path,
            merged,
            options
        );
    }


    /**
     * Replace complete application state.
     *
     * Missing properties are restored from DEFAULT_STATE.
     */
    replace(
        nextState,
        options = {}
    ) {
        this._assertUsable();

        if (
            !nextState ||
            typeof nextState !== "object" ||
            Array.isArray(nextState)
        ) {
            throw new TypeError(
                "Replacement state must be an object."
            );
        }

        const previous =
            this._clone(
                this.state
            );

        this.state =
            this._deepMerge(
                this._clone(
                    DEFAULT_STATE
                ),
                nextState
            );

        this.state.system.lastUpdated =
            new Date().toISOString();

        this.previousState =
            previous;

        this._notifySubscribers(
            previous,
            this.state,
            {
                ...options,
                replaced: true,
            }
        );

        eventBus.emit(
            "state:replaced",
            {
                state:
                    this._clone(
                        this.state
                    ),

                previousState:
                    previous,

                source:
                    options.source ||
                    "state",
            }
        );

        return this.getState();
    }


    /**
     * Reset application state.
     */
    reset(
        options = {}
    ) {
        return this.replace(
            DEFAULT_STATE,
            {
                ...options,
                source:
                    options.source ||
                    "state.reset",
            }
        );
    }


    /**
     * Subscribe to all state changes.
     */
    subscribe(
        handler
    ) {
        this._validateHandler(
            handler
        );

        this._assertNotDestroyed();

        this.subscribers.add(
            handler
        );

        return () => {
            this.subscribers.delete(
                handler
            );
        };
    }


    /**
     * Subscribe to a specific state path.
     *
     * Handler signature:
     *
     * (value, oldValue, payload)
     */
    subscribeTo(
        path,
        handler
    ) {
        this._validatePath(
            path
        );

        this._validateHandler(
            handler
        );

        this._assertNotDestroyed();

        if (
            !this.pathSubscribers.has(
                path
            )
        ) {
            this.pathSubscribers.set(
                path,
                new Set()
            );
        }

        const handlers =
            this.pathSubscribers.get(
                path
            );

        handlers.add(
            handler
        );

        return () => {
            handlers.delete(
                handler
            );

            if (
                handlers.size === 0
            ) {
                this.pathSubscribers.delete(
                    path
                );
            }
        };
    }


    /**
     * Determine whether a state path exists.
     */
    has(
        path
    ) {
        const marker =
            Symbol(
                "state.missing"
            );

        return (
            this.get(
                path,
                marker
            ) !== marker
        );
    }


    /**
     * Get previous complete state snapshot.
     */
    getPreviousState() {
        this._assertNotDestroyed();

        return this.previousState
            ? this._clone(
                this.previousState
            )
            : null;
    }


    /**
     * Set authentication state.
     *
     * AuthService remains the source of truth.
     *
     * Remember Me is explicitly represented here so
     * the rest of the application can react to it.
     */
    setAuthenticationState(
        {
            authenticated = false,
            user = null,
            session = null,
            rememberMe = false,
            loading = false,
        } = {},
        options = {}
    ) {
        return this.update(
            {
                "auth.authenticated":
                    Boolean(
                        authenticated
                    ),

                "auth.user":
                    user,

                "auth.session":
                    session,

                "auth.rememberMe":
                    Boolean(
                        rememberMe
                    ),

                "auth.loading":
                    Boolean(
                        loading
                    ),
            },
            {
                ...options,
                source:
                    options.source ||
                    "auth",
            }
        );
    }


    /**
     * Set Remember Me state only.
     */
    setRememberMe(
        rememberMe = false,
        options = {}
    ) {
        return this.set(
            "auth.rememberMe",
            Boolean(
                rememberMe
            ),
            {
                ...options,
                source:
                    options.source ||
                    "auth.rememberMe",
            }
        );
    }


    /**
     * Determine whether Remember Me is enabled.
     */
    isRememberMeEnabled() {
        return Boolean(
            this.get(
                "auth.rememberMe",
                false
            )
        );
    }


    /**
     * Clear authentication runtime state.
     *
     * Does NOT perform logout.
     */
    clearAuthenticationState(
        options = {}
    ) {
        return this.setAuthenticationState(
            {
                authenticated: false,
                user: null,
                session: null,
                rememberMe: false,
                loading: false,
            },
            {
                ...options,
                source:
                    options.source ||
                    "auth.clear",
            }
        );
    }


    /**
     * Set navigation state.
     */
    setNavigationState(
        {
            currentPath = null,
            previousPath = null,
            currentRoute = null,
            navigating = false,
        } = {},
        options = {}
    ) {
        return this.update(
            {
                "navigation.currentPath":
                    currentPath,

                "navigation.previousPath":
                    previousPath,

                "navigation.currentRoute":
                    currentRoute,

                "navigation.navigating":
                    Boolean(
                        navigating
                    ),
            },
            {
                ...options,
                source:
                    options.source ||
                    "router",
            }
        );
    }


    /**
     * Mark application as started.
     */
    setStarted(
        started = true,
        options = {}
    ) {
        return this.set(
            "app.started",
            Boolean(
                started
            ),
            {
                ...options,
                source:
                    options.source ||
                    "application",
            }
        );
    }


    /**
     * Set UI loading state.
     */
    setLoading(
        loading = false,
        options = {}
    ) {
        return this.set(
            "ui.loading",
            Boolean(
                loading
            ),
            {
                ...options,
                source:
                    options.source ||
                    "ui",
            }
        );
    }


    /**
     * Set system error.
     */
    setError(
        error,
        options = {}
    ) {
        return this.set(
            "system.lastError",
            this._normaliseError(
                error
            ),
            {
                ...options,
                source:
                    options.source ||
                    "system",
            }
        );
    }


    /**
     * Clear system error.
     */
    clearError(
        options = {}
    ) {
        return this.set(
            "system.lastError",
            null,
            {
                ...options,
                source:
                    options.source ||
                    "system",
            }
        );
    }


    /**
     * Return online status.
     */
    isOnline() {
        return Boolean(
            this.get(
                "system.online",
                true
            )
        );
    }


    /**
     * Return store status.
     */
    getStatus() {
        this._assertNotDestroyed();

        return {
            initialised:
                this.initialised,

            destroyed:
                this.destroyed,

            subscribers:
                this.subscribers.size,

            pathSubscribers:
                this.pathSubscribers.size,

            authenticated:
                Boolean(
                    this.get(
                        "auth.authenticated",
                        false
                    )
                ),

            rememberMe:
                this.isRememberMeEnabled(),

            online:
                this.isOnline(),

            currentPath:
                this.get(
                    "navigation.currentPath",
                    null
                ),

            lastUpdated:
                this.get(
                    "system.lastUpdated",
                    null
                ),
        };
    }


    /**
     * Bind application-level events.
     *
     * EventBus is used instead of direct imports to avoid
     * Router/AuthService circular dependencies.
     */
    _bindApplicationEvents() {
        this._clearEventSubscriptions();


        /*
         * Router state changed.
         */
        this.eventSubscriptions.push(
            eventBus.on(
                "router:stateChanged",
                (payload = {}) => {
                    const currentRoute =
                        payload.currentRoute ||
                        null;

                    const previousPath =
                        this.get(
                            "navigation.currentPath",
                            null
                        );

                    this.update(
                        {
                            "navigation.previousPath":
                                previousPath,

                            "navigation.currentPath":
                                currentRoute?.pathname ||
                                null,

                            "navigation.currentRoute":
                                currentRoute,

                            "navigation.navigating":
                                false,
                        },
                        {
                            source:
                                "router",
                        }
                    );
                }
            )
        );


        /*
         * Router navigation started.
         */
        this.eventSubscriptions.push(
            eventBus.on(
                "router:beforeNavigate",
                () => {
                    this.set(
                        "navigation.navigating",
                        true,
                        {
                            source:
                                "router",
                        }
                    );
                }
            )
        );


        /*
         * Router navigation completed.
         */
        this.eventSubscriptions.push(
            eventBus.on(
                "router:navigated",
                (payload = {}) => {
                    const previousPath =
                        this.get(
                            "navigation.currentPath",
                            null
                        );

                    this.update(
                        {
                            "navigation.previousPath":
                                previousPath,

                            "navigation.navigating":
                                false,

                            "navigation.currentPath":
                                payload.path ||
                                previousPath,

                            "navigation.currentRoute":
                                payload.route ||
                                this.get(
                                    "navigation.currentRoute",
                                    null
                                ),
                        },
                        {
                            source:
                                "router",
                        }
                    );
                }
            )
        );


        /*
         * Router navigation error.
         */
        this.eventSubscriptions.push(
            eventBus.on(
                "router:error",
                (payload = {}) => {
                    this.update(
                        {
                            "navigation.navigating":
                                false,

                            "system.lastError":
                                this._normaliseError(
                                    payload.error
                                ),
                        },
                        {
                            source:
                                "router",
                        }
                    );
                }
            )
        );


        /*
         * Authentication state changed.
         */
        this.eventSubscriptions.push(
            eventBus.on(
                "auth:stateChanged",
                (payload = {}) => {
                    this.setAuthenticationState(
                        {
                            authenticated:
                                Boolean(
                                    payload.authenticated
                                ),

                            user:
                                payload.user ??
                                null,

                            session:
                                payload.session ??
                                null,

                            rememberMe:
                                Boolean(
                                    payload.rememberMe
                                ),

                            loading:
                                Boolean(
                                    payload.loading
                                ),
                        },
                        {
                            source:
                                payload.source ||
                                "AuthService",
                        }
                    );
                }
            )
        );


        /*
         * Authentication login event.
         */
        this.eventSubscriptions.push(
            eventBus.on(
                "auth:login",
                (payload = {}) => {
                    this.setAuthenticationState(
                        {
                            authenticated: true,

                            user:
                                payload.user ??
                                null,

                            session:
                                payload.session ??
                                null,

                            rememberMe:
                                Boolean(
                                    payload.rememberMe
                                ),

                            loading: false,
                        },
                        {
                            source:
                                payload.source ||
                                "auth.login",
                        }
                    );
                }
            )
        );


        /*
         * Authentication logout event.
         */
        this.eventSubscriptions.push(
            eventBus.on(
                "auth:logout",
                () => {
                    this.clearAuthenticationState(
                        {
                            source:
                                "auth.logout",
                        }
                    );
                }
            )
        );


        /*
         * Authentication loading state.
         */
        this.eventSubscriptions.push(
            eventBus.on(
                "auth:loading",
                (payload = {}) => {
                    this.set(
                        "auth.loading",
                        Boolean(
                            payload.loading
                        ),
                        {
                            source:
                                "auth",
                        }
                    );
                }
            )
        );


        /*
         * Explicit Remember Me change.
         *
         * This allows AuthService/LoginController to emit
         * a dedicated event without coupling directly to
         * this store.
         */
        this.eventSubscriptions.push(
            eventBus.on(
                "auth:rememberMeChanged",
                (payload = {}) => {
                    this.setRememberMe(
                        Boolean(
                            payload.rememberMe
                        ),
                        {
                            source:
                                payload.source ||
                                "auth.rememberMe",
                        }
                    );
                }
            )
        );
    }


    /**
     * Remove all EventBus subscriptions.
     */
    _clearEventSubscriptions() {
        for (
            const unsubscribe of
                this.eventSubscriptions
        ) {
            try {
                unsubscribe();
            } catch {
                // Ignore cleanup errors.
            }
        }

        this.eventSubscriptions = [];
    }


    /**
     * Browser online handler.
     */
    _handleOnline() {
        if (this.destroyed) {
            return;
        }

        this.set(
            "system.online",
            true,
            {
                source:
                    "browser",
            }
        );

        eventBus.emit(
            "system:online",
            {
                online: true,
            }
        );
    }


    /**
     * Browser offline handler.
     */
    _handleOffline() {
        if (this.destroyed) {
            return;
        }

        this.set(
            "system.online",
            false,
            {
                source:
                    "browser",
            }
        );

        eventBus.emit(
            "system:offline",
            {
                online: false,
            }
        );
    }


    /**
     * Notify all relevant subscribers.
     */
    _notify(
        path,
        value,
        oldValue,
        previousState,
        options = {}
    ) {
        this._notifyPathSubscribers(
            path,
            value,
            oldValue,
            previousState,
            options
        );

        this._notifySubscribers(
            previousState,
            this.state,
            {
                ...options,
                changedPaths: [
                    path
                ],
            }
        );

        eventBus.emit(
            "state:changed",
            {
                path,

                value:
                    this._clone(
                        value
                    ),

                oldValue:
                    this._clone(
                        oldValue
                    ),

                state:
                    this._clone(
                        this.state
                    ),

                previousState:
                    this._clone(
                        previousState
                    ),

                source:
                    options.source ||
                    "state",
            }
        );
    }


    /**
     * Notify path-specific subscribers.
     */
    _notifyPathSubscribers(
        path,
        value,
        oldValue,
        previousState,
        options = {}
    ) {
        const handlers =
            this.pathSubscribers.get(
                path
            );

        if (
            !handlers ||
            handlers.size === 0
        ) {
            return;
        }

        const payload = {
            path,

            value:
                this._clone(
                    value
                ),

            oldValue:
                this._clone(
                    oldValue
                ),

            state:
                this._clone(
                    this.state
                ),

            previousState:
                this._clone(
                    previousState
                ),

            source:
                options.source ||
                "state",
        };

        for (
            const handler of [
                ...handlers
            ]
        ) {
            try {
                handler(
                    payload.value,
                    payload.oldValue,
                    payload
                );
            } catch (error) {
                console.error(
                    `[StateStore] Path subscriber failed for "${path}":`,
                    error
                );
            }
        }
    }


    /**
     * Notify global subscribers.
     */
    _notifySubscribers(
        previousState,
        currentState,
        options = {}
    ) {
        if (
            this.subscribers.size === 0
        ) {
            return;
        }

        const payload = {
            state:
                this._clone(
                    currentState
                ),

            previousState:
                this._clone(
                    previousState
                ),

            changedPaths:
                options.changedPaths ||
                [],

            source:
                options.source ||
                "state",
        };

        for (
            const handler of [
                ...this.subscribers
            ]
        ) {
            try {
                handler(
                    payload.state,
                    payload.previousState,
                    payload
                );
            } catch (error) {
                console.error(
                    "[StateStore] Subscriber failed:",
                    error
                );
            }
        }
    }


    /**
     * Set nested state value.
     */
    _setNestedValue(
        target,
        parts,
        value
    ) {
        let current =
            target;

        for (
            let index = 0;
            index < parts.length - 1;
            index += 1
        ) {
            const part =
                parts[index];

            if (
                !current[part] ||
                typeof current[part] !==
                    "object" ||
                Array.isArray(
                    current[part]
                )
            ) {
                current[part] = {};
            }

            current =
                current[part];
        }

        current[
            parts[
                parts.length - 1
            ]
        ] =
            this._clone(
                value
            );
    }


    /**
     * Convert dot-notation path into segments.
     */
    _normalisePath(
        path
    ) {
        if (
            typeof path !== "string" ||
            path.trim() === ""
        ) {
            return [];
        }

        return path
            .split(".")
            .map(
                (part) =>
                    part.trim()
            )
            .filter(
                Boolean
            );
    }


    /**
     * Validate state path.
     */
    _validatePath(
        path
    ) {
        if (
            typeof path !== "string" ||
            path.trim() === ""
        ) {
            throw new TypeError(
                "State path must be a non-empty string."
            );
        }
    }


    /**
     * Validate subscriber handler.
     */
    _validateHandler(
        handler
    ) {
        if (
            typeof handler !== "function"
        ) {
            throw new TypeError(
                "State subscriber must be a function."
            );
        }
    }


    /**
     * Ensure store is usable.
     */
    _assertUsable() {
        this._assertNotDestroyed();

        if (!this.initialised) {
            this.initialise();
        }
    }


    /**
     * Ensure store has not been destroyed.
     */
    _assertNotDestroyed() {
        if (this.destroyed) {
            throw new Error(
                "StateStore has been destroyed."
            );
        }
    }


    /**
     * Deep clone application data.
     */
    _clone(value) {
        if (
            value === undefined ||
            value === null
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
                // Fall through to manual clone.
            }
        }

        if (
            Array.isArray(value)
        ) {
            return value.map(
                (item) =>
                    this._clone(
                        item
                    )
            );
        }

        if (
            typeof value === "object"
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
     * Deep merge plain objects.
     */
    _deepMerge(
        target,
        source
    ) {
        if (
            !source ||
            typeof source !== "object"
        ) {
            return target;
        }

        for (
            const [
                key,
                value
            ] of Object.entries(
                source
            )
        ) {
            if (
                value &&
                typeof value === "object" &&
                !Array.isArray(value)
            ) {
                if (
                    !target[key] ||
                    typeof target[key] !==
                        "object" ||
                    Array.isArray(
                        target[key]
                    )
                ) {
                    target[key] = {};
                }

                this._deepMerge(
                    target[key],
                    value
                );
            } else {
                target[key] =
                    this._clone(
                        value
                    );
            }
        }

        return target;
    }


    /**
     * Convert arbitrary error to serialisable data.
     */
    _normaliseError(
        error
    ) {
        if (!error) {
            return null;
        }

        if (
            typeof error === "string"
        ) {
            return {
                name: "Error",
                message: error,
                code: null,
                status: null,
            };
        }

        return {
            name:
                error.name ||
                "Error",

            message:
                error.message ||
                "An unexpected error occurred.",

            code:
                error.code ??
                null,

            status:
                error.status ??
                null,
        };
    }


    /**
     * Destroy state store.
     *
     * Removes browser listeners, EventBus subscriptions
     * and application subscribers.
     */
    destroy() {
        if (this.destroyed) {
            return;
        }

        this._clearEventSubscriptions();

        if (
            typeof window !== "undefined"
        ) {
            window.removeEventListener(
                "online",
                this._boundOnline
            );

            window.removeEventListener(
                "offline",
                this._boundOffline
            );
        }

        this.subscribers.clear();
        this.pathSubscribers.clear();

        this.previousState = null;

        this.initialised = false;
        this.initialising = null;
        this.destroyed = true;
    }
}


/**
 * Singleton application state store.
 */
export const state =
    new StateStore();


/**
 * Named exports.
 */
export {
    StateStore,
    DEFAULT_STATE,
};


/**
 * Default export.
 */
export default state;
