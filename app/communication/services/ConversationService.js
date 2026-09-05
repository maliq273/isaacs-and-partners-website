export const CONVERSATION_STATES = Object.freeze({ AI_ACTIVE: "AI_ACTIVE", AI_ESCALATED: "AI_ESCALATED", HUMAN_ACTIVE: "HUMAN_ACTIVE", HUMAN_RESOLVED: "HUMAN_RESOLVED", AI_RESUMED: "AI_RESUMED" });

export default class ConversationService {
    createContext({ chatId, phoneNumber = null, user = null, matter = null, state = CONVERSATION_STATES.AI_ACTIVE } = {}) {
        return { chatId: String(chatId || "").trim(), phoneNumber: phoneNumber ? String(phoneNumber).trim() : null, user, matter, state, messages: [], facts: {}, lastIntent: null, lastService: null };
    }

    ensureContext(context, fallback = {}) {
        if (!context || typeof context !== "object") return this.createContext(fallback);
        if (!Array.isArray(context.messages)) context.messages = [];
        if (!context.facts || typeof context.facts !== "object" || Array.isArray(context.facts)) context.facts = {};
        if (!context.state) context.state = CONVERSATION_STATES.AI_ACTIVE;
        if (!context.chatId && fallback.chatId) context.chatId = String(fallback.chatId).trim();
        if (context.phoneNumber === undefined) context.phoneNumber = fallback.phoneNumber ? String(fallback.phoneNumber).trim() : null;
        return context;
    }

    addMessage(context, { direction, body, sender = "UNKNOWN", messageId = null, metadata = {} } = {}) {
        this.ensureContext(context);
        const item = { id: messageId, direction, sender, body: String(body || ""), metadata, createdAt: new Date().toISOString() };
        context.messages.push(item);
        return item;
    }

    setState(context, state) {
        this.ensureContext(context);
        if (!Object.values(CONVERSATION_STATES).includes(state)) throw new Error(`Invalid conversation state: ${state}`);
        context.state = state;
        return context;
    }

    mergeFacts(context, facts = {}) {
        this.ensureContext(context);
        context.facts = { ...context.facts, ...(facts && typeof facts === "object" ? facts : {}) };
        return context;
    }
}