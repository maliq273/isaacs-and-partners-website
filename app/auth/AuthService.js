/**
 * Isaacs and Partners
 * Supabase Authentication Service
 *
 * Central authentication service for the client application.
 * Navigation remains the responsibility of AuthGuard / Router / controllers.
 *
 * Public registration is limited to individual and business accounts.
 * Staff accounts are provisioned internally and are never created here.
 */

import { storage } from "../core/storage.js";
import { eventBus } from "../core/events.js";
import authConfig from "./auth.config.js";

const STORAGE_KEYS = Object.freeze({
    AUTH_SESSION: authConfig.storageKeys.session,
    AUTH_USER: authConfig.storageKeys.user,
    AUTH_TOKEN: authConfig.storageKeys.token,
    AUTH_REFRESH_TOKEN: authConfig.storageKeys.refreshToken,
    AUTH_EXPIRES_AT: authConfig.storageKeys.expiresAt,
    AUTH_REMEMBER_ME: authConfig.storageKeys.rememberMe
});

const DEFAULT_CONFIG = Object.freeze({
    provider: authConfig.provider,
    loginEndpoint: authConfig.endpoints.login,
    signupEndpoint: authConfig.endpoints.signup,
    logoutEndpoint: authConfig.endpoints.logout,
    sessionEndpoint: authConfig.endpoints.session,
    refreshEndpoint: authConfig.endpoints.refresh,
    meEndpoint: authConfig.endpoints.me,
    publishableKey: authConfig.supabase.publishableKey,
    requestTimeout: authConfig.request.timeout,
    sessionDuration: authConfig.session.sessionDuration,
    rememberMeDuration: authConfig.session.rememberMeDuration,
    refreshBeforeExpiry: authConfig.session.refreshBeforeExpiry,
    credentials: authConfig.security.credentials,
    useBearerToken: authConfig.security.useBearerToken
});

class AuthService {
    constructor() {
        this.initialised = false;
        this.initialising = null;
        this.authenticated = false;
        this.user = null;
        this.token = null;
        this.refreshToken = null;
        this.expiresAt = null;
        this.rememberMe = false;
        this.session = null;
        this.refreshTimer = null;
        this.refreshing = null;
        this.destroyed = false;
        this.config = { ...DEFAULT_CONFIG };
    }

    async initialise(options = {}) {
        if (this.destroyed) {
            throw new Error("AuthService has been destroyed.");
        }

        if (this.initialised) return this;
        if (this.initialising) return this.initialising;

        this.initialising = this._initialise(options);

        try {
            await this.initialising;
            return this;
        } finally {
            this.initialising = null;
        }
    }

    async init(options = {}) {
        return this.initialise(options);
    }

    async _initialise(options = {}) {
        this.configure(options);
        await storage.initialise();

        const restored = await this._restoreSession();

        if (restored) {
            this._startExpiryMonitor();
            eventBus.emit("auth:sessionRestored", {
                user: this.getCurrentUser(),
                rememberMe: this.rememberMe,
                expiresAt: this.expiresAt
            });
        }

        this.initialised = true;

        eventBus.emit("auth:initialised", {
            authenticated: this.authenticated,
            user: this.getCurrentUser(),
            rememberMe: this.rememberMe
        });

        return this;
    }

    configure(options = {}) {
        if (!options || typeof options !== "object") {
            throw new TypeError("AuthService configuration must be an object.");
        }

        this.config = {
            ...this.config,
            ...options
        };

        return this;
    }

    getConfig() {
        return { ...this.config };
    }

    async login(identifier, password, options = {}) {
        await this.initialise();

        const email = String(identifier || "").trim().toLowerCase();

        if (!email) {
            throw this._createAuthError(
                "IDENTIFIER_REQUIRED",
                "Email address is required."
            );
        }

        if (!this._isValidEmail(email)) {
            throw this._createAuthError(
                "EMAIL_INVALID",
                "Please sign in using a valid email address."
            );
        }

        if (typeof password !== "string" || !password) {
            throw this._createAuthError(
                "PASSWORD_REQUIRED",
                "Password is required."
            );
        }

        const rememberMe = Boolean(options.rememberMe);
        this._clearExpiryMonitor();

        eventBus.emit("auth:loginStarted", {
            identifier: email,
            rememberMe
        });

        try {
            const response = await this._request(
                this.config.loginEndpoint,
                {
                    method: "POST",
                    body: {
                        email,
                        password
                    }
                }
            );

            const normalised = this._normaliseSupabaseSession(response);

            if (!normalised.authenticated || !normalised.token || !normalised.user) {
                throw this._createAuthError(
                    "AUTHENTICATION_FAILED",
                    "Authentication failed."
                );
            }

            await this._establishSession(normalised, rememberMe);

            eventBus.emit("auth:loginSucceeded", {
                user: this.getCurrentUser(),
                rememberMe: this.rememberMe,
                expiresAt: this.expiresAt
            });

            return {
                authenticated: true,
                user: this.getCurrentUser(),
                token: this.getToken(),
                rememberMe: this.rememberMe,
                expiresAt: this.expiresAt
            };
        } catch (error) {
            eventBus.emit("auth:loginFailed", {
                error,
                identifier: email,
                rememberMe
            });

            throw this._normaliseError(error);
        }
    }

    /** Register only public individual or business accounts. */
    async register({
        email,
        password,
        accountType = "individual",
        profile = {},
        options = {}
    } = {}) {
        await this.initialise();

        const normalisedEmail = String(email || "").trim().toLowerCase();

        if (!this._isValidEmail(normalisedEmail)) {
            throw this._createAuthError(
                "EMAIL_INVALID",
                "Please enter a valid email address."
            );
        }

        if (typeof password !== "string" || password.length < 8) {
            throw this._createAuthError(
                "PASSWORD_WEAK",
                "Password must contain at least 8 characters."
            );
        }

        if (password.length > 256) {
            throw this._createAuthError(
                "PASSWORD_TOO_LONG",
                "The password is too long."
            );
        }

        const type = String(accountType || "individual").trim().toLowerCase();

        if (!["individual", "business"].includes(type)) {
            throw this._createAuthError(
                "ACCOUNT_TYPE_INVALID",
                "Staff accounts are created internally and cannot be registered here."
            );
        }

        const metadata = {
            account_type: type,
            ...this._sanitiseMetadata(profile)
        };

        const body = {
            email: normalisedEmail,
            password,
            data: metadata
        };

        const redirectTo = this._getEmailRedirectUrl(options.emailRedirectTo);

        if (redirectTo) {
            body.options = {
                email_redirect_to: redirectTo
            };
        }

        const response = await this._request(
            this.config.signupEndpoint,
            {
                method: "POST",
                body
            }
        );

        const normalised = this._normaliseSupabaseSession(response);

        /*
         * Supabase returns a user without an access token when email
         * confirmation is enabled. That is a successful registration,
         * but it is deliberately NOT an authenticated session.
         */
        if (normalised.authenticated && normalised.token && normalised.user) {
            await this._establishSession(
                normalised,
                Boolean(options.rememberMe)
            );
        }

        eventBus.emit("auth:registrationSucceeded", {
            user: normalised.user,
            accountType: type,
            authenticated: normalised.authenticated,
            requiresEmailConfirmation: !normalised.authenticated
        });

        return {
            registered: true,
            authenticated: normalised.authenticated,
            user: normalised.user,
            requiresEmailConfirmation: !normalised.authenticated
        };
    }

    async logout({ remote = true, reason = "user" } = {}) {
        await this.initialise();

        const previousUser = this.getCurrentUser();
        const previousToken = this.getToken();

        this._clearExpiryMonitor();

        if (remote && previousToken && this.config.logoutEndpoint) {
            try {
                await this._request(
                    this.config.logoutEndpoint,
                    {
                        method: "POST",
                        token: previousToken
                    }
                );
            } catch (error) {
                console.warn(
                    "[AuthService] Remote logout failed; clearing local session.",
                    error
                );
            }
        }

        await this._clearSessionStorage();
        this._clearRuntimeState();

        eventBus.emit("auth:loggedOut", {
            previousUser,
            reason
        });

        eventBus.emit("auth:stateChanged", {
            authenticated: false,
            user: null,
            rememberMe: false
        });

        return {
            authenticated: false,
            loggedOut: true
        };
    }

    isAuthenticated() {
        if (!this.authenticated) return false;

        if (this.expiresAt && this._isExpired(this.expiresAt)) {
            this._expireSessionSync();
            return false;
        }

        return Boolean(this.token && this.user);
    }

    getCurrentUser() {
        return this.user ? { ...this.user } : null;
    }

    getUser() {
        return this.getCurrentUser();
    }

    getToken() {
        return this.token;
    }

    getRefreshToken() {
        return this.refreshToken;
    }

    getSession() {
        return this.session ? { ...this.session } : null;
    }

    getRememberMe() {
        return Boolean(this.rememberMe);
    }

    getExpiresAt() {
        return this.expiresAt;
    }

    isSessionExpired() {
        return this.expiresAt ? this._isExpired(this.expiresAt) : false;
    }

    async requireAuthentication() {
        await this.initialise();

        if (this.isAuthenticated()) {
            return {
                allowed: true,
                authenticated: true,
                user: this.getCurrentUser()
            };
        }

        return {
            allowed: false,
            authenticated: false,
            user: null
        };
    }

    async refreshSession() {
        await this.initialise();

        if (this.refreshing) return this.refreshing;

        if (!this.refreshToken) {
            return {
                authenticated: this.isAuthenticated(),
                user: this.getCurrentUser(),
                token: this.getToken(),
                expiresAt: this.expiresAt
            };
        }

        this.refreshing = this._performSessionRefresh();

        try {
            return await this.refreshing;
        } finally {
            this.refreshing = null;
        }
    }

    async _performSessionRefresh() {
        const refreshToken = this.refreshToken;

        if (!refreshToken) {
            return { authenticated: false };
        }

        try {
            const response = await this._request(
                this.config.refreshEndpoint,
                {
                    method: "POST",
                    body: {
                        refresh_token: refreshToken
                    }
                }
            );

            const normalised = this._normaliseSupabaseSession(response);

            if (!normalised.authenticated || !normalised.token || !normalised.user) {
                await this._expireSession("invalid_refresh_response");
                return { authenticated: false };
            }

            await this._establishSession(
                normalised,
                this.rememberMe
            );

            eventBus.emit("auth:sessionRefreshed", {
                user: this.getCurrentUser(),
                expiresAt: this.expiresAt
            });

            return {
                authenticated: true,
                user: this.getCurrentUser(),
                token: this.getToken(),
                expiresAt: this.expiresAt
            };
        } catch (error) {
            if (error?.code === "HTTP_401" || error?.code === "HTTP_403") {
                await this._expireSession("refresh_rejected");
                return { authenticated: false };
            }

            throw error;
        }
    }

    async _restoreSession() {
        let session = await storage.getSession(
            STORAGE_KEYS.AUTH_SESSION,
            null
        );

        let rememberMe = false;

        if (!session) {
            session = await storage.get(
                STORAGE_KEYS.AUTH_SESSION,
                null
            );
            rememberMe = Boolean(session);
        }

        if (!session) return false;

        const normalised = this._normaliseStoredSession(
            session,
            rememberMe
        );

        this.user = normalised.user;
        this.token = normalised.token;
        this.refreshToken = normalised.refreshToken;
        this.expiresAt = normalised.expiresAt;
        this.rememberMe = normalised.rememberMe;

        if (!this.token || !this.user) {
            await this._removeStoredSession(this.rememberMe);
            this._clearRuntimeState();
            return false;
        }

        if (this.expiresAt && this._isExpired(this.expiresAt)) {
            if (this.refreshToken) {
                try {
                    const refreshed = await this._performSessionRefresh();
                    if (refreshed?.authenticated) return true;
                } catch {
                    /* Clear the invalid session below. */
                }
            }

            await this._removeStoredSession(this.rememberMe);
            this._clearRuntimeState();

            eventBus.emit("auth:sessionExpired", {
                reason: "expired_before_restore"
            });

            return false;
        }

        this.authenticated = true;
        this.session = {
            authenticated: true,
            user: this.user,
            token: this.token,
            refreshToken: this.refreshToken,
            expiresAt: this.expiresAt,
            rememberMe: this.rememberMe
        };

        return true;
    }

    async _establishSession(authentication, rememberMe) {
        const expiresAt =
            authentication.expiresAt ||
            this._calculateExpiry(
                authentication.expiresIn,
                rememberMe
            );

        const session = {
            authenticated: true,
            user: authentication.user,
            token: authentication.token,
            refreshToken: authentication.refreshToken || null,
            expiresAt,
            rememberMe: Boolean(rememberMe)
        };

        this.authenticated = true;
        this.user = authentication.user;
        this.token = authentication.token;
        this.refreshToken = authentication.refreshToken || null;
        this.expiresAt = expiresAt;
        this.rememberMe = Boolean(rememberMe);
        this.session = session;

        await this._clearSessionStorage();

        const setter = rememberMe
            ? storage.set.bind(storage)
            : storage.setSession.bind(storage);

        await setter(STORAGE_KEYS.AUTH_SESSION, session);
        await setter(STORAGE_KEYS.AUTH_USER, authentication.user);
        await setter(STORAGE_KEYS.AUTH_TOKEN, authentication.token);
        await setter(STORAGE_KEYS.AUTH_REFRESH_TOKEN, this.refreshToken);
        await setter(STORAGE_KEYS.AUTH_EXPIRES_AT, expiresAt);
        await setter(STORAGE_KEYS.AUTH_REMEMBER_ME, Boolean(rememberMe));

        this._startExpiryMonitor();

        eventBus.emit("auth:stateChanged", {
            authenticated: true,
            user: this.getCurrentUser(),
            rememberMe: this.rememberMe,
            expiresAt: this.expiresAt
        });
    }

    async _clearSessionStorage() {
        for (const key of Object.values(STORAGE_KEYS)) {
            await storage.removeSession(key);
            await storage.remove(key);
        }
    }

    async _removeStoredSession(rememberMe) {
        const remover = rememberMe
            ? storage.remove.bind(storage)
            : storage.removeSession.bind(storage);

        for (const key of Object.values(STORAGE_KEYS)) {
            await remover(key);
        }
    }

    _startExpiryMonitor() {
        this._clearExpiryMonitor();

        if (!this.expiresAt) return;

        const expiresAt = new Date(this.expiresAt).getTime();

        if (Number.isNaN(expiresAt)) return;

        const refreshBeforeExpiry = Math.max(
            Number(this.config.refreshBeforeExpiry) || 0,
            0
        );

        const delay = Math.max(
            expiresAt - Date.now() - refreshBeforeExpiry,
            1000
        );

        this.refreshTimer = setTimeout(
            () => this._handleSessionExpiry(),
            delay
        );
    }

    _clearExpiryMonitor() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }

        this.refreshTimer = null;
    }

    async _handleSessionExpiry() {
        this.refreshTimer = null;

        if (!this.authenticated && !this.refreshToken) return;

        if (this.refreshToken) {
            try {
                const refreshed = await this.refreshSession();
                if (refreshed?.authenticated) return;
            } catch (error) {
                console.warn(
                    "[AuthService] Session refresh failed:",
                    error
                );
            }
        }

        await this._expireSession("expired");
    }

    async _expireSession(reason) {
        const previousUser = this.getCurrentUser();

        this._clearExpiryMonitor();
        await this._clearSessionStorage();
        this._clearRuntimeState();

        eventBus.emit("auth:sessionExpired", {
            previousUser,
            reason
        });

        eventBus.emit("auth:stateChanged", {
            authenticated: false,
            user: null,
            rememberMe: false
        });

        return { authenticated: false };
    }

    _expireSessionSync() {
        this._clearExpiryMonitor();
        this._clearRuntimeState();

        this._clearSessionStorage().catch(error => {
            console.warn(
                "[AuthService] Expired-session cleanup failed:",
                error
            );
        });

        eventBus.emit("auth:sessionExpired", {
            reason: "expired"
        });

        eventBus.emit("auth:stateChanged", {
            authenticated: false,
            user: null,
            rememberMe: false
        });
    }

    _clearRuntimeState() {
        this.authenticated = false;
        this.user = null;
        this.token = null;
        this.refreshToken = null;
        this.expiresAt = null;
        this.rememberMe = false;
        this.session = null;
    }

    _calculateExpiry(expiresIn, rememberMe) {
        const seconds = Number(expiresIn);

        const duration =
            Number.isFinite(seconds) && seconds > 0
                ? seconds * 1000
                : rememberMe
                    ? this.config.rememberMeDuration
                    : this.config.sessionDuration;

        return new Date(Date.now() + duration).toISOString();
    }

    _isExpired(expiresAt) {
        const timestamp = new Date(expiresAt).getTime();
        return !Number.isNaN(timestamp) && timestamp <= Date.now();
    }

    _normaliseSupabaseSession(response) {
        const data =
            response?.data ||
            response?.result ||
            response ||
            {};

        const token =
            data.access_token ||
            data.accessToken ||
            data.token ||
            null;

        const refreshToken =
            data.refresh_token ||
            data.refreshToken ||
            null;

        const user =
            data.user ||
            data.account ||
            data.profile ||
            null;

        let expiresAt =
            data.expiresAt ||
            data.expires_at ||
            null;

        if (data.expires_at && Number.isFinite(Number(data.expires_at))) {
            expiresAt = new Date(
                Number(data.expires_at) * 1000
            ).toISOString();
        }

        return {
            authenticated: Boolean(token && user),
            token,
            refreshToken,
            user: user ? this._sanitiseUser(user) : null,
            expiresAt,
            expiresIn: data.expires_in || null
        };
    }

    _normaliseStoredSession(session, rememberMe) {
        const token =
            session?.token ||
            session?.accessToken ||
            session?.access_token ||
            null;

        const refreshToken =
            session?.refreshToken ||
            session?.refresh_token ||
            null;

        const user =
            session?.user ||
            session?.account ||
            session?.profile ||
            null;

        const expiresAt =
            session?.expiresAt ||
            session?.expires_at ||
            null;

        return {
            token,
            refreshToken,
            user: user ? this._sanitiseUser(user) : null,
            expiresAt,
            rememberMe: Boolean(
                session?.rememberMe ?? rememberMe
            )
        };
    }

    _sanitiseUser(user) {
        if (!user || typeof user !== "object") return null;

        const {
            password,
            passwordHash,
            password_hash,
            secret,
            clientSecret,
            client_secret,
            ...safeUser
        } = user;

        return { ...safeUser };
    }

    _sanitiseMetadata(metadata) {
        if (!metadata || typeof metadata !== "object") return {};

        const safe = {};

        for (const [key, value] of Object.entries(metadata)) {
            if (!/^[a-zA-Z0-9_\-]{1,64}$/.test(key)) continue;
            if (value === null || value === undefined) continue;
            if (["password", "passwordHash", "password_hash", "secret", "clientSecret", "client_secret"].includes(key)) continue;

            if (["string", "number", "boolean"].includes(typeof value)) {
                safe[key] = value;
            }
        }

        return safe;
    }

    _getEmailRedirectUrl(explicitUrl) {
        if (explicitUrl && this._isSafeRedirectUrl(explicitUrl)) {
            return explicitUrl;
        }

        if (typeof window === "undefined") return null;

        return `${window.location.origin}/app/auth/login.html`;
    }

    _isSafeRedirectUrl(url) {
        if (!url) return false;

        try {
            const parsed = new URL(
                url,
                typeof window !== "undefined"
                    ? window.location.origin
                    : "http://localhost"
            );

            if (typeof window !== "undefined") {
                return parsed.origin === window.location.origin &&
                    parsed.protocol === window.location.protocol;
            }

            return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
            return false;
        }
    }

    _isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    async _request(endpoint, {
        method = "GET",
        body = null,
        token = null
    } = {}) {
        if (typeof fetch !== "function") {
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

        if (!this.config.publishableKey) {
            throw this._createAuthError(
                "AUTH_CONFIG_MISSING",
                "Supabase publishable key has not been configured."
            );
        }

        const controller =
            typeof AbortController !== "undefined"
                ? new AbortController()
                : null;

        let timeoutId = null;

        if (controller) {
            timeoutId = setTimeout(
                () => controller.abort(),
                this.config.requestTimeout
            );
        }

        /*
         * Supabase requires the publishable/anon key in `apikey`.
         * Authentication requests additionally use the access token
         * as the Authorization bearer when one exists.
         */
        const headers = {
            Accept: "application/json",
            apikey: this.config.publishableKey,
            Authorization: `Bearer ${token || this.config.publishableKey}`
        };

        if (body !== null) {
            headers["Content-Type"] = "application/json";
        }

        try {
            const response = await fetch(endpoint, {
                method,
                headers,
                credentials: this.config.credentials,
                body: body !== null ? JSON.stringify(body) : undefined,
                signal: controller?.signal
            });

            const raw = await response.text();
            let data = null;

            if (raw) {
                try {
                    data = JSON.parse(raw);
                } catch {
                    data = raw;
                }
            }

            if (!response.ok) {
                throw this._createHttpError(response, data);
            }

            return data;
        } catch (error) {
            if (error?.name === "AbortError") {
                throw this._createAuthError(
                    "REQUEST_TIMEOUT",
                    "The authentication request timed out."
                );
            }

            if (error?.code) throw error;

            throw this._createAuthError(
                "NETWORK_ERROR",
                error?.message ||
                    "Unable to connect to the authentication server."
            );
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
        }
    }

    _createHttpError(response, data) {
        const status = response?.status;
        let code = `HTTP_${status}`;

        if (status === 401) code = "HTTP_401";
        if (status === 403) code = "HTTP_403";

        const serverMessage =
            data?.msg ||
            data?.message ||
            data?.error_description ||
            data?.error ||
            data?.detail ||
            null;

        const error = new Error(
            serverMessage ||
                `Authentication request failed with HTTP ${status}.`
        );

        error.code = code;
        error.status = status;
        error.response = data;

        return error;
    }

    _createAuthError(code, message) {
        const error = new Error(message);
        error.code = code;
        return error;
    }

    _normaliseError(error) {
        if (error && typeof error === "object" && error.code) {
            return error;
        }

        const normalised = new Error(
            error?.message || "Authentication failed."
        );

        normalised.code = "AUTHENTICATION_FAILED";
        normalised.originalError = error;

        return normalised;
    }

    getStatus() {
        return {
            initialised: this.initialised,
            authenticated: this.isAuthenticated(),
            user: this.getCurrentUser(),
            hasToken: Boolean(this.token),
            hasRefreshToken: Boolean(this.refreshToken),
            rememberMe: this.rememberMe,
            expiresAt: this.expiresAt
        };
    }

    destroy() {
        this._clearExpiryMonitor();
        this.refreshing = null;
        this._clearRuntimeState();
        this.initialised = false;
        this.initialising = null;
        this.destroyed = true;
        return this;
    }

    reset() {
        this._clearExpiryMonitor();
        this.refreshing = null;
        this._clearRuntimeState();
        this.initialised = false;
        this.initialising = null;
        this.destroyed = false;
        this.config = { ...DEFAULT_CONFIG };
        return this;
    }
}

export const auth = new AuthService();

export {
    AuthService,
    STORAGE_KEYS
};

export default auth;
