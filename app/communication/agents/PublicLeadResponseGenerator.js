import { PUBLIC_SERVICE_DIRECTORY } from "../public/PublicServiceDirectory.js";

/*
 * Public response layer for the existing WhatsAppAgent.
 * The service directory is the governed navigation map; substantive legal,
 * immigration and HR/IR decisions remain human-reviewed.
 */

const SERVICE_GUIDANCE = Object.freeze({
    IMMIGRATION: { title: "Immigration Services", overview: "We assist individuals and businesses with South African immigration matters, including visa applications, permanent residence pathways, citizenship, refugee and asylum assistance, DHA representations, VFS applications, status verification and appeals.", next: "The correct route depends on your circumstances, nationality, purpose of stay and supporting evidence.", cta: "Create an account so we can capture the enquiry securely and move it toward the appropriate professional review and quotation." },
    HR_IR: { title: "HR & Industrial Relations", overview: "We assist with employment contracts, HR policies, disciplinary and grievance hearings, chairperson services, performance management, retrenchment consulting, CCMA representation, bargaining council matters, payroll advisory, labour compliance, employment equity, recruitment and HR outsourcing.", next: "For disputes, hearings and representation, the facts and documents need authorised human review.", cta: "Create an account so we can capture the matter and route it to the appropriate team." },
    BUSINESS_COMPLIANCE: { title: "Business Compliance", overview: "We assist with company registration, CIPC amendments, business name reservations, SARS, VAT, PAYE, UIF, COIDA, tax clearance, business bank account setup, compliance certificates, annual returns, director amendments and business consulting.", next: "We can identify which compliance services apply to your business and then have the team review the required work and quotation.", cta: "Create a business account so we can capture your requirements and move the enquiry toward a formal quotation." },
    LEGAL: { title: "Legal Services", overview: "We provide legal advice and drafting support including contracts, commercial agreements, settlements, powers of attorney, affidavits, appeals, mediation, negotiations, notary services, legal opinions and corporate advisory.", next: "Legal matters depend on the facts and documents involved, so substantive legal work remains subject to human review.", cta: "Create an account to securely provide the relevant information and request professional assistance." }
});

function normalise(value) { return String(value || "").trim().toUpperCase(); }
function isPricingIntent(intent) { return ["PRICING", "PAYMENT", "PAYMENT_PROOF"].includes(normalise(intent)); }
function directoryText() { return PUBLIC_SERVICE_DIRECTORY.map(category => `${category.name}: ${category.services.map(service => service.name).join(", ")}`).join("\n"); }

export default async function publicLeadResponseGenerator({ body, intent, servicePlan } = {}) {
    const domain = normalise(servicePlan?.domain);
    const guidance = SERVICE_GUIDANCE[domain];
    const serviceName = servicePlan?.service?.name;
    const question = String(body || "").trim();
    const intentName = normalise(intent?.intent);

    if (intentName === "GREETING") return `Hi, welcome to Isaacs & Partners. I’m your AI Liaison. We have four main service categories:\n\n${directoryText()}\n\nChoose a category and service from the menus above, or tell me what you need in your own words. I can also handle common misspellings and close references.`;
    if (!question) return null;

    if (!guidance) return `I want to make sure I place your enquiry in the correct Isaacs & Partners service. Please choose one of the four categories and then the closest sub-category from the menus above:\n\n${directoryText()}\n\nIf you are unsure, tell me what happened and I will help identify the closest service. Once identified, I can recommend creating an account so the enquiry can be taken forward securely.`;

    if (isPricingIntent(intentName)) return `${guidance.title}${serviceName ? ` — ${serviceName}` : ""}\n\nI can explain the service and tell you what information the team will need, but I will not invent or issue a binding quotation. Substantive work requires a staff-reviewed quote. ${guidance.cta}`;

    return `${guidance.title}${serviceName ? ` — ${serviceName}` : ""}\n\n${guidance.overview}\n\n${guidance.next}\n\n${guidance.cta}`;
}
