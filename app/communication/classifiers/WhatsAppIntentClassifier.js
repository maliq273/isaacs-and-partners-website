const RULES = Object.freeze([
    { intent: "HUMAN_REQUEST", keywords: ["human", "agent", "staff", "person", "speak to someone", "consultant"] },
    { intent: "COMPLAINT", keywords: ["complaint", "complain", "unhappy", "dissatisfied", "fraud", "scam"] },
    { intent: "PAYMENT_PROOF", keywords: ["proof of payment", "pop", "payment proof", "paid already", "payment receipt"] },
    { intent: "PAYMENT", keywords: ["pay", "payment", "bank details", "banking details", "invoice", "deposit", "balance"] },
    { intent: "STATUS", keywords: ["status", "progress", "update", "what is happening", "matter status", "application status"] },
    { intent: "DOCUMENTS", keywords: ["document", "documents", "passport", "upload", "outstanding", "required documents"] },
    { intent: "APPOINTMENT", keywords: ["appointment", "book", "booking", "meeting", "consultation", "schedule"] },
    { intent: "PRICING", keywords: ["price", "pricing", "cost", "fee", "fees", "how much", "quote", "quotation"] },
    { intent: "GREETING", keywords: ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"] },
    { intent: "SERVICE_ENQUIRY", keywords: ["visa", "immigration", "dha", "vfs", "refugee", "asylum", "employee", "employment", "cipc", "sars", "uif", "coida", "contract", "legal", "affidavit", "mediation"] }
]);

export default class WhatsAppIntentClassifier {
    classify(input = {}) {
        const text = String(input.message || input.text || "").trim().toLowerCase();
        const candidates = RULES.map(rule => ({ intent: rule.intent, matched: rule.keywords.filter(k => text.includes(k)) }))
            .filter(item => item.matched.length);
        const best = candidates[0];
        return {
            intent: best?.intent || "UNKNOWN",
            confidence: best ? Math.min(0.98, 0.65 + best.matched.length * 0.08) : 0,
            matched: best?.matched || [],
            candidates
        };
    }
}
