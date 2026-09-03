import { CONVERSATION_STATES } from "../services/ConversationService.js";

export default class StaffMessageHandler {
    constructor({ transport } = {}) {
        this.transport = transport || null;
    }

    async send({ context, staffId, body } = {}) {
        if (!context?.chatId) throw new Error("WhatsApp chatId is required.");
        if (!body) throw new Error("Staff message body is required.");
        context.state = CONVERSATION_STATES.HUMAN_ACTIVE;
        context.handover = { ...(context.handover || {}), staffId: staffId || null, takenOverAt: new Date().toISOString() };
        if (!this.transport?.queueWhatsAppMessage) return { queued: false, requiresTransport: true, state: context.state, body };
        const messageId = await this.transport.queueWhatsAppMessage({ chatId: context.chatId, body, matterId: context.matter?.id || null, phoneNumber: context.phoneNumber || null });
        return { queued: true, messageId, state: context.state };
    }
}
