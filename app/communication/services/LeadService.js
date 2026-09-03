export default class LeadService {
    qualify({ message = "", user = null, service = null, facts = {} } = {}) {
        const text = String(message).trim();
        const extracted = {
            name: user?.user_metadata?.full_name || user?.user_metadata?.name || null,
            email: user?.email || null,
            phone: user?.user_metadata?.whatsappNumber || user?.user_metadata?.phone || null,
            serviceId: service?.id || null,
            serviceName: service?.name || null,
            enquiry: text
        };
        return {
            stage: service ? "SERVICE_IDENTIFIED" : "QUALIFICATION",
            readyForStaff: Boolean(service),
            facts: { ...facts, ...extracted },
            missing: [!extracted.name && "name", !extracted.email && "email", !extracted.phone && "whatsappNumber", !extracted.serviceId && "service"].filter(Boolean)
        };
    }
}
