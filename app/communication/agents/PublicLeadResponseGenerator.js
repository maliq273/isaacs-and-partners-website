import { PUBLIC_SERVICE_DIRECTORY } from "../public/PublicServiceDirectory.js";

/*
 * Public response layer for the existing WhatsAppAgent.
 * The service directory is the governed navigation map; substantive legal,
 * immigration and HR/IR decisions remain human-reviewed.
 *
 * The public website AI is a short, guided preliminary consultation. It must
 * not dump the entire service directory into the conversation: navigation is
 * handled by the visual category/subcategory UI in PublicLeadLiaison.js.
 */

const SERVICE_GUIDANCE = Object.freeze({
    IMMIGRATION: {
        title: "Immigration Services",
        next: "I’ll ask a few short questions so the team can understand your matter."
    },
    HR_IR: {
        title: "HR & Industrial Relations",
        next: "I’ll ask a few short questions so the team can understand your matter."
    },
    BUSINESS_COMPLIANCE: {
        title: "Business Compliance",
        next: "I’ll ask a few short questions so the team can understand your business requirement."
    },
    LEGAL: {
        title: "Legal Services",
        next: "I’ll ask a few short questions so the team can understand your matter."
    }
});

function normalise(value) {
    return String(value || "").trim().toUpperCase();
}

function isPricingIntent(intent) {
    return ["PRICING", "PAYMENT", "PAYMENT_PROOF"].includes(normalise(intent));
}

function getQualificationState(context) {
    if (!context) return { stage: 0, qualified: false, answers: [] };
    context.publicLead = context.publicLead || { stage: 0, qualified: false, answers: [] };
    context.publicLead.stage = Number(context.publicLead.stage || 0);
    context.publicLead.answers = Array.isArray(context.publicLead.answers) ? context.publicLead.answers : [];
    context.publicLead.qualified = context.publicLead.qualified === true;
    return context.publicLead;
}

function qualificationReply(state, serviceName) {
    if (state.stage === 0) {
        state.stage = 1;
        return `Let’s begin with ${serviceName}. Is this for an individual or a business, and what outcome are you hoping to achieve?`;
    }

    if (state.stage === 1) {
        state.stage = 2;
        return "Thank you. What has happened so far? Please include any important dates, notices, applications, disputes or deadlines.";
    }

    if (state.stage === 2) {
        state.stage = 3;
        return "Thanks. How urgent is this, and what documents or information do you already have available?";
    }

    state.qualified = true;
    return "Thank you. I have enough preliminary information to prepare your enquiry for the next step. Please create your client account so Isaacs & Partners can securely capture the enquiry and arrange the appropriate professional follow-up.";
}

export default async function publicLeadResponseGenerator({ body, intent, servicePlan, context } = {}) {
    const domain = normalise(servicePlan?.domain);
    const guidance = SERVICE_GUIDANCE[domain];
    const serviceName = servicePlan?.service?.name;
    const question = String(body || "").trim();
    const intentName = normalise(intent?.intent);

    if (!question) return null;

    if (!guidance || !serviceName) {
        return "Please choose one of the four service areas and then select the specific service you need. I’ll start the free 15-minute preliminary consultation immediately after your selection.";
    }

    const state = getQualificationState(context);

    if (isPricingIntent(intentName)) {
        return `For ${serviceName}, I can explain what information the team needs, but I won’t invent or issue a binding quotation. Let’s first complete the free preliminary consultation.`;
    }

    if (intentName === "GREETING") {
        return `Welcome. Your selected service is ${serviceName}. Tell me briefly what you need help with, and I’ll guide you through the free 15-minute preliminary consultation.`;
    }

    if (!state.qualified) {
        state.answers.push(question);
        const questionReply = qualificationReply(state, serviceName);
        return `${guidance.title} · ${serviceName}\n\n${guidance.next}\n\n${questionReply}`;
    }

    return `Your ${serviceName} enquiry is already prepared for signup. Create your account so Isaacs & Partners can securely capture your information and move it to the appropriate team member.`;
}
