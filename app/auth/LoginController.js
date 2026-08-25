/**
 * Isaacs and Partners
 * Login Controller
 *
 * Authenticates the user and resolves the authoritative application role
 * before navigation. Dashboard routes are never used as an intermediate
 * destination.
 */

import auth from "./AuthService.js";
import navigation from "../core/navigation.js";
import { resolveUserDashboardRole } from "../dashboard/DashboardAccess.js";

class LoginController {
    constructor() {
        this.initialised = false;
        this.submitting = false;
        this.form = null;
        this.submitButton = null;
        this.errorElement = null;
        this.statusElement = null;
        this.selectedRole = null;
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    async initialise(options = {}) {
        if (this.initialised) return this;
        if (typeof document === "undefined") return this;

        this.form = this._resolveElement(options.formSelector || "#loginForm");
        this.submitButton = options.submitButton || this._resolveElement("#loginButton");
        this.errorElement = this._resolveElement(options.errorSelector || "#loginError");
        this.statusElement = this._resolveElement(options.statusSelector || "#loginStatus");

        if (!this.form) throw new Error("Login form could not be found.");

        await auth.initialise();

        if (auth.isAuthenticated()) {
            await this.redirectAuthenticatedUser();
            return this;
        }

        this.form.addEventListener("submit", this.handleSubmit);
        this.initialised = true;
        this.setStatus("Enter your email address and password to continue.");
        return this;
    }

    setRole(role) {
        this.selectedRole = String(role || "").trim().toLowerCase() || null;
    }

    async handleSubmit(event) {
        event.preventDefault();
        if (this.submitting) return;

        this.clearMessages();
        const formData = new FormData(this.form);
        const identifier = String(formData.get("identifier") || "").trim();
        const password = String(formData.get("password") || "");
        const rememberMe = formData.get("rememberMe") === "on";

        const validationError = this.validateCredentials(identifier, password);
        if (validationError) {
            this.showError(validationError);
            return;
        }

        this.submitting = true;
        this.setLoading(true);
        this.setStatus("Signing you in...");

        try {
            const result = await auth.login(identifier, password, { rememberMe });
            if (!result?.authenticated) throw new Error("Authentication failed.");

            this.setStatus("Login successful. Redirecting...");
            await this.delay(50);
            await this.redirectAuthenticatedUser();
        } catch (error) {
            this.handleLoginError(error);
        } finally {
            this.submitting = false;
            this.setLoading(false);
        }
    }

    validateCredentials(identifier, password) {
        if (!identifier) return "Please enter your email address.";
        if (!this._isValidEmail(identifier)) return "Please enter a valid email address.";
        if (!password) return "Please enter your password.";
        if (identifier.length > 254) return "The email address is too long.";
        if (password.length > 256) return "The password is too long.";
        return null;
    }

    handleLoginError(error) {
        console.error("[LoginController] Login failed:", error);
        let message = "Unable to sign you in. Please check your credentials and try again.";

        switch (error?.code) {
            case "IDENTIFIER_REQUIRED":
            case "EMAIL_INVALID":
                message = "Please enter a valid email address.";
                break;
            case "PASSWORD_REQUIRED":
                message = "Please enter your password.";
                break;
            case "HTTP_400":
            case "HTTP_401":
            case "INVALID_CREDENTIALS":
            case "AUTHENTICATION_FAILED":
                message = "The email address or password is incorrect.";
                break;
            case "HTTP_403":
            case "ACCOUNT_DISABLED":
                message = "Your account is not authorised to access this system.";
                break;
            case "NETWORK_ERROR":
                message = "Unable to connect to the authentication service. Please check your connection.";
                break;
            case "REQUEST_TIMEOUT":
                message = "The login request timed out. Please try again.";
                break;
            default:
                if (error?.message) message = error.message;
        }

        this.showError(message);
    }

    async redirectAuthenticatedUser() {
        if (typeof window === "undefined") return;

        const user = auth.getCurrentUser();
        const role = await resolveUserDashboardRole(user);

        if (!role) {
            throw new Error("Your account role could not be determined. Please contact Isaacs and Partners.");
        }

        /*
         * A returnUrl is only honoured when it is NOT one of the application's
         * dashboard entry points. This prevents the old chain:
         * login -> /app/dashboard/ -> role dashboard.
         */
        const params = new URLSearchParams(window.location.search);
        const returnUrl = params.get("returnUrl");

        if (returnUrl && this.isSafeReturnUrl(returnUrl) && !this.isDashboardPath(returnUrl)) {
            window.location.replace(returnUrl);
            return;
        }

        navigation.toRoleDashboard(role, { replace: true });
    }

    isDashboardPath(url) {
        try {
            const parsed = new URL(url, window.location.origin);
            const pathname = parsed.pathname.replace(/\/+$/, "") || "/";
            const dashboardPaths = new Set([
                "/app/dashboard",
                "/app/dashboard/index.html",
                "/app/dashboard/client.html",
                "/app/dashboard/business.html",
                "/app/dashboard/staff.html",
                "/app/dashboard/super-admin.html"
            ]);
            return dashboardPaths.has(pathname);
        } catch {
            return false;
        }
    }

    isSafeReturnUrl(url) {
        if (!url || typeof window === "undefined") return false;

        try {
            if (String(url).startsWith("//")) return false;
            const parsed = new URL(url, window.location.origin);
            if (parsed.origin !== window.location.origin) return false;
            if (parsed.protocol !== window.location.protocol) return false;
            if (!parsed.pathname.startsWith("/")) return false;

            const loginPath = new URL(navigation.getLoginRoute(), window.location.origin).pathname;
            if (parsed.pathname === loginPath) return false;
            if (parsed.pathname.startsWith("/api/auth/")) return false;
            return true;
        } catch {
            return false;
        }
    }

    showError(message) {
        if (!this.errorElement) return;
        this.errorElement.textContent = message || "";
        this.errorElement.hidden = !message;
    }

    setStatus(message) {
        if (this.statusElement) this.statusElement.textContent = message || "";
    }

    clearMessages() {
        if (this.errorElement) {
            this.errorElement.textContent = "";
            this.errorElement.hidden = true;
        }
        if (this.statusElement) this.statusElement.textContent = "";
    }

    setLoading(isLoading) {
        if (!this.submitButton) return;
        const loading = Boolean(isLoading);
        this.submitButton.disabled = loading;
        this.submitButton.setAttribute("aria-busy", String(loading));
        if (loading) {
            this.submitButton.dataset.originalText = this.submitButton.textContent;
            this.submitButton.textContent = "Signing in...";
        } else {
            this.submitButton.textContent = this.submitButton.dataset.originalText || "Sign In";
        }
    }

    _resolveElement(selectorOrElement) {
        if (!selectorOrElement) return null;
        return typeof selectorOrElement === "string" ? document.querySelector(selectorOrElement) : selectorOrElement;
    }

    _isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    delay(milliseconds) {
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    }

    destroy() {
        if (this.form) this.form.removeEventListener("submit", this.handleSubmit);
        this.form = null;
        this.submitButton = null;
        this.errorElement = null;
        this.statusElement = null;
        this.selectedRole = null;
        this.initialised = false;
        this.submitting = false;
    }
}

export const loginController = new LoginController();
export { LoginController };
export default loginController;
