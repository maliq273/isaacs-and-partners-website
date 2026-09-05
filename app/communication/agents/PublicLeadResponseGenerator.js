/*
 * Public website response layer for the existing WhatsAppAgent.
 *
 * This is intentionally a response generator, not a second AI engine. The
 * same WhatsAppAgent still performs intent classification, service
 * intelligence, lead qualification and sales-stage detection.
 *
 * Public answers are informational and conversion-focused. They never issue
 * a binding quote, claim payment was received, or make a final legal or
 * immigration decision.
 */

const SERVICE_GUIDANCE = Object.freeze({
    IMMIGRATION: {
        title: "Immigration Services",
        overview: "We assist individuals and businesses with South African immigration matters, including visa-related applications, permanent residence pathways and appeals. The right route depends on your circumstances, nationality, purpose of stay and supporting evidence.",
        next: "The useful next step is to identify your immigration route and the documents relevant to your circumstances. A formal matter requires a staff-reviewed quotation before work starts.",
        cta: "Create an account so Isaacs & Partners can capture your enquiry and guide you through the next steps."
    },
    HR_IR: {
        title: "HR & Industrial Relations",
        overview: "We assist employers with HR and industrial-relations matters, including employment documentation, disciplinary and grievance processes, performance issues, retrenchment-related support and workplace representation.",
        next: "The team will need the relevant workplace facts before confirming the appropriate service and quotation. Human review is important where an employment dispute or formal proceeding is involved.",
        cta: "Create an account to submit the details securely and have the enquiry progressed to the appropriate Isaacs & Partners team."
    },
    BUSINESS_COMPLIANCE: {
        title: "Business Compliance",
        overview: "We help businesses with practical compliance requirements such as company administration, CIPC-related work, SARS, UIF, COIDA and other business compliance support.",
        next: "We can first identify which compliance items apply to your business and then have the team review the required work and quotation.",
        cta: "Create a business account so we can capture your requirements and move the enquiry toward a formal quotation."
    },
    LEGAL: {
        title: "Legal Services",
        overview: "We provide legal advisory and drafting support, including contracts, affidavits, powers of attorney, settlements and other legal documentation and advisory requirements.",
        next: "Legal matters can depend heavily on the facts and documents involved, so the AI can provide general information while the appropriate legal work remains subject to human review.",
        cta: "Create an account to securely provide the relevant information and request the appropriate professional assistance."
    },
    OTHER: {
        title: "Isaacs & Partners Services",
        overview: "Isaacs & Partners provides multidisciplinary support across immigration, HR and industrial relations, business compliance and legal advisory services.",
        next: "Tell me what you are trying to achieve, who the matter concerns and what has happened so far. I can help identify the most relevant service.",
        cta: "Once we identify the service, I can recommend creating an account so the enquiry can be taken forward securely."
    }
});

function normalise(value) {
    return String(value || "").trim().toUpperCase();
}

function isPricingIntent(intent) {
    return ["PRICING", "PAYMENT", "PAYMENT_PROOF"].includes(normalise(intent));
}

export default async function publicLeadResponseGenerator({ body, intent, servicePlan } = {}) {
    const domain = normalise(servicePlan?.domain) || "OTHER";
    const guidance = SERVICE_GUIDANCE[domain] || SERVICE_GUIDANCE.OTHER;
    const serviceName = servicePlan?.service?.name;
    const question = String(body || "").trim();
    const intentName = normalise(intent?.intent);

    if (intentName === "GREETING") {
        return "Hi, welcome to Isaacs & Partners. I’m your AI Liaison. I can help you understand the service you may need, explain the general process and guide you toward the right next step. What can I help you with today?";
    }

    if (!question) return null;

    if (isPricingIntent(intentName)) {
        return `${guidance.title}${serviceName ? ` — ${serviceName}` : ""}\n\nI can explain the service and help you understand what information the team will need, but I will not invent or issue a binding quotation. For substantive matters, Isaacs & Partners requires a staff-reviewed quote before the matter proceeds. ${guidance.cta}`;
    }

    return `${guidance.title}${serviceName ? ` — ${serviceName}` : ""}\n\n${guidance.overview}\n\n${guidance.next}\n\n${guidance.cta}`;
}
