import { CONVERSATION_STATES } from "./ConversationService.js";

const HUMAN_INTENTS = new Set(["HUMAN_REQUEST", "COMPLAINT", "PAYMENT_PROOF"]);
const SENSITIVE_TERMS = ["appeal strategy", "court", "litigation", "lawsuit", "dismissal", "disciplinary outcome", "ccma strategy", "legal opinion", "urgent deadline", "threat", "complaint"];

export default class HandoverService {
    assess({ intent = "UNKNOWN", message = "", servicePlan = null, confidence = 0 } = {}) {
        const text = String(message).toLowerCase();
        const sensitive = SENSITIVE_TERMS.filter(term => text.includes(term));
        const humanRequired = HUMAN_INTENTS.has(intent) || sensitive.length > 0 || Boolean(servicePlan?.humanRequired) || confidence < 0.65;
        return { humanRequired, reasons: [...(HUMAN_INTENTS.has(intent) ? ["CLIENT_REQUEST_OR_OPERATIONAL_HANDOVER"] : []), ...(sensitive.length ? ["SENSITIVE_SUBJECT"] : []), ...(servicePlan?.humanRequired ? ["SERVICE_REQUIRES_HUMAN_REVIEW"] : []), ...(confidence < 0.65 ? ["LOW_INTENT_CONFIDENCE"] : [])], sensitiveTerms: sensitive };
    }

    escalate(context, assessment) {
        context.state = CONVERSATION_STATES.AI_ESCALATED;
        context.handover = { ...assessment, escalatedAt: new Date().toISOString() };
        return context.handover;
    }

    takeOver(context, staffId) {
        context.state = CONVERSATION_STATES.HUMAN_ACTIVE;
        context.handover = { ...(context.handover || {}), staffId: staffId || null, takenOverAt: new Date().toISOString() };
        return context;
    }

    resolve(context) {
        context.state = CONVERSATION_STATES.HUMAN_RESOLVED;
        context.handover = { ...(context.handover || {}), resolvedAt: new Date().toISOString() };
        return context;
    }

    resumeAI(context) {
        context.state = CONVERSATION_STATES.AI_RESUMED;
        return context;
    }
}
