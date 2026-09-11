/**
 * Isaacs & Partners — Customer Relationship Memory Engine
 *
 * Learns only from customer-originated evidence. Automated service/domain
 * classification is deliberately not accepted as memory evidence.
 */
function clean(value, max = 2000) { return String(value ?? "").trim().slice(0, max); }
function normalise(value) { return clean(value, 4000).toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim(); }

const MAX_LIST = 30;

function uniquePush(list, value) {
    const item = clean(value, 500);
    if (!item) return list;
    if (!list.some(existing => normalise(existing) === normalise(item))) list.push(item);
    return list.slice(-MAX_LIST);
}

function extractAfter(pattern, text) {
    const match = clean(text).match(pattern);
    return match?.[1] ? clean(match[1].replace(/[?.!]+$/, ""), 500) : null;
}

function explicitInterest(body) {
    const text = clean(body);
    const patterns = [
        /\b(?:i am|i'm|im|we are|we're)\s+(?:interested|looking)\s+(?:in|for)\s+(.+)/i,
        /\b(?:i|we)\s+(?:am|are|need|want|would like)\s+(?:help with|information about|info about|assistance with)\s+(.+)/i,
        /\b(?:i|we)\s+(?:need|want|would like)\s+(.+)/i,
        /\b(?:i|we)\s+(?:asked about|was asking about|were asking about)\s+(.+)/i,
        /\b(?:tell me about|information on|info on)\s+(.+)/i
    ];
    for (const pattern of patterns) {
        const value = extractAfter(pattern, text);
        if (value && value.length <= 300) return value;
    }
    return null;
}

function explicitGoal(body) {
    const text = clean(body);
    return extractAfter(/\b(?:my goal is|i want to|we want to|i'm trying to|i am trying to|we're trying to)\s+(.+)/i, text);
}

function explicitPreference(body) {
    const text = clean(body);
    return extractAfter(/\b(?:i prefer|i'd prefer|i would prefer|please use|contact me via|my preferred)\s+(.+)/i, text);
}

function correctionValue(body) {
    const text = clean(body);
    return extractAfter(/\b(?:i meant|i said|i told you|i was referring to|what i meant was)\s+(.+)/i, text);
}

export default class CustomerRelationshipMemoryEngine {
    observe({ body, contact = null, onboardingFacts = null, user = null, conversationId = null, sourceMessageId = null } = {}) {
        const text = clean(body);
        const facts = onboardingFacts && typeof onboardingFacts === "object" ? onboardingFacts : {};
        const records = [];
        const now = new Date().toISOString();

        const add = ({ category, key, value, sourceType = "CUSTOMER_EXPLICIT", confidence = 1, evidence = text, metadata = {} }) => {
            const cleanValue = clean(value, 1000);
            if (!cleanValue) return;
            records.push({
                conversation_id: conversationId || null,
                client_user_id: user?.id || contact?.user_id || null,
                contact_id: contact?.id || null,
                category,
                memory_key: key,
                value_text: cleanValue,
                value_json: { value: cleanValue },
                source_type: sourceType,
                source_message_id: sourceMessageId || null,
                evidence: clean(evidence, 2000),
                confidence,
                status: "ACTIVE",
                first_seen_at: now,
                last_confirmed_at: now,
                last_seen_at: now,
                metadata
            });
        };

        const interest = explicitInterest(text);
        if (interest) add({ category: "SERVICE_INTEREST", key: "explicit_service_interest", value: interest });

        const goal = explicitGoal(text);
        if (goal) add({ category: "GOAL", key: "customer_goal", value: goal });

        const preference = explicitPreference(text);
        if (preference) add({ category: "PREFERENCE", key: "communication_or_service_preference", value: preference });

        const correction = correctionValue(text);
        if (correction) add({ category: "CORRECTION", key: "customer_correction", value: correction, sourceType: "CUSTOMER_CORRECTION", metadata: { supersedes: true } });

        if (facts.enquiry) add({ category: "SERVICE_INTEREST", key: "onboarding_enquiry", value: facts.enquiry, sourceType: "ONBOARDING", evidence: `Customer's onboarding enquiry: ${facts.enquiry}` });
        if (facts.email) add({ category: "IDENTITY", key: "email", value: facts.email, sourceType: "ONBOARDING" });
        if (facts.firstName || facts.lastName) add({ category: "IDENTITY", key: "name", value: [facts.firstName, facts.lastName].filter(Boolean).join(" "), sourceType: "ONBOARDING" });
        if (facts.preferredChannel) add({ category: "PREFERENCE", key: "preferred_channel", value: facts.preferredChannel, sourceType: "ONBOARDING" });

        return { records, now };
    }

    mergeIntoContext(context = {}, records = []) {
        const next = context && typeof context === "object" ? context : {};
        const memory = next.memory && typeof next.memory === "object" ? next.memory : {};
        memory.version = 2;
        memory.updatedAt = new Date().toISOString();
        memory.serviceInterests = Array.isArray(memory.serviceInterests) ? memory.serviceInterests : [];
        memory.goals = Array.isArray(memory.goals) ? memory.goals : [];
        memory.preferences = Array.isArray(memory.preferences) ? memory.preferences : [];
        memory.importantFacts = Array.isArray(memory.importantFacts) ? memory.importantFacts : [];
        memory.corrections = Array.isArray(memory.corrections) ? memory.corrections : [];

        for (const record of records) {
            if (record.category === "SERVICE_INTEREST") uniquePush(memory.serviceInterests, record.value_text);
            else if (record.category === "GOAL") uniquePush(memory.goals, record.value_text);
            else if (record.category === "PREFERENCE") uniquePush(memory.preferences, `${record.memory_key}: ${record.value_text}`);
            else if (record.category === "CORRECTION") uniquePush(memory.corrections, record.value_text);
            else if (record.category === "IDENTITY") uniquePush(memory.importantFacts, `${record.memory_key}: ${record.value_text}`);
        }
        next.memory = memory;
        next.facts = { ...(next.facts || {}), customerMemory: memory };
        return next;
    }
}

export { explicitInterest, explicitGoal, explicitPreference, correctionValue };
