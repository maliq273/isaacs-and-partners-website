/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * AuthenticationService
 * ============================================================
 *
 * LOCATION
 * app/services/AuthenticationService.js
 *
 * PURPOSE
 * Central authentication/session application service.
 *
 * ============================================================
 */

export default class AuthenticationService {

    constructor({
        userRepository = null,
        storage = null,
        state = null,
        logger = null
    } = {}) {

        this.userRepository = userRepository;
        this.storage = storage;
        this.state = state;
        this.logger = logger;

        this.sessionKey =
            "isaacs_platform_session";

        /*
         * ====================================================
         * FUTURE INSERT
         * AUTH PROVIDERS
         *
         * Supabase
         * OAuth
         * Microsoft
         * Google
         * Internal authentication
         * ====================================================
         */

    }

    async login({
        username,
        password
    } = {}) {

        if (!username || !password) {
            throw new Error(
                "Username and password are required."
            );
        }

        let user = null;

        if (
            this.userRepository &&
            typeof this.userRepository.authenticate ===
            "function"
        ) {
            user =
                await this.userRepository.authenticate(
                    username,
                    password
                );
        }

        if (!user) {
            throw new Error(
                "Invalid username or password."
            );
        }

        const session =
            this.createSession(user);

        this.saveSession(session);

        return session;
    }

    createSession(user) {

        return {
            id:
                `SESSION-${Date.now()}`,

            userId:
                user.id,

            user,

            createdAt:
                new Date(),

            lastActivityAt:
                new Date(),

            active:
                true
        };
    }

    saveSession(session) {

        if (
            this.storage &&
            typeof this.storage.set === "function"
        ) {
            this.storage.set(
                this.sessionKey,
                session
            );
        }

        if (
            this.state &&
            typeof this.state.set === "function"
        ) {
            this.state.set(
                "session",
                session
            );
        }
    }

    getSession() {

        if (
            this.storage &&
            typeof this.storage.get === "function"
        ) {
            return this.storage.get(
                this.sessionKey
            );
        }

        return null;
    }

    isAuthenticated() {

        const session =
            this.getSession();

        return Boolean(
            session &&
            session.active
        );
    }

    async logout() {

        const session =
            this.getSession();

        if (session) {
            session.active = false;
            session.loggedOutAt =
                new Date();
        }

        if (
            this.storage &&
            typeof this.storage.remove ===
            "function"
        ) {
            this.storage.remove(
                this.sessionKey
            );
        }

        if (
            this.state &&
            typeof this.state.set === "function"
        ) {
            this.state.set(
                "session",
                null
            );
        }

        return true;
    }

    refreshActivity() {

        const session =
            this.getSession();

        if (!session) {
            return false;
        }

        session.lastActivityAt =
            new Date();

        this.saveSession(
            session
        );

        return true;
    }

    hasPermission(permission) {

        const session =
            this.getSession();

        if (!session || !session.user) {
            return false;
        }

        const permissions =
            session.user.permissions || [];

        return permissions.includes(
            permission
        );
    }

    /*
     * ========================================================
     * FUTURE INSERT
     * ROLE-BASED ACCESS CONTROL
     *
     * Roles
     * Permissions
     * Departments
     * Supervisor access
     * Attorney access
     * Administrator access
     * Client portal access
     * ========================================================
     */

    async healthCheck() {

        return {
            service:
                "AuthenticationService",

            healthy:
                true,

            authenticated:
                this.isAuthenticated(),

            timestamp:
                new Date()
        };
    }

}
