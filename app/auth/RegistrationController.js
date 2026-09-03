/**
 * Isaacs and Partners
 * Registration Controller
 *
 * Handles public Individual and Business registration.
 * WhatsApp is a first-class client communication identity and is required
 * for public client registration. The OpenWA chatId is never collected here.
 */

import auth from "./AuthService.js";

class RegistrationController {
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

        this.form = this._resolveElement(options.formSelector || "#registrationForm");
        this.submitButton = options.submitButton || this._resolveElement("#registrationButton");
        this.errorElement = this._resolveElement(options.errorSelector || "#registrationError");
        this.statusElement = this._resolveElement(options.statusSelector || "#registrationStatus");

        if (!this.form) throw new Error("Registration form could not be found.");

        await auth.initialise();
        if (auth.isAuthenticated()) {
            this._redirectAfterRegistration();
            return this;
        }

        this.form.addEventListener("submit", this.handleSubmit);
        this.initialised = true;
        this.setStatus("Create your secure account to continue.");
        return this;
    }

    async handleSubmit(event) {
        event.preventDefault();
        if (this.submitting) return;

        this.clearMessages();
        const data = new FormData(this.form);
        const email = String(data.get("email") || "").trim().toLowerCase();
        const password = String(data.get("password") || "");
        const confirmPassword = String(data.get("confirmPassword") || data.get("passwordConfirmation") || "");
        const accountType = String(data.get("accountType") || "individual").trim().toLowerCase();
        const whatsappNumber = this.normaliseWhatsAppNumber(data.get("whatsappNumber"));
        const whatsappConsent = data.get("whatsappConsent") === "on";

        const validationError = this.validate({
            email,
            password,
            confirmPassword,
            accountType,
            whatsappNumber,
            whatsappConsent
        });
        if (validationError) {
            this.showError(validationError);
            return;
        }

        const profile = {};
        for (const [key, value] of data.entries()) {
            if (["email", "password", "confirmPassword", "passwordConfirmation", "accountType", "whatsappConsent"].includes(key)) continue;
            if (key === "whatsappNumber") {
                profile[key] = whatsappNumber;
                continue;
            }
            if (typeof value === "string" && value.trim()) profile[key] = value.trim();
        }

        profile.whatsappConsent = true;
        profile.communicationIdentity = "WHATSAPP";

        this.submitting = true;
        this.setLoading(true);
        this.setStatus("Creating your account...");

        try {
            const result = await auth.register({
                email,
                password,
                accountType,
                profile,
                options: {
                    rememberMe: data.get("rememberMe") === "on"
                }
            });

            if (result.requiresEmailConfirmation) {
                this.setStatus("Account created. Please check your email and confirm your address before signing in.");
                this.form.reset();
                return;
            }

            this.setStatus("Account created successfully. Redirecting...");
            await this.delay(250);
            this._redirectAfterRegistration();
        } catch (error) {
            this.handleRegistrationError(error);
        } finally {
            this.submitting = false;
            this.setLoading(false);
        }
    }

    validate({ email, password, confirmPassword, accountType, whatsappNumber, whatsappConsent }) {
        if (!email) return "Please enter your email address.";
        if (!this._isValidEmail(email)) return "Please enter a valid email address.";
        if (password.length < 8) return "Password must contain at least 8 characters.";
        if (password.length > 256) return "The password is too long.";
        if (password !== confirmPassword) return "The passwords do not match.";
        if (!["individual", "business"].includes(accountType)) return "Please select Individual or Business registration.";
        if (!whatsappNumber) return "Please enter your WhatsApp number in international format, for example +27718831097.";
        if (!/^\+[1-9]\d{7,14}$/.test(whatsappNumber)) return "Please enter a valid WhatsApp number with the country code.";
        if (!whatsappConsent) return "Please confirm that this number is registered on WhatsApp and that Isaacs & Partners may use it for client communication.";
        return null;
    }

    normaliseWhatsAppNumber(value) {
        const raw = String(value || "").trim().replace(/[\s().-]/g, "");
        if (!raw) return "";
        if (raw.startsWith("00")) return `+${raw.slice(2)}`;
        if (raw.startsWith("+")) return raw;
        return raw;
    }

    handleRegistrationError(error) {
        console.error("[RegistrationController] Registration failed:", error);
        let message = error?.message || "Unable to create the account. Please try again.";
        switch (error?.code) {
            case "HTTP_400":
                message = error?.response?.msg || error?.response?.message || message;
                break;
            case "HTTP_422":
                message = "The registration details could not be accepted. Please check the information and try again.";
                break;
            case "HTTP_429":
                message = "Too many registration attempts. Please wait and try again.";
                break;
            case "EMAIL_INVALID":
                message = "Please enter a valid email address.";
                break;
            case "PASSWORD_WEAK":
                message = "Password must contain at least 8 characters.";
                break;
            case "ACCOUNT_TYPE_INVALID":
                message = "Staff accounts are created internally and cannot be registered here.";
                break;
            case "NETWORK_ERROR":
                message = "Unable to connect to the authentication service. Please check your internet connection.";
                break;
        }
        this.showError(message);
    }

    _redirectAfterRegistration() {
        if (typeof window === "undefined") return;
        const returnUrl = new URLSearchParams(window.location.search).get("returnUrl");
        if (returnUrl && this.isSafeReturnUrl(returnUrl)) {
            window.location.assign(returnUrl);
            return;
        }
        window.location.assign("../dashboard/");
    }

    isSafeReturnUrl(url) {
        if (!url || typeof window === "undefined") return false;
        try {
            if (String(url).startsWith("//")) return false;
            const parsed = new URL(url, window.location.origin);
            if (parsed.origin !== window.location.origin) return false;
            if (parsed.protocol !== window.location.protocol) return false;
            if (!parsed.pathname.startsWith("/")) return false;
            if (parsed.pathname.endsWith("/login.html") || parsed.pathname === "/login.html") return false;
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
            this.submitButton.textContent = "Creating account...";
        } else {
            this.submitButton.textContent = this.submitButton.dataset.originalText || "Create Account";
        }
    }

    _resolveElement(value) {
        if (!value) return null;
        return typeof value === "string" ? document.querySelector(value) : value;
    }

    _isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

    delay(milliseconds) { return new Promise(resolve => setTimeout(resolve, milliseconds)); }

    destroy() {
        if (this.form) this.form.removeEventListener("submit", this.handleSubmit);
        this.form = null;
        this.submitButton = null;
        this.errorElement = null;
        this.statusElement = null;
        this.initialised = false;
        this.submitting = false;
    }
}

export const registrationController = new RegistrationController();
export { RegistrationController };
export default registrationController;
