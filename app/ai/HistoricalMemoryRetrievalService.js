/**
 * Isaacs & Partners — Historical Memory Retrieval Service
 *
 * Deterministic retrieval sits between the conversation store and the LLM.
 * It decides whether a customer is asking about something previously said and
 * retrieves customer-originated evidence before any service classifier or model
 * reasoning is allowed to influence the answer.
 */
function clean(value, max = 4000) {
    return String(value ?? "").trim().slice(0, max);
}

function normalise(value) {
    return clean(value, 4000).toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim();
}

function tokens(value) {
    return normalise(value)
        .replace(/[^a-z0-9@._-]+/g, " ")
        .split(/\s+/)
        .filter(token => token.length >= 3);
}

const RECALL_PATTERNS = [
    /\bpreviously\b/i,
    /\bearlier\b/i,
    /\bbefore\b/i,
    /\bwe (?:discussed|spoke about|talked about)\b/i,
    /\bwhat did i (?:say|tell you|mention)\b/i,
    /\bwhat have i (?:said|told you|mentioned)\b/i,
    /\bdo you remember\b/i,
    /\bremember when\b/i,
    /\bwhat was i interested in\b/i,
    /\bwhat service (?:did i|was i)\b/i,
    /\bwhat did i ask about\b/i,
    /\bwhat did we discuss\b/i
];

const CORRECTION_PATTERNS = [
    /\bno[,! ]*(?:that's|that is) wrong\b/i,
    /\b(?:wrong|incorrect|not what i said|that's not what i said|that is not what i said)\b/i,
    /\byou(?:'|’)re wrong\b/i,
    /\b(?:i meant|i said|i told you|i was referring to)\b/i,
    /\b(?:correct that|fix that|that's incorrect|that is incorrect)\b/i
];

export default class HistoricalMemoryRetrievalService {
    isHistoricalRecallQuery(query) {
        return RECALL_PATTERNS.some(pattern => pattern.test(clean(query)));
    }

    isCorrection(query) {
        const text = clean(query);
        return CORRECTION_PATTERNS.some(pattern => pattern.test(text)) || /!{2,}/.test(text) || /(?:wo+|no+|wrong+|bad+|wro+ng)/i.test(text);
    }

    scoreMemory(memory, query) {
        const q = tokens(query);
        const text = `${memory.memory_key || ""} ${memory.value_text || ""} ${memory.evidence || ""}`;
        const mt = new Set(tokens(text));
        let score = Number(memory.confidence || 0);
        for (const token of q) if (mt.has(token)) score += 0.12;
        if (memory.source_type === "CUSTOMER_CORRECTION") score += 0.25;
        if (memory.source_type === "CUSTOMER_EXPLICIT") score += 0.2;
        if (memory.status === "ACTIVE") score += 0.2;
        return score;
    }

    async retrieve({ db, conversationId = null, contactId = null, userId = null, query = "", history = [], limit = 12 } = {}) {
        if (!db) throw new TypeError("HistoricalMemoryRetrievalService requires a database client.");
        const historicalQuery = clean(query);
        const recall = this.isHistoricalRecallQuery(historicalQuery);
        const correction = this.isCorrection(historicalQuery);
        let memories = [];

        let q = db.from("ai_customer_memories")
            .select("id,conversation_id,client_user_id,contact_id,category,memory_key,value_text,value_json,source_type,source_message_id,evidence,confidence,status,first_seen_at,last_confirmed_at,last_seen_at,metadata")
            .eq("status", "ACTIVE")
            .order("last_confirmed_at", { ascending: false })
            .limit(100);

        if (contactId) q = q.eq("contact_id", contactId);
        else if (userId) q = q.eq("client_user_id", userId);
        else if (conversationId) q = q.eq("conversation_id", conversationId);
        else q = null;

        if (q) {
            const result = await q;
            if (result.error) throw result.error;
            memories = result.data || [];
        }

        const ranked = memories
            .map(memory => ({ ...memory, retrievalScore: this.scoreMemory(memory, historicalQuery) }))
            .sort((a, b) => b.retrievalScore - a.retrievalScore || new Date(b.last_confirmed_at).getTime() - new Date(a.last_confirmed_at).getTime())
            .slice(0, limit);

        const customerMessages = (Array.isArray(history) ? history : [])
            .filter(item => String(item.sender || item.sender_type || "").toUpperCase() === "CLIENT")
            .map(item => ({ id: item.id, body: clean(item.body, 2000), createdAt: item.createdAt || item.created_at, metadata: item.metadata || {} }))
            .filter(item => item.body);

        const queryTokens = new Set(tokens(historicalQuery));
        const matchingMessages = customerMessages
            .map(item => {
                const mt = new Set(tokens(item.body));
                let score = 0;
                for (const token of queryTokens) if (mt.has(token)) score += 1;
                return { ...item, retrievalScore: score };
            })
            .filter(item => item.retrievalScore > 0)
            .sort((a, b) => b.retrievalScore - a.retrievalScore || new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
            .slice(0, limit);

        const explicit = ranked.filter(item => ["CUSTOMER_EXPLICIT", "CUSTOMER_CORRECTION", "ONBOARDING"].includes(item.source_type));
        return {
            query: historicalQuery,
            isHistoricalRecall: recall,
            isCorrection: correction,
            memories: ranked,
            explicitMemories: explicit,
            matchingCustomerMessages: matchingMessages,
            strongestExplicitMemory: explicit[0] || null,
            found: ranked.length > 0 || matchingMessages.length > 0
        };
    }
}

export { RECALL_PATTERNS, CORRECTION_PATTERNS };
