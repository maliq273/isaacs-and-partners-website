/**
 * Isaacs and Partners
 * Super Admin Login Controller
 *
 * Dedicated entry point for the SUPER_ADMIN account.
 * The browser never receives or stores a privileged secret.
 * Supabase Auth authenticates the credential and the explicit role
 * check below determines whether this session may enter the admin area.
 */

import auth from "./AuthService.js";
import adminAuthGuard from "./AdminAuthGuard.js";
import ADMIN_AUTH_CONFIG from "./admin-auth.config.js";
import navigation from "../core/navigation.js";

class AdminLoginController {
    constructor() {
        this.initialised = false;
        this.submitting = false;
        this.form = null;
        this.submitButton = null;
        this.errorElement = null;
        this.statusElement = null;
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    async initialise(options = {}) {
        if (this.initialised) return this;
        if (typeof document === "undefined") return this;

        this.form = this._resolveElement(options.formSelector || "#adminLoginForm");
        this.submitButton = options.submitButton || this._resolveElement("#adminLoginButton");
        this.errorElement = this._resolveElement(options.errorSelector || "#adminLoginError");
        this.statusElement = this._resolveElement(options.statusSelector || "#adminLoginStatus");

        if (!this.form) {
            throw new Error("Super Admin login form could not be found.");
        }

        await auth.initialise();

        if (auth.isAuthenticated()) {
            const access = await adminAuthGuard.requireSuperAdmin();
            if (access.allowed) {
                this.redirectToAdminDashboard();
                return this;
            }

            await auth.logout({ remote: false, reason: "admin_role_required" });
        }

        this.form.addEventListener("submit", this.handleSubmit);
        this.initialised = true;
        this.setStatus("Restricted administrator access. Use your authorised administrator account.");
        return this;
    }

    async handleSubmit(event) {
        event.preventDefault();
        if (this.submitting) return;

        this.clearMessages();

        const formData = new FormData(this.form);
        const email = String(formData.get("email") || "").trim().toLowerCase();
        const password = String(formData.get("password") || "");
        const rememberMe = formData.get("rememberMe") === "on";

        const validationError = this.validate(email, password);
        if (validationError) {
            this.showError(validationError);
            return;
        }

        this.submitting = true;
        this.setLoading(true);
        this.setStatus("Verifying administrator credentials...");

        try {
            await auth.login(email, password, { rememberMe });

            this.setStatus("Verifying administrator privileges...");

            const access = await adminAuthGuard.requireSuperAdmin();

            if (!access.allowed) {
                await auth.logout({ remote: true, reason: access.reason || "admin_access_denied" });
                throw this._createError(
                    "SUPER_ADMIN_REQUIRED",
                    "This account is not authorised for Super Admin access."
                );
            }

            this.setStatus("Administrator verified. Opening control centre...");
            await this.delay(200);
            this.redirectToAdminDashboard();
        } catch (error) {
            this.handleError(error);
        } finally {
            this.submitting = false;
            this.setLoading(false);
        }
    }

    validate(email, password) {
        if (!email) return "Administrator email address is required.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid administrator email address.";
        if (email.length > 254) return "The email address is too long.";
        if (!password) return "Administrator password is required.";
        if (password.length > 256) return "The password is too long.";
        return null;
    }

    handleError(error) {
        console.error("[AdminLoginController] Administrator login failed:", error);

        let message = "Administrator authentication failed. Access has not been granted.";

        switch (error?.code) {
            case "HTTP_400":
            case "HTTP_401":
            case "INVALID_CREDENTIALS":
            case "AUTHENTICATION_FAILED":
                message = "The administrator credentials are incorrect.";
                break;
            case "HTTP_403":
            case "SUPER_ADMIN_REQUIRED":
            case "SUPER_ADMIN_ROLE_REQUIRED":
                message = "This account is not authorised for Super Admin access.";
                break;
            case "NETWORK_ERROR":
                message = "Unable to connect to the authentication service. Please try again.";
                break;
            case "REQUEST_TIMEOUT":
                message = "The administrator authentication request timed out. Please try again.";
                break;
            default:
                if (error?.message) message = error.message;
        }

        this.showError(message);
        this.setStatus("Access remains locked until an authorised administrator session is verified.");
    }

    redirectToAdminDashboard() {
        navigation.toRoleDashboard(ADMIN_AUTH_CONFIG.role, { replace: true });
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
        this.showError("");
        this.setStatus("");
    }

    setLoading(isLoading) {
        if (!this.submitButton) return;
        const loading = Boolean(isLoading);
        this.submitButton.disabled = loading;
        this.submitButton.setAttribute("aria-busy", String(loading));
        this.submitButton.textContent = loading ? "Verifying..." : "Enter Control Centre";
    }

    _resolveElement(selectorOrElement) {
        if (!selectorOrElement) return null;
        return typeof selectorOrElement === "string"
            ? document.querySelector(selectorOrElement)
            : selectorOrElement;
    }

    _createError(code, message) {
        const error = new Error(message);
        error.code = code;
        return error;
    }

    delay(milliseconds) {
        return new Promise(resolve => setTimeout(resolve, milliseconds));
    }

    destroy() {
        if (this.form) {
            this.form.removeEventListener("submit", this.handleSubmit);
        }
        this.form = null;
        this.submitButton = null;
        this.errorElement = null;
        this.statusElement = null;
        this.initialised = false;
        this.submitting = false;
    }
}

export const adminLoginController = new AdminLoginController();
export { AdminLoginController };
export default adminLoginController;
