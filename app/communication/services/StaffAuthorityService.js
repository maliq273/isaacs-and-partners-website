/**
 * Isaacs & Partners — Staff Authority Service
 *
 * Defines the capabilities a staff member must hold before the AI may
 * delegate work to them. Super Admin always supersedes staff permissions.
 */

export const STAFF_AI_CAPABILITIES = Object.freeze({
    LIAISE_WITH_AI: "LIAISE_WITH_AI",
    ANSWER_AI_QUERIES: "ANSWER_AI_QUERIES",
    RELAY_TO_CLIENT: "RELAY_TO_CLIENT",
    HANDLE_APPOINTMENTS: "HANDLE_APPOINTMENTS",
    PROVIDE_PRICING: "PROVIDE_PRICING",
    APPROVE_QUOTES: "APPROVE_QUOTES",
    HANDLE_IMMIGRATION: "HANDLE_IMMIGRATION",
    HANDLE_HR: "HANDLE_HR",
    HANDLE_BUSINESS_COMPLIANCE: "HANDLE_BUSINESS_COMPLIANCE",
    HANDLE_LEGAL: "HANDLE_LEGAL"
});

const DOMAIN_CAPABILITIES = Object.freeze({
    IMMIGRATION: STAFF_AI_CAPABILITIES.HANDLE_IMMIGRATION,
    HR_IR: STAFF_AI_CAPABILITIES.HANDLE_HR,
    BUSINESS_COMPLIANCE: STAFF_AI_CAPABILITIES.HANDLE_BUSINESS_COMPLIANCE,
    LEGAL: STAFF_AI_CAPABILITIES.HANDLE_LEGAL
});

export default class StaffAuthorityService {
    isSuperAdmin(staff = null) {
        return String(staff?.role || "").toUpperCase() === "SUPER_ADMIN" || staff?.isSuperAdmin === true;
    }

    has(staff, capability) {
        if (!staff) return false;
        if (this.isSuperAdmin(staff)) return true;
        return Array.isArray(staff.permissions)
            ? staff.permissions.includes(capability)
            : Boolean(staff.permissions?.[capability]);
    }

    canLiaise(staff) {
        return this.has(staff, STAFF_AI_CAPABILITIES.LIAISE_WITH_AI);
    }

    canAnswer(staff) {
        return this.canLiaise(staff) && this.has(staff, STAFF_AI_CAPABILITIES.ANSWER_AI_QUERIES);
    }

    canPrice(staff) {
        return this.canLiaise(staff) && this.has(staff, STAFF_AI_CAPABILITIES.PROVIDE_PRICING);
    }

    canApproveQuote(staff) {
        return this.canPrice(staff) && this.has(staff, STAFF_AI_CAPABILITIES.APPROVE_QUOTES);
    }

    canHandleDomain(staff, domain) {
        const capability = DOMAIN_CAPABILITIES[String(domain || "").toUpperCase()];
        return Boolean(capability) && this.canLiaise(staff) && this.has(staff, capability);
    }

    getRequiredCapabilities({ domain, needsPricing = false, needsAppointment = false } = {}) {
        const required = [STAFF_AI_CAPABILITIES.LIAISE_WITH_AI, STAFF_AI_CAPABILITIES.ANSWER_AI_QUERIES];
        const domainCapability = DOMAIN_CAPABILITIES[String(domain || "").toUpperCase()];
        if (domainCapability) required.push(domainCapability);
        if (needsPricing) required.push(STAFF_AI_CAPABILITIES.PROVIDE_PRICING);
        if (needsAppointment) required.push(STAFF_AI_CAPABILITIES.HANDLE_APPOINTMENTS);
        return [...new Set(required)];
    }

    filterEligibleStaff(staffList = [], options = {}) {
        return staffList.filter((staff) => {
            if (this.isSuperAdmin(staff)) return true;
            if (!this.canLiaise(staff)) return false;
            if (options.needsAnswer !== false && !this.canAnswer(staff)) return false;
            if (options.domain && !this.canHandleDomain(staff, options.domain)) return false;
            if (options.needsPricing && !this.canPrice(staff)) return false;
            if (options.needsAppointment && !this.has(staff, STAFF_AI_CAPABILITIES.HANDLE_APPOINTMENTS)) return false;
            return staff.isActive !== false;
        });
    }
}
