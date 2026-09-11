/**
 * Isaacs & Partners — Authority & Role Intelligence Engine
 *
 * Determines who Anthony is speaking to and what that person may do.
 *
 * Identity rule for WhatsApp:
 *   WhatsApp transport number -> authoritative profile phone -> staff record ->
 *   authoritative role -> active AI permissions -> action authority.
 *
 * A WhatsApp display name, onboarding claim, contact label, or classifier output
 * is never sufficient to establish staff or executive authority.
 *
 * This engine is read-only. It does not grant, change, or persist permissions.
 */

const ACTION_CAPABILITIES = Object.freeze({
    LIAISE_WITH_AI: "can_liaise_with_ai",
    ANSWER_AI_QUERIES: "can_answer_ai_queries",
    RELAY_TO_CLIENT: "can_relay_to_clients",
    HANDLE_APPOINTMENTS: "can_handle_appointments",
    PROVIDE_PRICING: "can_provide_pricing",
    APPROVE_QUOTES: "can_approve_quotes",
    HANDLE_IMMIGRATION: "can_handle_immigration",
    HANDLE_HR: "can_handle_hr",
    HANDLE_BUSINESS_COMPLIANCE: "can_handle_business_compliance",
    HANDLE_LEGAL: "can_handle_legal"
});

const ACTION_TO_CAPABILITY = Object.freeze({
    LIAISE_WITH_AI: ACTION_CAPABILITIES.LIAISE_WITH_AI,
    ANSWER_AI_QUERIES: ACTION_CAPABILITIES.ANSWER_AI_QUERIES,
    RELAY_TO_CLIENT: ACTION_CAPABILITIES.RELAY_TO_CLIENT,
    HANDLE_APPOINTMENTS: ACTION_CAPABILITIES.HANDLE_APPOINTMENTS,
    PROVIDE_PRICING: ACTION_CAPABILITIES.PROVIDE_PRICING,
    APPROVE_QUOTES: ACTION_CAPABILITIES.APPROVE_QUOTES,
    HANDLE_IMMIGRATION: ACTION_CAPABILITIES.HANDLE_IMMIGRATION,
    HANDLE_HR: ACTION_CAPABILITIES.HANDLE_HR,
    HANDLE_BUSINESS_COMPLIANCE: ACTION_CAPABILITIES.HANDLE_BUSINESS_COMPLIANCE,
    HANDLE_LEGAL: ACTION_CAPABILITIES.HANDLE_LEGAL
});

const STAFF_ROLES = new Set(["STAFF", "SUPER_ADMIN"]);
const EXECUTIVE_ROLES = new Set(["SUPER_ADMIN", "SHAREHOLDER", "DIRECTOR"]);

function text(value, max = 255) {
    return String(value ?? "").trim().slice(0, max);
}

function normalisePhone(value) {
    const raw = text(value, 64);
    if (!raw || /@lid/i.test(raw)) return null;
    const digits = raw.replace(/@c\.us$/i, "").replace(/\D/g, "");
    return digits || null;
}

function normaliseName(value) {
    return text(value, 255).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function samePhone(a, b) {
    const left = normalisePhone(a);
    const right = normalisePhone(b);
    return Boolean(left && right && left === right);
}

function roleOf(profile) {
    return text(profile?.role, 64).toUpperCase();
}

function isActive(profile, staff, permissions) {
    return profile?.is_active !== false && staff?.is_active !== false && permissions?.is_active !== false;
}

export default class AuthorityRoleIntelligenceEngine {
    constructor({ db } = {}) {
        if (!db) throw new Error("AuthorityRoleIntelligenceEngine requires a Supabase admin client.");
        this.db = db;
    }

    /**
     * Resolve a WhatsApp sender against the authoritative state store.
     * The incoming transport number is the primary identity key.
     */
    async resolveWhatsAppIdentity({ phoneNumber, chatId = null, whatsappName = null } = {}) {
        const sourcePhone = normalisePhone(phoneNumber);

        // A LID sender does not expose a verifiable phone number. Do not promote it
        // to staff/executive authority merely because a contact row exists.
        if (!sourcePhone) {
            return {
                authenticated: false,
                identityStatus: "UNVERIFIED_WHATSAPP_NUMBER",
                reason: "WhatsApp sender did not provide a verifiable phone number.",
                sourcePhone: null,
                chatId: text(chatId, 255) || null,
                whatsappName: text(whatsappName, 255) || null
            };
        }

        const profiles = await this.db
            .from("profiles")
            .select("id,first_name,last_name,email,phone,role,is_active")
            .eq("is_active", true);
        if (profiles.error) throw profiles.error;

        const matches = (profiles.data || []).filter((profile) => samePhone(profile.phone, sourcePhone));

        if (matches.length === 0) {
            return {
                authenticated: false,
                identityStatus: "UNKNOWN_WHATSAPP_NUMBER",
                reason: "WhatsApp number does not match an active authoritative profile.",
                sourcePhone,
                chatId: text(chatId, 255) || null,
                whatsappName: text(whatsappName, 255) || null
            };
        }

        if (matches.length > 1) {
            return {
                authenticated: false,
                identityStatus: "AMBIGUOUS_WHATSAPP_NUMBER",
                reason: "WhatsApp number matches more than one active profile.",
                sourcePhone,
                chatId: text(chatId, 255) || null,
                whatsappName: text(whatsappName, 255) || null,
                profileIds: matches.map((profile) => profile.id)
            };
        }

        const profile = matches[0];
        const staffResult = await this.db
            .from("staff")
            .select("id,user_id,employee_number,department,job_title,is_active")
            .eq("user_id", profile.id)
            .maybeSingle();
        if (staffResult.error) throw staffResult.error;

        const permissionsResult = await this.db
            .from("staff_ai_permissions")
            .select("*")
            .eq("staff_user_id", profile.id)
            .maybeSingle();
        if (permissionsResult.error) throw permissionsResult.error;

        const staff = staffResult.data || null;
        const permissions = permissionsResult.data || null;
        const role = roleOf(profile);
        const authoritativeName = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() || null;
        const displayNameMatches = !whatsappName || !authoritativeName
            ? null
            : normaliseName(whatsappName) === normaliseName(authoritativeName);

        return {
            authenticated: true,
            identityStatus: "AUTHENTICATED_BY_PHONE",
            reason: "WhatsApp sender number matches exactly one active authoritative profile.",
            sourcePhone,
            chatId: text(chatId, 255) || null,
            whatsappName: text(whatsappName, 255) || null,
            displayNameMatches,
            profile,
            staff,
            permissions,
            role,
            authoritativeName,
            phoneVerified: samePhone(sourcePhone, profile.phone),
            staffRecordVerified: Boolean(staff?.user_id === profile.id && staff?.is_active !== false),
            permissionsRecordActive: Boolean(permissions?.is_active === true)
        };
    }

    /**
     * Build a complete authority decision for a WhatsApp sender.
     */
    async evaluateWhatsApp({ phoneNumber, chatId = null, whatsappName = null, action = null, domain = null } = {}) {
        const identity = await this.resolveWhatsAppIdentity({ phoneNumber, chatId, whatsappName });
        if (!identity.authenticated) {
            return this._deny(identity, "UNAUTHENTICATED_WHATSAPP_CONTACT");
        }

        const { profile, staff, permissions, role } = identity;

        // A profile phone match authenticates the person. It does not by itself
        // grant staff authority. Staff must also have an active staff record.
        if (role === "STAFF" && !identity.staffRecordVerified) {
            return this._deny(identity, "STAFF_RECORD_NOT_VERIFIED");
        }

        if (!isActive(profile, staff, role === "SUPER_ADMIN" ? null : permissions)) {
            return this._deny(identity, "IDENTITY_OR_STAFF_INACTIVE");
        }

        const executive = EXECUTIVE_ROLES.has(role);
        const superAdmin = role === "SUPER_ADMIN";
        const staffRole = STAFF_ROLES.has(role);

        // Current schema has no SHAREHOLDER/DIRECTOR enum value. If such a role is
        // introduced later, this engine will recognise it only when the authoritative
        // profile role explicitly contains it. It will never infer executive authority
        // from job title, WhatsApp name, or a user's claim.
        if (executive && !superAdmin && !permissions?.is_active) {
            return this._deny(identity, "EXECUTIVE_AUTHORITY_NOT_EXPLICITLY_ACTIVE");
        }

        const capabilities = superAdmin
            ? Object.values(ACTION_CAPABILITIES)
            : this._activeCapabilities(permissions);

        const requiredCapability = this._requiredCapability(action, domain);
        const allowed = superAdmin || (!requiredCapability || capabilities.includes(requiredCapability));

        return {
            allowed,
            identityStatus: identity.identityStatus,
            authorityStatus: allowed ? "AUTHORISED" : "NOT_AUTHORISED",
            role,
            authorityRole: superAdmin ? "SUPER_ADMIN" : executive ? role : staffRole ? "STAFF" : role,
            userId: profile.id,
            name: identity.authoritativeName,
            phone: identity.sourcePhone,
            employeeNumber: staff?.employee_number || null,
            department: staff?.department || null,
            jobTitle: staff?.job_title || null,
            phoneVerified: identity.phoneVerified,
            staffRecordVerified: identity.staffRecordVerified,
            displayNameMatches: identity.displayNameMatches,
            action: text(action, 100).toUpperCase() || null,
            domain: text(domain, 100).toUpperCase() || null,
            requiredCapability,
            capabilities,
            reason: allowed
                ? "Authority is supported by the authoritative profile, staff record and active permission state."
                : `Required authority is not granted: ${requiredCapability || "NO_AUTHORITY"}.`
        };
    }

    _requiredCapability(action, domain) {
        const requestedAction = text(action, 100).toUpperCase();
        if (ACTION_TO_CAPABILITY[requestedAction]) return ACTION_TO_CAPABILITY[requestedAction];

        const requestedDomain = text(domain, 100).toUpperCase();
        const domainMap = {
            IMMIGRATION: ACTION_CAPABILITIES.HANDLE_IMMIGRATION,
            HR: ACTION_CAPABILITIES.HANDLE_HR,
            HR_IR: ACTION_CAPABILITIES.HANDLE_HR,
            BUSINESS_COMPLIANCE: ACTION_CAPABILITIES.HANDLE_BUSINESS_COMPLIANCE,
            LEGAL: ACTION_CAPABILITIES.HANDLE_LEGAL
        };
        return domainMap[requestedDomain] || null;
    }

    _activeCapabilities(permissions) {
        if (!permissions?.is_active) return [];
        return Object.values(ACTION_CAPABILITIES).filter((field) => permissions[field] === true);
    }

    _deny(identity, reason) {
        return {
            allowed: false,
            identityStatus: identity.identityStatus,
            authorityStatus: "NOT_AUTHORISED",
            role: null,
            authorityRole: "UNAUTHENTICATED_WHATSAPP_CONTACT",
            userId: null,
            name: null,
            phone: identity.sourcePhone || null,
            employeeNumber: null,
            department: null,
            jobTitle: null,
            phoneVerified: false,
            staffRecordVerified: false,
            displayNameMatches: identity.displayNameMatches ?? null,
            action: null,
            domain: null,
            requiredCapability: null,
            capabilities: [],
            reason
        };
    }
}

export { ACTION_CAPABILITIES };
