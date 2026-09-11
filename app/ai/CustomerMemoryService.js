/**
 * Backward-compatible facade for the Customer Relationship Memory Engine.
 *
 * Important: classifier/service-plan output is never treated as customer
 * evidence. Durable memory is created only from customer-originated facts.
 */
import CustomerRelationshipMemoryEngine from "./CustomerRelationshipMemoryEngine.js";

export default class CustomerMemoryService {
    constructor() {
        this.engine = new CustomerRelationshipMemoryEngine();
    }

    observe(context, { body, lead, user, contact, onboardingFacts, conversationId, sourceMessageId } = {}) {
        const result = this.engine.observe({
            body,
            lead,
            user,
            contact,
            onboardingFacts,
            conversationId,
            sourceMessageId
        });
        this.engine.mergeIntoContext(context, result.records);
        return context;
    }

    observeRecords(options = {}) {
        return this.engine.observe(options);
    }

    merge(existing = {}, observed = {}) {
        const base = existing && typeof existing === "object" ? existing : {};
        const next = observed && typeof observed === "object" ? observed : {};
        return {
            ...base,
            ...next,
            serviceInterests: Array.from(new Set([...(base.serviceInterests || []), ...(next.serviceInterests || [])])).slice(-30),
            goals: Array.from(new Set([...(base.goals || []), ...(next.goals || [])])).slice(-30),
            preferences: Array.from(new Set([...(base.preferences || []), ...(next.preferences || [])])).slice(-30),
            importantFacts: Array.from(new Set([...(base.importantFacts || []), ...(next.importantFacts || [])])).slice(-30),
            corrections: Array.from(new Set([...(base.corrections || []), ...(next.corrections || [])])).slice(-30),
            updatedAt: new Date().toISOString()
        };
    }
}
