/**
 * Isaacs and Partners
 * Login Controller
 *
 * Responsibilities:
 * - Control login form
 * - Validate credentials
 * - Handle Remember Me
 * - Call AuthService
 * - Display authentication messages
 * - Prevent duplicate submissions
 * - Redirect authenticated users safely
 */

import auth from "./AuthService.js";
import { ROUTES } from "../config/routes.js";


const DEFAULT_DASHBOARD =
    ROUTES.DASHBOARD;


class LoginController {
    constructor() {
        this.initialised = false;
        this.submitting = false;

        this.form = null;
        this.submitButton = null;
        this.errorElement = null;
        this.statusElement = null;

        this.handleSubmit =
            this.handleSubmit.bind(this);
    }


    async initialise(options = {}) {
        if (this.initialised) {
            return this;
        }

        if (
            typeof document ===
            "undefined"
        ) {
            return this;
        }

        this.form =
            this._resolveElement(
                options.formSelector ||
                "#loginForm"
            );

        this.submitButton =
            options.submitButton ||
            this._resolveElement(
                "#loginButton"
            );

        this.errorElement =
            this._resolveElement(
                options.errorSelector ||
                "#loginError"
            );

        this.statusElement =
            this._resolveElement(
                options.statusSelector ||
                "#loginStatus"
            );

        if (!this.form) {
            throw new Error(
                "Login form could not be found."
            );
        }

        await auth.initialise();

        /*
         * Restore an existing session before deciding
         * whether the login page should remain visible.
         */

        if (auth.isAuthenticated()) {
            this.redirectAuthenticatedUser();

            return this;
        }

        this.form.addEventListener(
            "submit",
            this.handleSubmit
        );

        this.initialised = true;

        this.setStatus(
            "Enter your credentials to continue."
        );

        return this;
    }


    async handleSubmit(event) {
        event.preventDefault();

        if (this.submitting) {
            return;
        }

        this.clearMessages();

        const formData =
            new FormData(this.form);

        const identifier =
            String(
                formData.get(
                    "identifier"
                ) || ""
            ).trim();

        const password =
            String(
                formData.get(
                    "password"
                ) || ""
            );

        const rememberMe =
            formData.get(
                "rememberMe"
            ) === "on";

        const validationError =
            this.validateCredentials(
                identifier,
                password
            );

        if (validationError) {
            this.showError(
                validationError
            );

            return;
        }

        this.submitting = true;

        this.setLoading(true);

        this.setStatus(
            "Signing you in..."
        );

        try {
            const result =
                await auth.login(
                    identifier,
                    password,
                    {
                        rememberMe
                    }
                );

            if (
                !result ||
                !result.authenticated
            ) {
                throw new Error(
                    "Authentication failed."
                );
            }

            this.setStatus(
                "Login successful. Redirecting..."
            );

            await this.delay(250);

            this.redirectAuthenticatedUser();

        } catch (error) {
            this.handleLoginError(error);

        } finally {
            this.submitting = false;

            this.setLoading(false);
        }
    }


    validateCredentials(
        identifier,
        password
    ) {
        if (!identifier) {
            return (
                "Please enter your email address or username."
            );
        }

        if (!password) {
            return (
                "Please enter your password."
            );
        }

        if (identifier.length > 254) {
            return (
                "The username or email address is too long."
            );
        }

        if (password.length > 256) {
            return (
                "The password is too long."
            );
        }

        return null;
    }


    handleLoginError(error) {
        console.error(
            "[LoginController] Login failed:",
            error
        );

        let message =
            "Unable to sign you in. Please check your credentials and try again.";

        switch (error?.code) {
            case "IDENTIFIER_REQUIRED":
                message =
                    "Please enter your username or email address.";
                break;

            case "PASSWORD_REQUIRED":
                message =
                    "Please enter your password.";
                break;

            case "HTTP_401":
            case "INVALID_CREDENTIALS":
            case "AUTHENTICATION_FAILED":
                message =
                    "The username or password is incorrect.";
                break;

            case "HTTP_403":
            case "ACCOUNT_DISABLED":
                message =
                    "Your account is not authorised to access this system.";
                break;

            case "NETWORK_ERROR":
                message =
                    "Unable to connect to the authentication server. Please check your connection.";
                break;

            case "REQUEST_TIMEOUT":
                message =
                    "The login request timed out. Please try again.";
                break;

            default:
                if (error?.message) {
                    message =
                        error.message;
                }
        }

        this.showError(message);
    }


    redirectAuthenticatedUser() {
        if (
            typeof window ===
            "undefined"
        ) {
            return;
        }

        const params =
            new URLSearchParams(
                window.location.search
            );

        /*
         * AuthGuard creates:
         *
         * ?returnUrl=/app/dashboard/
         */
        const returnUrl =
            params.get(
                "returnUrl"
            );

        if (
            returnUrl &&
            this.isSafeReturnUrl(
                returnUrl
            )
        ) {
            window.location.assign(
                returnUrl
            );

            return;
        }

        window.location.assign(
            DEFAULT_DASHBOARD
        );
    }


    isSafeReturnUrl(url) {
    if (
        !url ||
        typeof window === "undefined"
    ) {
        return false;
    }

    try {
        /*
         * Reject protocol-relative URLs immediately.
         */
        if (
            String(url).startsWith("//")
        ) {
            return false;
        }

        const parsed =
            new URL(
                url,
                window.location.origin
            );

        /*
         * Only same-origin URLs are permitted.
         */
        if (
            parsed.origin !==
            window.location.origin
        ) {
            return false;
        }

        /*
         * Only the current application protocol
         * is permitted.
         */
        if (
            parsed.protocol !==
            window.location.protocol
        ) {
            return false;
        }

        /*
         * Only relative application paths are accepted.
         */
        if (
            !parsed.pathname.startsWith("/")
        ) {
            return false;
        }

        /*
         * Never redirect back to the login page.
         */
        const loginPath =
            new URL(
                "/login.html",
                window.location.origin
            ).pathname;

        if (
            parsed.pathname ===
            loginPath
        ) {
            return false;
        }

        /*
         * Never redirect to an authentication API
         * endpoint.
         */
        if (
            parsed.pathname.startsWith(
                "/api/auth/"
            )
        ) {
            return false;
        }

        return true;

    } catch {
        return false;
    }
}


    showError(message) {
        if (!this.errorElement) {
            return;
        }

        this.errorElement.textContent =
            message || "";

        this.errorElement.hidden =
            !message;
    }


    setStatus(message) {
        if (!this.statusElement) {
            return;
        }

        this.statusElement.textContent =
            message || "";
    }


    clearMessages() {
        if (this.errorElement) {
            this.errorElement.textContent =
                "";

            this.errorElement.hidden =
                true;
        }

        if (this.statusElement) {
            this.statusElement.textContent =
                "";
        }
    }


    setLoading(isLoading) {
        if (!this.submitButton) {
            return;
        }

        const loading =
            Boolean(isLoading);

        this.submitButton.disabled =
            loading;

        this.submitButton.setAttribute(
            "aria-busy",
            String(loading)
        );

        if (loading) {
            this.submitButton.dataset
                .originalText =
                this.submitButton.textContent;

            this.submitButton.textContent =
                "Signing in...";
        } else {
            this.submitButton.textContent =
                this.submitButton.dataset
                    .originalText ||
                "Sign In";
        }
    }


    _resolveElement(
        selectorOrElement
    ) {
        if (!selectorOrElement) {
            return null;
        }

        if (
            typeof selectorOrElement ===
            "string"
        ) {
            return document.querySelector(
                selectorOrElement
            );
        }

        return selectorOrElement;
    }


    delay(milliseconds) {
        return new Promise(
            (resolve) => {
                setTimeout(
                    resolve,
                    milliseconds
                );
            }
        );
    }


    destroy() {
        if (this.form) {
            this.form.removeEventListener(
                "submit",
                this.handleSubmit
            );
        }

        this.form = null;
        this.submitButton = null;
        this.errorElement = null;
        this.statusElement = null;

        this.initialised = false;
        this.submitting = false;
    }
}


export const loginController =
    new LoginController();

export {
    LoginController
};

export default loginController;
