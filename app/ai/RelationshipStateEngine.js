/**
 * Isaacs & Partners — Relationship State Engine
 * Converts customer-originated memory into durable relationship state.
 */
function clean(value, max = 1000) { return String(value ?? "").trim().slice(0, max); }
const NEGATIVE = /\b(?:not interested|no longer interested|don't need|do not need|not looking|cancel(?:led|ling)?|forget it)\b/i;
const WAITING = /\b(?:waiting for|awaiting|still waiting|pending|send me|provide .* document)\b/i;
const FOLLOW_UP = /\b(?:follow up|follow-up|call me|contact me|check back|get back to me|remind me|please contact)\b/i;
export default class RelationshipStateEngine {
    derive({ records = [], body = "", now = new Date().toISOString() } = {}) {
        const text = clean(body, 4000);
        const active = (records || []).filter(r => r?.status === "ACTIVE");
        const corrections = active.filter(r => r.category === "CORRECTION" || r.source_type === "CUSTOMER_CORRECTION");
        const interests = active.filter(r => r.category === "SERVICE_INTEREST");
        const goals = active.filter(r => r.category === "GOAL");
        const state = {
            relationship_status: "ACTIVE",
            service_interest: interests.length ? clean(interests.at(-1).value_text) : null,
            interest_status: NEGATIVE.test(text) ? "NO_LONGER_INTERESTED" : corrections.length ? "CORRECTED" : interests.length ? "INTERESTED_IN" : null,
            current_goal: goals.length ? clean(goals.at(-1).value_text) : null,
            waiting_for: WAITING.test(text) ? text : null,
            follow_up_required: FOLLOW_UP.test(text) || WAITING.test(text),
            last_customer_message_at: now,
            last_confirmed_at: now,
            state_json: { source: "CUSTOMER_ORIGINATED_EVIDENCE", correctionCount: corrections.length, observedMemoryCount: active.length }
        };
        return state;
    }
    merge(existing = null, derived = {}) {
        const base = existing || {};
        return {
            relationship_status: derived.relationship_status || base.relationship_status || "ACTIVE",
            service_interest: derived.service_interest || base.service_interest || null,
            interest_status: derived.interest_status || base.interest_status || null,
            current_goal: derived.current_goal || base.current_goal || null,
            waiting_for: derived.waiting_for || base.waiting_for || null,
            follow_up_required: derived.follow_up_required ?? base.follow_up_required ?? false,
            last_customer_message_at: derived.last_customer_message_at || base.last_customer_message_at || null,
            last_confirmed_at: derived.last_confirmed_at || base.last_confirmed_at || new Date().toISOString(),
            state_json: { ...(base.state_json || {}), ...(derived.state_json || {}) }
        };
    }
}
