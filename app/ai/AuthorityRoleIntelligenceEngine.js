/**
 * Isaacs & Partners — Authority & Role Intelligence Engine
 *
 * Read-only authority resolver. WhatsApp transport number is the hard identity
 * anchor. The authority_directory table is authoritative for organisational
 * roles; profiles/staff/AI permissions are supporting records.
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
const EXECUTIVE_ROLES = new Set(["SUPER_ADMIN", "DIRECTOR", "SHAREHOLDER", "PARTNER"]);
const KNOWN_AUTHORITY_ROLES = new Set(["SUPER_ADMIN", "DIRECTOR", "SHAREHOLDER", "PARTNER", "STAFF", "STAKEHOLDER"]);

function text(value, max = 255) { return String(value ?? "").trim().slice(0, max); }
function normalisePhone(value) {
    const raw = text(value, 64);
    if (!raw || /@lid/i.test(raw)) return null;
    const digits = raw.replace(/@c\.us$/i, "").replace(/\D/g, "");
    return digits || null;
}
function normaliseName(value) { return text(value, 255).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }

export default class AuthorityRoleIntelligenceEngine {
    constructor({ db } = {}) {
        if (!db) throw new Error("AuthorityRoleIntelligenceEngine requires a Supabase admin client.");
        this.db = db;
    }

    async resolveWhatsAppIdentity({ phoneNumber, chatId = null, whatsappName = null } = {}) {
        const sourcePhone = normalisePhone(phoneNumber);
        const base = {
            sourcePhone,
            chatId: text(chatId, 255) || null,
            whatsappName: text(whatsappName, 255) || null
        };

        if (!sourcePhone) {
            return { ...base, authenticated: false, identityStatus: "UNVERIFIED_WHATSAPP_NUMBER", reason: "WhatsApp sender did not provide a verifiable phone number." };
        }

        const { data: authorityRows, error: authorityError } = await this.db.rpc("authority_directory_match_whatsapp", { p_phone_number: sourcePhone });
        if (authorityError) throw authorityError;
        const matches = Array.isArray(authorityRows) ? authorityRows : authorityRows ? [authorityRows] : [];

        if (matches.length === 0) {
            return { ...base, authenticated: false, identityStatus: "UNKNOWN_WHATSAPP_NUMBER", reason: "WhatsApp number is not present in the active authority directory." };
        }
        if (matches.length > 1) {
            return { ...base, authenticated: false, identityStatus: "AMBIGUOUS_WHATSAPP_NUMBER", reason: "WhatsApp number matches more than one active authority record.", authorityIds: matches.map(row => row.id) };
        }

        const authority = matches[0];
        const authorityRole = text(authority.authority_role, 64).toUpperCase();
        if (!KNOWN_AUTHORITY_ROLES.has(authorityRole)) {
            return { ...base, authenticated: false, identityStatus: "INVALID_AUTHORITY_ROLE", reason: "Authority directory contains an unsupported role." };
        }

        let profile = null;
        let staff = null;
        let permissions = null;

        if (authority.user_id) {
            const profileResult = await this.db.from("profiles").select("id,first_name,last_name,email,phone,role,is_active").eq("id", authority.user_id).maybeSingle();
            if (profileResult.error) throw profileResult.error;
            profile = profileResult.data || null;

            const staffResult = await this.db.from("staff").select("id,user_id,employee_number,department,job_title,is_active").eq("user_id", authority.user_id).maybeSingle();
            if (staffResult.error) throw staffResult.error;
            staff = staffResult.data || null;

            const permissionsResult = await this.db.from("staff_ai_permissions").select("*").eq("staff_user_id", authority.user_id).maybeSingle();
            if (permissionsResult.error) throw permissionsResult.error;
            permissions = permissionsResult.data || null;
        }

        const authoritativeName = text(authority.full_name, 255) || [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() || null;
        const displayNameMatches = !base.whatsappName || !authoritativeName ? null : normaliseName(base.whatsappName) === normaliseName(authoritativeName);
        const profilePhoneMatches = !profile?.phone || normalisePhone(profile.phone) === sourcePhone;
        const profileConflict = Boolean(profile && profile.phone && !profilePhoneMatches);

        return {
            ...base,
            authenticated: authority.is_active !== false && !profileConflict,
            identityStatus: authority.is_active === false ? "AUTHORITY_INACTIVE" : profileConflict ? "AUTHORITY_PROFILE_PHONE_CONFLICT" : "AUTHENTICATED_BY_AUTHORITY_DIRECTORY",
            reason: profileConflict ? "Authority directory matched the number but the linked profile has a conflicting phone number." : "WhatsApp number matches exactly one active authority directory record.",
            authority,
            authorityId: authority.id,
            authorityRole,
            profile,
            staff,
            permissions,
            authoritativeName,
            phoneVerified: true,
            profilePhoneMatches,
            staffRecordVerified: Boolean(staff?.user_id === authority.user_id && staff?.is_active !== false),
            permissionsRecordActive: Boolean(permissions?.is_active === true),
            displayNameMatches
        };
    }

    async evaluateWhatsApp({ phoneNumber, chatId = null, whatsappName = null, action = null, domain = null } = {}) {
        const identity = await this.resolveWhatsAppIdentity({ phoneNumber, chatId, whatsappName });
        if (!identity.authenticated) return this._deny(identity, identity.identityStatus);

        const role = identity.authorityRole;
        const superAdmin = role === "SUPER_ADMIN";
        const executive = EXECUTIVE_ROLES.has(role);
        const staffRole = STAFF_ROLES.has(role);

        if (role === "STAFF" && !identity.staffRecordVerified) return this._deny(identity, "STAFF_RECORD_NOT_VERIFIED");
        if (staffRole && role !== "SUPER_ADMIN" && !identity.permissionsRecordActive) return this._deny(identity, "STAFF_AI_PERMISSIONS_NOT_ACTIVE");

        const capabilities = superAdmin ? Object.values(ACTION_CAPABILITIES) : this._activeCapabilities(identity.permissions);
        const requiredCapability = this._requiredCapability(action, domain);
        const allowed = superAdmin || (!requiredCapability || capabilities.includes(requiredCapability));

        return {
            allowed,
            identityStatus: identity.identityStatus,
            authorityStatus: allowed ? "AUTHORISED" : "NOT_AUTHORISED",
            authorityId: identity.authorityId,
            role,
            authorityRole: role,
            userId: identity.authority?.user_id || null,
            name: identity.authoritativeName,
            phone: identity.sourcePhone,
            employeeNumber: identity.staff?.employee_number || null,
            department: identity.authority?.department || identity.staff?.department || null,
            jobTitle: identity.authority?.job_title || identity.staff?.job_title || null,
            phoneVerified: identity.phoneVerified,
            profilePhoneMatches: identity.profilePhoneMatches,
            staffRecordVerified: identity.staffRecordVerified,
            displayNameMatches: identity.displayNameMatches,
            action: text(action, 100).toUpperCase() || null,
            domain: text(domain, 100).toUpperCase() || null,
            requiredCapability,
            capabilities,
            reason: allowed ? "Authority is supported by the authoritative authority directory and active permission state." : `Required authority is not granted: ${requiredCapability || "NO_AUTHORITY"}.`
        };
    }

    _requiredCapability(action, domain) {
        const requestedAction = text(action, 100).toUpperCase();
        if (ACTION_TO_CAPABILITY[requestedAction]) return ACTION_TO_CAPABILITY[requestedAction];
        const requestedDomain = text(domain, 100).toUpperCase();
        return {
            IMMIGRATION: ACTION_CAPABILITIES.HANDLE_IMMIGRATION,
            HR: ACTION_CAPABILITIES.HANDLE_HR,
            HR_IR: ACTION_CAPABILITIES.HANDLE_HR,
            BUSINESS_COMPLIANCE: ACTION_CAPABILITIES.HANDLE_BUSINESS_COMPLIANCE,
            LEGAL: ACTION_CAPABILITIES.HANDLE_LEGAL
        }[requestedDomain] || null;
    }

    _activeCapabilities(permissions) {
        if (!permissions?.is_active) return [];
        return Object.values(ACTION_CAPABILITIES).filter(field => permissions[field] === true);
    }

    _deny(identity, reason) {
        return {
            allowed: false,
            identityStatus: identity.identityStatus,
            authorityStatus: "NOT_AUTHORISED",
            authorityId: identity.authorityId || null,
            role: null,
            authorityRole: "UNAUTHENTICATED_WHATSAPP_CONTACT",
            userId: null,
            name: null,
            phone: identity.sourcePhone || null,
            employeeNumber: null,
            department: null,
            jobTitle: null,
            phoneVerified: false,
            profilePhoneMatches: false,
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