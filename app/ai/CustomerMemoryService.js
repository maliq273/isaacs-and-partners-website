/**
 * Persistent conversational memory for the Isaacs & Partners AI Liaison.
 * This is not model training. It is a structured, reviewable memory layer
 * carried with the customer's conversation and supplied to the model.
 */
function clean(value, max = 2000) { return String(value ?? "").trim().slice(0, max); }

const MAX_LIST = 20;

function addUnique(list, value) {
    const item = clean(value, 500);
    if (!item) return list;
    const exists = list.some(existing => String(existing).toLowerCase() === item.toLowerCase());
    if (!exists) list.push(item);
    return list.slice(-MAX_LIST);
}

export default class CustomerMemoryService {
    observe(context, { body, intent, servicePlan, lead, user } = {}) {
        if (!context || typeof context !== "object") return context;
        if (!context.memory || typeof context.memory !== "object") context.memory = {};
        const memory = context.memory;
        memory.version = 1;
        memory.updatedAt = new Date().toISOString();
        memory.serviceInterests = Array.isArray(memory.serviceInterests) ? memory.serviceInterests : [];
        memory.goals = Array.isArray(memory.goals) ? memory.goals : [];
        memory.preferences = Array.isArray(memory.preferences) ? memory.preferences : [];
        memory.importantFacts = Array.isArray(memory.importantFacts) ? memory.importantFacts : [];

        if (servicePlan?.service?.name) addUnique(memory.serviceInterests, servicePlan.service.name);
        if (servicePlan?.domain) addUnique(memory.serviceInterests, servicePlan.domain);
        if (intent?.intent) memory.lastIntent = intent.intent;
        if (lead?.facts && typeof lead.facts === "object") {
            for (const [key, value] of Object.entries(lead.facts)) {
                if (value === null || value === undefined || value === "") continue;
                memory.importantFacts = addUnique(memory.importantFacts, `${key}: ${clean(value, 500)}`);
            }
        }
        if (user?.email) memory.email = clean(user.email, 320).toLowerCase();
        const metadata = user?.user_metadata || {};
        if (metadata.name || metadata.full_name) memory.name = clean(metadata.name || metadata.full_name, 255);
        if (body) memory.recentIntentText = clean(body, 1000);

        // Keep the last useful user-facing facts in a compact form. Full transcript
        // remains available separately, so memory does not need to duplicate it.
        memory.lastInteractionAt = new Date().toISOString();
        context.memory = memory;
        context.facts = { ...(context.facts || {}), customerMemory: memory };
        return context;
    }

    merge(existing = {}, observed = {}) {
        const base = existing && typeof existing === "object" ? existing : {};
        const next = observed && typeof observed === "object" ? observed : {};
        return {
            ...base,
            ...next,
            serviceInterests: Array.from(new Set([...(base.serviceInterests || []), ...(next.serviceInterests || [])])).slice(-MAX_LIST),
            goals: Array.from(new Set([...(base.goals || []), ...(next.goals || [])])).slice(-MAX_LIST),
            preferences: Array.from(new Set([...(base.preferences || []), ...(next.preferences || [])])).slice(-MAX_LIST),
            importantFacts: Array.from(new Set([...(base.importantFacts || []), ...(next.importantFacts || [])])).slice(-MAX_LIST),
            updatedAt: new Date().toISOString()
        };
    }
}
