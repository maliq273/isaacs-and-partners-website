/**
 * Isaacs and Partners
 * Login Controller
 *
 * Authenticates the user, verifies the selected account category against the
 * authoritative public.profiles role, then navigates directly to the correct
 * dashboard. SUPER_ADMIN is permitted through the Staff sign-in gateway.
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
        if (this.initialised || typeof document === "undefined") return this;
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
        return this;
    }

    setRole(role) { this.selectedRole = String(role || "").trim().toLowerCase() || null; }

    async handleSubmit(event) {
        event.preventDefault();
        if (this.submitting) return;
        this.clearMessages();
        if (!this.selectedRole) { this.showError("Please choose Individual, Business or Staff before signing in."); return; }
        const data = new FormData(this.form);
        const identifier = String(data.get("identifier") || "").trim();
        const password = String(data.get("password") || "");
        const rememberMe = data.get("rememberMe") === "on";
        const validationError = this.validateCredentials(identifier, password);
        if (validationError) { this.showError(validationError); return; }

        this.submitting = true;
        this.setLoading(true);
        this.setStatus("Signing you in...");
        try {
            const result = await auth.login(identifier, password, { rememberMe });
            if (!result?.authenticated) throw new Error("Authentication failed.");
            const user = auth.getCurrentUser();
            const actualRole = await resolveUserDashboardRole(user);
            if (!actualRole) throw new Error("Your account role could not be determined. Please contact Isaacs and Partners.");
            if (!this.selectedRoleMatches(actualRole)) {
                await auth.logout?.();
                throw new Error(`This account is registered as ${this.roleLabel(actualRole)}. Please choose that account type to sign in.`);
            }
            this.setStatus("Login successful. Redirecting...");
            await this.delay(50);
            navigation.toRoleDashboard(actualRole, { replace: true });
        } catch (error) {
            this.handleLoginError(error);
        } finally {
            this.submitting = false;
            this.setLoading(false);
        }
    }

    selectedRoleMatches(actualRole) {
        if (this.selectedRole === "staff" && actualRole === "SUPER_ADMIN") return true;
        return this.selectedRole === String(actualRole || "").toLowerCase();
    }

    roleLabel(role) {
        return ({ SUPER_ADMIN: "Super Admin", STAFF: "Staff", BUSINESS: "Business", INDIVIDUAL: "Individual" })[role] || role;
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
        let message = error?.message || "Unable to sign you in. Please check your credentials and try again.";
        if (["HTTP_400", "HTTP_401", "INVALID_CREDENTIALS", "AUTHENTICATION_FAILED"].includes(error?.code)) message = "The email address or password is incorrect.";
        if (["HTTP_403", "ACCOUNT_DISABLED"].includes(error?.code)) message = "Your account is not authorised to access this system.";
        if (error?.code === "NETWORK_ERROR") message = "Unable to connect to the authentication service. Please check your connection.";
        this.showError(message);
    }

    async redirectAuthenticatedUser() {
        const role = await resolveUserDashboardRole(auth.getCurrentUser());
        if (!role) throw new Error("Your account role could not be determined. Please contact Isaacs and Partners.");
        navigation.toRoleDashboard(role, { replace: true });
    }

    showError(message) { if (this.errorElement) { this.errorElement.textContent = message || ""; this.errorElement.hidden = !message; this.errorElement.classList.toggle("is-visible", Boolean(message)); } }
    setStatus(message) { if (this.statusElement) { this.statusElement.textContent = message || ""; this.statusElement.hidden = !message; this.statusElement.classList.toggle("is-visible", Boolean(message)); } }
    clearMessages() { this.showError(""); this.setStatus(""); }
    setLoading(loading) { if (!this.submitButton) return; this.submitButton.disabled = Boolean(loading); this.submitButton.setAttribute("aria-busy", String(Boolean(loading))); if (loading) { this.submitButton.dataset.originalText = this.submitButton.textContent; this.submitButton.textContent = "Signing in..."; } else this.submitButton.textContent = this.submitButton.dataset.originalText || "Sign In"; }
    _resolveElement(value) { return !value ? null : typeof value === "string" ? document.querySelector(value) : value; }
    _isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
    delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
    destroy() { if (this.form) this.form.removeEventListener("submit", this.handleSubmit); this.form = null; this.initialised = false; this.submitting = false; this.selectedRole = null; }
}

export const loginController = new LoginController();
export { LoginController };
export default loginController;
