export const CONVERSATION_STATES = Object.freeze({ AI_ACTIVE: "AI_ACTIVE", AI_ESCALATED: "AI_ESCALATED", HUMAN_ACTIVE: "HUMAN_ACTIVE", HUMAN_RESOLVED: "HUMAN_RESOLVED", AI_RESUMED: "AI_RESUMED" });

export default class ConversationService {
    createContext({ chatId, phoneNumber = null, user = null, matter = null, state = CONVERSATION_STATES.AI_ACTIVE } = {}) {
        return { chatId: String(chatId || "").trim(), phoneNumber: phoneNumber ? String(phoneNumber).trim() : null, user, matter, state, messages: [], facts: {}, lastIntent: null, lastService: null };
    }

    addMessage(context, { direction, body, sender = "UNKNOWN", messageId = null, metadata = {} } = {}) {
        if (!context) throw new TypeError("Conversation context is required.");
        const item = { id: messageId, direction, sender, body: String(body || ""), metadata, createdAt: new Date().toISOString() };
        context.messages.push(item);
        return item;
    }

    setState(context, state) {
        if (!Object.values(CONVERSATION_STATES).includes(state)) throw new Error(`Invalid conversation state: ${state}`);
        context.state = state;
        return context;
    }

    mergeFacts(context, facts = {}) {
        context.facts = { ...context.facts, ...facts };
        return context;
    }
}
