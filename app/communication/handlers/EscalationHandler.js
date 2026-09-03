export default class EscalationHandler {
    create({ context, assessment, lead = null, servicePlan = null } = {}) {
        return {
            type: "WHATSAPP_HUMAN_ESCALATION",
            priority: assessment?.sensitiveTerms?.length ? "HIGH" : "NORMAL",
            chatId: context?.chatId || null,
            phoneNumber: context?.phoneNumber || null,
            customerUserId: context?.user?.id || null,
            matterId: context?.matter?.id || null,
            service: servicePlan?.service || null,
            lead,
            reasons: assessment?.reasons || [],
            createdAt: new Date().toISOString(),
            staffNotificationRequired: true,
            superAdminNotificationRequired: true
        };
    }
}
