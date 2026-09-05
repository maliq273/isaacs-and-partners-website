import { PUBLIC_SERVICE_DIRECTORY } from "../public/PublicServiceDirectory.js";

/*
 * Public response layer for the existing WhatsAppAgent.
 * The service directory is the governed navigation map; substantive legal,
 * immigration and HR/IR decisions remain human-reviewed.
 *
 * The public website AI is positioned as a free 15-minute preliminary
 * consultation. It identifies the service, asks a short set of qualification
 * questions, then prepares the visitor for account creation. Formal advice,
 * quotations and professional work remain subject to the firm's normal review.
 */

const SERVICE_GUIDANCE = Object.freeze({
    IMMIGRATION: { title: "Immigration Services", overview: "We assist individuals and businesses with South African immigration matters, including visa applications, permanent residence pathways, citizenship, refugee and asylum assistance, DHA representations, VFS applications, status verification and appeals.", next: "The correct route depends on your circumstances, nationality, purpose of stay and supporting evidence." },
    HR_IR: { title: "HR & Industrial Relations", overview: "We assist with employment contracts, HR policies, disciplinary and grievance hearings, chairperson services, performance management, retrenchment consulting, CCMA representation, bargaining council matters, payroll advisory, labour compliance, employment equity, recruitment and HR outsourcing.", next: "For disputes, hearings and representation, the facts, employment history and available documents need authorised human review." },
    BUSINESS_COMPLIANCE: { title: "Business Compliance", overview: "We assist with company registration, CIPC amendments, business name reservations, SARS, VAT, PAYE, UIF, COIDA, tax clearance, business bank account setup, compliance certificates, annual returns, director amendments and business consulting.", next: "We can identify which compliance services apply to your business and then prepare the enquiry for professional review and quotation." },
    LEGAL: { title: "Legal Services", overview: "We provide legal advice and drafting support including contracts, commercial agreements, settlements, powers of attorney, affidavits, appeals, mediation, negotiations, notary services, legal opinions and corporate advisory.", next: "Legal matters depend on the facts and documents involved, so substantive legal work remains subject to human review." }
});

function normalise(value) { return String(value || "").trim().toUpperCase(); }
function isPricingIntent(intent) { return ["PRICING", "PAYMENT", "PAYMENT_PROOF"].includes(normalise(intent)); }
function directoryText() { return PUBLIC_SERVICE_DIRECTORY.map(category => `${category.name}: ${category.services.map(service => service.name).join(", ")}`).join("\n"); }

function getQualificationState(context) {
    if (!context) return { stage: 0, qualified: false };
    context.publicLead = context.publicLead || { stage: 0, qualified: false, answers: [] };
    context.publicLead.stage = Number(context.publicLead.stage || 0);
    context.publicLead.answers = Array.isArray(context.publicLead.answers) ? context.publicLead.answers : [];
    context.publicLead.qualified = context.publicLead.qualified === true;
    return context.publicLead;
}

function qualificationReply(state, serviceName) {
    if (state.stage === 0) {
        state.stage = 1;
        return `I have identified ${serviceName}. This website AI provides a free 15-minute preliminary consultation to understand your enquiry before you sign up.\n\nFirst question: is this for an individual or a business, and what outcome are you hoping to achieve?`;
    }
    if (state.stage === 1) {
        state.stage = 2;
        return "Thank you. Second question: briefly tell me what has happened so far, including any important dates, notices, applications, disputes or deadlines.";
    }
    if (state.stage === 2) {
        state.stage = 3;
        return "Thank you. Final question: how urgent is the matter, and do you already have any documents or information that you can provide to Isaacs & Partners?";
    }
    state.qualified = true;
    return `Thank you. I have enough preliminary information to prepare your enquiry for the next step.\n\nYour enquiry is now ready for account creation. Creating an account allows Isaacs & Partners to capture your details, retain the enquiry and move it toward the appropriate professional consultation or quotation.\n\nThe AI consultation is free for 15 minutes. Any subsequent paid professional consultation or substantive work will be explained to you before it proceeds.`;
}

export default async function publicLeadResponseGenerator({ body, intent, servicePlan, context } = {}) {
    const domain = normalise(servicePlan?.domain);
    const guidance = SERVICE_GUIDANCE[domain];
    const serviceName = servicePlan?.service?.name;
    const question = String(body || "").trim();
    const intentName = normalise(intent?.intent);

    if (intentName === "GREETING") return `Hi, welcome to Isaacs & Partners. I’m your AI Liaison and your first step is a free 15-minute preliminary consultation. We have four main service categories:\n\n${directoryText()}\n\nChoose a category and service from the menus above, or tell me what you need in your own words. I can also handle common misspellings and close references.`;
    if (!question) return null;

    if (!guidance || !serviceName) return `I want to make sure I place your enquiry in the correct Isaacs & Partners service. Please choose one of the four categories and then the closest sub-category from the menus above:\n\n${directoryText()}\n\nIf you are unsure, tell me what happened and I will help identify the closest service.`;

    const state = getQualificationState(context);

    if (isPricingIntent(intentName)) {
        return `${guidance.title} — ${serviceName}\n\nI can explain the service and tell you what information the team will need, but I will not invent or issue a binding quotation. Substantive work requires staff-reviewed pricing. I can first complete the free 15-minute preliminary consultation with you and then prepare the enquiry for signup.`;
    }

    if (intentName === "GREETING") return `Welcome. I have identified ${serviceName}. Tell me what you need help with and I will guide you through the free 15-minute preliminary consultation.`;

    if (!state.qualified) {
        state.answers.push(question);
        return `${guidance.title} — ${serviceName}\n\n${guidance.overview}\n\n${guidance.next}\n\n${qualificationReply(state, serviceName)}`;
    }

    return `Your ${serviceName} enquiry is already prepared for signup. Create your account so we can securely capture your information and move the matter toward the appropriate Isaacs & Partners team member. The AI consultation is free for 15 minutes; any paid professional consultation or substantive work will be explained before it proceeds.`;
}
