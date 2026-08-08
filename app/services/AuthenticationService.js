/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * ============================================================
 *
 * FILE
 * AuthenticationService.js
 *
 * FILE ID
 * SER-010
 *
 * LOCATION
 * app/services/AuthenticationService.js
 *
 * LAYER
 * Application / Service
 *
 * RESPONSIBILITY
 * Central authentication, session and access-control service.
 *
 * ============================================================
 *
 * ARCHITECTURE
 *
 * UI
 *  ↓
 * AuthenticationService
 *  ↓
 * Authentication Provider
 *  ↓
 * Session
 *  ↓
 * Permission / Role Resolution
 *  ↓
 * Application
 *
 * ============================================================
 *
 * EXISTING RELATED FILES
 *
 * app/client/login.html
 * app/config/security.config.js
 * app/config/settings.js
 * app/config/environment.js
 * app/core/state.js
 * app/core/storage.js
 * app/js/api.js
 * app/js/storage.js
 *
 * ============================================================
 *
 * IMPORTANT SECURITY RULE
 *
 * This class is an application service.
 *
 * It is NOT intended to contain:
 *
 * - passwords
 * - hard-coded credentials
 * - secret API keys
 * - private tokens
 * - service-role credentials
 *
 * Authentication secrets must eventually be handled by the
 * configured authentication provider/backend.
 *
 * ============================================================
 */


/*=============================================================
    OPTIONAL CONFIGURATION
=============================================================*/

let securityConfig = null;

try {

    /*
     *=========================================================
     * FUTURE INSERT
     *
     * SECURITY CONFIGURATION
     *
     * This can later be replaced with a central validated
     * configuration provider.
     *
     * Current target:
     *
     * app/config/security.config.js
     *=========================================================
     */

    securityConfig =
        null;

} catch (error) {

    securityConfig =
        null;

}


/*=============================================================
    AUTHENTICATION SERVICE
=============================================================*/

export default class AuthenticationService {


    /*=========================================================
        SER-AUTH-001
        Constructor
    =========================================================*/

    constructor({

        provider = null,

        storage = null,

        state = null,

        logger = null,

        notificationService = null,

        security = null

    } = {}) {


        this.provider =
            provider;


        this.storage =
            storage;


        this.state =
            state;


        this.logger =
            logger;


        this.notificationService =
            notificationService;


        this.security =
            security ||
            securityConfig;


        /*=====================================================
            SESSION STATE
        =====================================================*/

        this.session =
            null;


        this.user =
            null;


        this.authenticated =
            false;


        /*
         *=====================================================
         * FUTURE INSERT
         *
         * AUTHENTICATION PROVIDER
         *
         * Production implementation may connect to:
         *
         * Supabase Auth
         * OAuth
         * SSO
         * Enterprise Identity Provider
         *
         * The provider should expose methods such as:
         *
         * signIn()
         * signOut()
         * getSession()
         * refreshSession()
         * resetPassword()
         * updatePassword()
         *=====================================================
         */


        /*
         *=====================================================
         * FUTURE INSERT
         *
         * SESSION TIMEOUT CONFIGURATION
         *
         * Future security configuration:
         *
         * idleTimeout
         * absoluteTimeout
         * refreshInterval
         * warningInterval
         *
         *=====================================================
         */

    }


    /*=========================================================
        SER-AUTH-002
        Login
    =========================================================*/

    async login({

        identifier,

        password,

        remember = false

    } = {}) {


        if (!identifier) {

            throw new Error(
                "Login identifier is required."
            );

        }


        if (!password) {

            throw new Error(
                "Password is required."
            );

        }


        /*
         *=====================================================
         * SECURITY
         *
         * Never store the raw password.
         *
         * Never log the raw password.
         *=====================================================
         */


        if (
            !this.provider ||
            typeof this.provider.signIn !==
            "function"
        ) {

            throw new Error(
                "Authentication provider is not configured."
            );

        }


        const result =
            await this.provider.signIn({

                identifier,

                password,

                remember

            });


        this.session =
            result?.session ||
            null;


        this.user =
            result?.user ||
            null;


        this.authenticated =
            Boolean(
                this.user &&
                this.session
            );


        await this.persistSession();


        await this.updateApplicationState();


        /*
         *=====================================================
         * FUTURE INSERT
         *
         * LOGIN AUDIT EVENT
         *
         * Record:
         *
         * user
         * timestamp
         * authentication method
         * device/session identifier
         * success/failure
         *
         * Do NOT record passwords.
         *=====================================================
         */


        return {

            authenticated:
                this.authenticated,

            user:
                this.user,

            session:
                this.session

        };

    }


    /*=========================================================
        SER-AUTH-003
        Logout
    =========================================================*/

    async logout() {


        /*
         *=====================================================
         * PROVIDER LOGOUT
         *=====================================================
         */

        if (
            this.provider &&
            typeof this.provider.signOut ===
            "function"
        ) {

            await this.provider.signOut();

        }


        const previousUser =
            this.user;


        this.session =
            null;


        this.user =
            null;


        this.authenticated =
            false;


        await this.clearPersistedSession();


        await this.updateApplicationState();


        /*
         *=====================================================
         * FUTURE INSERT
         *
         * LOGOUT AUDIT EVENT
         *=====================================================
         */


        return {

            authenticated:
                false,

            user:
                previousUser

        };

    }


    /*=========================================================
        SER-AUTH-004
        Restore Session
    =========================================================*/

    async restoreSession() {


        /*
         *=====================================================
         * PROVIDER SESSION
         *=====================================================
         */

        if (
            this.provider &&
            typeof this.provider.getSession ===
            "function"
        ) {

            const result =
                await this.provider.getSession();


            if (
                result?.session
            ) {

                this.session =
                    result.session;

                this.user =
                    result.user ||
                    null;

                this.authenticated =
                    Boolean(
                        this.user &&
                        this.session
                    );


                await this.updateApplicationState();


                return {

                    authenticated:
                        this.authenticated,

                    user:
                        this.user,

                    session:
                        this.session

                };

            }

        }


        /*
         *=====================================================
         * LOCAL SESSION FALLBACK
         *=====================================================
         *
         * This is only a temporary application-level fallback.
         *
         * A production authentication provider should become
         * authoritative.
         *=====================================================
         */

        const stored =
            await this.getPersistedSession();


        if (
            stored
        ) {

            this.session =
                stored.session ||
                null;

            this.user =
                stored.user ||
                null;

            this.authenticated =
                Boolean(
                    this.user &&
                    this.session
                );

        }


        await this.updateApplicationState();


        return {

            authenticated:
                this.authenticated,

            user:
                this.user,

            session:
                this.session

        };

    }


    /*=========================================================
        SER-AUTH-005
        Refresh Session
    =========================================================*/

    async refreshSession() {


        if (
            !this.provider ||
            typeof this.provider.refreshSession !==
            "function"
        ) {

            return {

                refreshed:
                    false,

                session:
                    this.session

            };

        }


        const result =
            await this.provider.refreshSession(
                this.session
            );


        if (
            result?.session
        ) {

            this.session =
                result.session;

        }


        if (
            result?.user
        ) {

            this.user =
                result.user;

        }


        this.authenticated =
            Boolean(
                this.user &&
                this.session
            );


        await this.persistSession();


        await this.updateApplicationState();


        return {

            refreshed:
                true,

            authenticated:
                this.authenticated,

            user:
                this.user,

            session:
                this.session

        };

    }


    /*=========================================================
        SER-AUTH-006
        Get Current User
    =========================================================*/

    getCurrentUser() {

        return this.user;

    }


    /*=========================================================
        SER-AUTH-007
        Get Current Session
    =========================================================*/

    getSession() {

        return this.session;

    }


    /*=========================================================
        SER-AUTH-008
        Is Authenticated
    =========================================================*/

    isAuthenticated() {

        return this.authenticated;

    }


    /*=========================================================
        SER-AUTH-009
        Require Authentication
    =========================================================*/

    requireAuthentication() {


        if (
            !this.authenticated
        ) {

            throw new Error(
                "Authentication required."
            );

        }


        return true;

    }


    /*=========================================================
        SER-AUTH-010
        Get User ID
    =========================================================*/

    getUserId() {


        if (
            !this.user
        ) {

            return null;

        }


        return (

            this.user.id ||

            this.user.userId ||

            this.user.uuid ||

            null

        );

    }


    /*=========================================================
        SER-AUTH-011
        Get User Role
    =========================================================*/

    getUserRole() {


        if (
            !this.user
        ) {

            return null;

        }


        return (

            this.user.role ||

            this.user.userRole ||

            this.user.metadata?.role ||

            null

        );

    }


    /*=========================================================
        SER-AUTH-012
        Get User Roles
    =========================================================*/

    getUserRoles() {


        if (
            !this.user
        ) {

            return [];

        }


        if (
            Array.isArray(
                this.user.roles
            )
        ) {

            return [
                ...this.user.roles
            ];

        }


        const role =
            this.getUserRole();


        return role
            ? [role]
            : [];

    }


    /*=========================================================
        SER-AUTH-013
        Has Role
    =========================================================*/

    hasRole(
        role
    ) {


        if (!role) {

            return false;

        }


        const roles =
            this.getUserRoles();


        return roles.some(
            userRole =>
                String(
                    userRole
                ).toLowerCase() ===
                String(
                    role
                ).toLowerCase()
        );

    }


    /*=========================================================
        SER-AUTH-014
        Has Any Role
    =========================================================*/

    hasAnyRole(
        roles = []
    ) {


        if (
            !Array.isArray(
                roles
            )
        ) {

            return false;

        }


        return roles.some(
            role =>
                this.hasRole(
                    role
                )
        );

    }


    /*=========================================================
        SER-AUTH-015
        Has All Roles
    =========================================================*/

    hasAllRoles(
        roles = []
    ) {


        if (
            !Array.isArray(
                roles
            )
        ) {

            return false;

        }


        return roles.every(
            role =>
                this.hasRole(
                    role
                )
        );

    }


    /*=========================================================
        SER-AUTH-016
        Get User Permissions
    =========================================================*/

    getUserPermissions() {


        if (
            !this.user
        ) {

            return [];

        }


        if (
            Array.isArray(
                this.user.permissions
            )
        ) {

            return [
                ...this.user.permissions
            ];

        }


        if (
            Array.isArray(
                this.user.metadata?.permissions
            )
        ) {

            return [
                ...this.user.metadata.permissions
            ];

        }


        return [];

    }


    /*=========================================================
        SER-AUTH-017
        Has Permission
    =========================================================*/

    hasPermission(
        permission
    ) {


        if (
            !permission
        ) {

            return false;

        }


        const permissions =
            this.getUserPermissions();


        return permissions.some(
            userPermission =>
                String(
                    userPermission
                ).toLowerCase() ===
                String(
                    permission
                ).toLowerCase()
        );

    }


    /*=========================================================
        SER-AUTH-018
        Has Any Permission
    =========================================================*/

    hasAnyPermission(
        permissions = []
    ) {


        if (
            !Array.isArray(
                permissions
            )
        ) {

            return false;

        }


        return permissions.some(
            permission =>
                this.hasPermission(
                    permission
                )
        );

    }


    /*=========================================================
        SER-AUTH-019
        Has All Permissions
    =========================================================*/

    hasAllPermissions(
        permissions = []
    ) {


        if (
            !Array.isArray(
                permissions
            )
        ) {

            return false;

        }


        return permissions.every(
            permission =>
                this.hasPermission(
                    permission
                )
        );

    }


    /*=========================================================
        SER-AUTH-020
        Authorise
    =========================================================*/

    authorize({

        role = null,

        roles = [],

        permission = null,

        permissions = [],

        requireAll = false

    } = {}) {


        this.requireAuthentication();


        let roleAllowed =
            true;


        let permissionAllowed =
            true;


        if (
            role
        ) {

            roleAllowed =
                this.hasRole(
                    role
                );

        }


        if (
            Array.isArray(
                roles
            ) &&
            roles.length
        ) {

            roleAllowed =
                requireAll
                    ? this.hasAllRoles(
                        roles
                    )
                    : this.hasAnyRole(
                        roles
                    );

        }


        if (
            permission
        ) {

            permissionAllowed =
                this.hasPermission(
                    permission
                );

        }


        if (
            Array.isArray(
                permissions
            ) &&
            permissions.length
        ) {

            permissionAllowed =
                requireAll
                    ? this.hasAllPermissions(
                        permissions
                    )
                    : this.hasAnyPermission(
                        permissions
                    );

        }


        return (
            roleAllowed &&
            permissionAllowed
        );

    }


    /*=========================================================
        SER-AUTH-021
        Require Authorisation
    =========================================================*/

    requireAuthorization(
        options = {}
    ) {


        const allowed =
            this.authorize(
                options
            );


        if (
            !allowed
        ) {

            throw new Error(
                "Authorisation denied."
            );

        }


        return true;

    }


    /*=========================================================
        SER-AUTH-022
        Persist Session
    =========================================================*/

    async persistSession() {


        if (
            !this.authenticated
        ) {

            return;

        }


        const data = {

            user:
                this.user,

            session:
                this.session

        };


        /*
         *=====================================================
         * STORAGE PRIORITY
         *
         * Application storage abstraction first.
         *=====================================================
         */

        if (
            this.storage &&
            typeof this.storage.set ===
            "function"
        ) {

            await this.storage.set(
                "auth.session",
                data
            );


            return;

        }


        /*
         *=====================================================
         * FUTURE INSERT
         *
         * SECURE SESSION STORAGE
         *
         * Depending on the authentication provider,
         * localStorage should eventually NOT be the authority
         * for sensitive authentication state.
         *
         * Prefer:
         *
         * HttpOnly cookies
         * Secure cookies
         * Provider-managed sessions
         * Server-side session state
         *=====================================================
         */

    }


    /*=========================================================
        SER-AUTH-023
        Get Persisted Session
    =========================================================*/

    async getPersistedSession() {


        if (
            this.storage &&
            typeof this.storage.get ===
            "function"
        ) {

            return this.storage.get(
                "auth.session"
            );

        }


        return null;

    }


    /*=========================================================
        SER-AUTH-024
        Clear Persisted Session
    =========================================================*/

    async clearPersistedSession() {


        if (
            this.storage &&
            typeof this.storage.remove ===
            "function"
        ) {

            await this.storage.remove(
                "auth.session"
            );

        }

    }


    /*=========================================================
        SER-AUTH-025
        Update Application State
    =========================================================*/

    async updateApplicationState() {


        if (
            !this.state
        ) {

            return;

        }


        /*
         *=====================================================
         * FUTURE INSERT
         *
         * CENTRAL STATE CONTRACT
         *
         * Expected future state:
         *
         * state.authenticated
         * state.user
         * state.session
         * state.role
         * state.permissions
         *=====================================================
         */


        if (
            typeof this.state.set ===
            "function"
        ) {

            this.state.set(
                "auth",
                {

                    authenticated:
                        this.authenticated,

                    user:
                        this.user,

                    session:
                        this.session

                }
            );

        }

    }


    /*=========================================================
        SER-AUTH-026
        Password Reset
    =========================================================*/

    async requestPasswordReset(
        identifier
    ) {


        if (!identifier) {

            throw new Error(
                "Identifier is required."
            );

        }


        if (
            !this.provider ||
            typeof this.provider.requestPasswordReset !==
            "function"
        ) {

            throw new Error(
                "Password reset provider is not configured."
            );

        }


        return this.provider.requestPasswordReset(
            identifier
        );

    }


    /*=========================================================
        SER-AUTH-027
        Change Password
    =========================================================*/

    async changePassword({

        currentPassword,

        newPassword

    } = {}) {


        this.requireAuthentication();


        if (!newPassword) {

            throw new Error(
                "New password is required."
            );

        }


        /*
         *=====================================================
         * FUTURE INSERT
         *
         * PASSWORD POLICY
         *
         * Validate:
         *
         * Minimum length
         * Complexity
         * Password history
         * Breached-password checks
         * MFA requirements
         *=====================================================
         */


        if (
            !this.provider ||
            typeof this.provider.changePassword !==
            "function"
        ) {

            throw new Error(
                "Password change provider is not configured."
            );

        }


        return this.provider.changePassword({

            currentPassword,

            newPassword

        });

    }


    /*=========================================================
        SER-AUTH-028
        MFA Status
    =========================================================*/

    async getMFAStatus() {


        this.requireAuthentication();


        /*
         *=====================================================
         * FUTURE INSERT
         *
         * MULTI-FACTOR AUTHENTICATION
         *
         * Support:
         *
         * TOTP
         * SMS
         * Email
         * Authenticator application
         * Security keys
         *
         *=====================================================
         */


        if (
            this.provider &&
            typeof this.provider.getMFAStatus ===
            "function"
        ) {

            return this.provider.getMFAStatus(
                this.getUserId()
            );

        }


        return {

            enabled:
                false,

            configured:
                false

        };

    }


    /*=========================================================
        SER-AUTH-029
        Session Validation
    =========================================================*/

    async validateSession() {


        if (
            !this.authenticated
        ) {

            return false;

        }


        /*
         *=====================================================
         * FUTURE INSERT
         *
         * SERVER-SIDE SESSION VALIDATION
         *
         * The provider should verify that the session remains
         * valid and has not expired or been revoked.
         *=====================================================
         */


        if (
            this.provider &&
            typeof this.provider.validateSession ===
            "function"
        ) {

            const valid =
                await this.provider.validateSession(
                    this.session
                );


            if (
                !valid
            ) {

                await this.logout();


                return false;

            }

        }


        return true;

    }


    /*=========================================================
        SER-AUTH-030
        Session Timeout
    =========================================================*/

    async handleSessionTimeout() {


        /*
         *=====================================================
         * FUTURE INSERT
         *
         * IDLE SESSION MONITOR
         *
         * The platform will eventually monitor:
         *
         * last activity
         * mouse movement
         * keyboard activity
         * API activity
         * page activity
         *
         * and enforce the configured idle timeout.
         *=====================================================
         */


        await this.logout();


        return {

            timedOut:
                true,

            authenticated:
                false

        };

    }


    /*=========================================================
        SER-AUTH-031
        Security Event
    =========================================================*/

    async recordSecurityEvent({

        event,

        metadata = {}

    } = {}) {


        if (!event) {

            return null;

        }


        const record = {

            event,

            userId:
                this.getUserId(),

            timestamp:
                new Date(),

            metadata

        };


        /*
         *=====================================================
         * FUTURE INSERT
         *
         * SECURITY AUDIT LOG
         *
         * Events:
         *
         * LOGIN
         * LOGOUT
         * LOGIN_FAILED
         * PASSWORD_CHANGED
         * MFA_ENABLED
         * MFA_DISABLED
         * SESSION_EXPIRED
         * AUTHORISATION_DENIED
         * ACCOUNT_LOCKED
         *=====================================================
         */


        if (
            this.logger &&
            typeof this.logger.info ===
            "function"
        ) {

            this.logger.info(
                "Security event",
                record
            );

        }


        return record;

    }


    /*=========================================================
        SER-AUTH-032
        Authentication Health Check
    =========================================================*/

    async healthCheck() {


        let providerAvailable =
            false;


        if (
            this.provider
        ) {

            providerAvailable =
                typeof this.provider.signIn ===
                "function";

        }


        return {

            service:
                "AuthenticationService",

            healthy:
                true,

            authenticated:
                this.authenticated,

            providerConfigured:
                providerAvailable,

            userId:
                this.getUserId(),

            role:
                this.getUserRole(),

            timestamp:
                new Date()

        };

    }


    /*=========================================================
        SER-AUTH-033
        FUTURE MASTER AUTHENTICATION ENGINE
    =========================================================*/

    /*
     * ========================================================
     * FUTURE INSERT MAP
     * ========================================================
     *
     * AUTHENTICATION
     * --------------------------------------------------------
     *
     * login()
     * logout()
     * restoreSession()
     * refreshSession()
     * validateSession()
     *
     *
     * USER
     * --------------------------------------------------------
     *
     * getCurrentUser()
     * getUserId()
     * getUserRole()
     * getUserRoles()
     *
     *
     * PERMISSIONS
     * --------------------------------------------------------
     *
     * getUserPermissions()
     * hasPermission()
     * hasAnyPermission()
     * hasAllPermissions()
     *
     *
     * AUTHORISATION
     * --------------------------------------------------------
     *
     * authorize()
     * requireAuthorization()
     *
     *
     * PASSWORD
     * --------------------------------------------------------
     *
     * requestPasswordReset()
     * changePassword()
     *
     *
     * MFA
     * --------------------------------------------------------
     *
     * getMFAStatus()
     * enableMFA()
     * disableMFA()
     * verifyMFA()
     *
     *
     * SESSION
     * --------------------------------------------------------
     *
     * persistSession()
     * clearPersistedSession()
     * handleSessionTimeout()
     * revokeSession()
     *
     *
     * SECURITY
     * --------------------------------------------------------
     *
     * recordSecurityEvent()
     * getSecurityEvents()
     * detectSuspiciousLogin()
     * lockAccount()
     *
     *
     * FUTURE USER MANAGEMENT
     * --------------------------------------------------------
     *
     * createUser()
     * deactivateUser()
     * reactivateUser()
     * changeRole()
     * assignPermission()
     *
     *
     * ========================================================
     */

}
