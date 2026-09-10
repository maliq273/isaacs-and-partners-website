import ServiceIntelligenceEngine from "../../ai/ServiceIntelligenceEngine.js";
import ServiceClassifier from "../../ai/classifier/ServiceClassifier.js";
import WhatsAppIntentClassifier from "../classifiers/WhatsAppIntentClassifier.js";
import ConversationService from "../services/ConversationService.js";
import HandoverService from "../services/HandoverService.js";
import LeadService from "../services/LeadService.js";
import SalesService from "../services/SalesService.js";
import EscalationHandler from "../handlers/EscalationHandler.js";
import StaffAuthorityService from "../services/StaffAuthorityService.js";
import CommercialPolicyService from "../services/CommercialPolicyService.js";

export const WHATSAPP_IDENTITY_STATES = Object.freeze({
    NEW: "NEW",
    ASK_WHATSAPP_CONSENT: "ASK_WHATSAPP_CONSENT",
    ASK_MATTER: "ASK_MATTER",
    ASK_EMAIL: "ASK_EMAIL",
    ASK_NAME: "ASK_NAME",
    ASK_ACCOUNT_TYPE: "ASK_ACCOUNT_TYPE",
    IDENTITY_MATCHING: "IDENTITY_MATCHING",
    STAFF_PENDING_APPROVAL: "STAFF_PENDING_APPROVAL",
    CLIENT_PENDING_APPROVAL: "CLIENT_PENDING_APPROVAL",
    AUTHENTICATED_CLIENT: "AUTHENTICATED_CLIENT",
    AUTHENTICATED_STAFF: "AUTHENTICATED_STAFF"
});

const YES = new Set(["yes", "y", "yeah", "yep", "sure", "correct", "ok", "okay", "please do", "i do"]);
const NO = new Set(["no", "n", "nope", "not really", "not now"]);
const STAFF_WORDS = ["staff", "employee", "team member", "employee of isaacs", "isaacs staff", "i work here"];
const CLIENT_WORDS = ["client", "customer", "potential client", "new client", "customer"];

function clean(value, max = 4096) { return String(value ?? "").trim().slice(0, max); }
function normalise(value) { return clean(value, 512).toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim(); }
function looksLikeEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(clean(value, 320)); }
function splitName(value) {
    const text = clean(value, 255).replace(/^(my name is|i am|i'm|name is)\s+/i, "").trim();
    const parts = text.split(/\s+/).filter(Boolean);
    if (parts.length < 2) return { firstName: parts[0] || null, lastName: null };
    return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1) };
}
function classifyAccountType(value) {
    const text = normalise(value);
    if (STAFF_WORDS.some(item => text.includes(item))) return "STAFF";
    if (CLIENT_WORDS.some(item => text.includes(item))) return "CLIENT";
    if (/\b(2|two)\b/.test(text) || text.includes("potential")) return "CLIENT";
    if (/\b(1|one)\b/.test(text) || text.includes("employee")) return "STAFF";
    return null;
}

export default class WhatsAppAgent {
    constructor({ serviceCatalog = null, pricingPolicy = null, responseGenerator = null, mode = "OPERATIONS" } = {}) {
        this.intentClassifier = new WhatsAppIntentClassifier();
        this.serviceClassifier = new ServiceClassifier();
        this.serviceIntelligence = new ServiceIntelligenceEngine({ serviceCatalog, pricingPolicy });
        this.conversations = new ConversationService();
        this.handover = new HandoverService();
        this.leads = new LeadService();
        this.sales = new SalesService();
        this.escalations = new EscalationHandler();
        this.authority = new StaffAuthorityService();
        this.commercial = new CommercialPolicyService();
        this.responseGenerator = responseGenerator;
        this.mode = String(mode || "OPERATIONS").toUpperCase();
    }

    isUnauthenticatedContact(contact) {
        return String(contact?.identity_status || "").toUpperCase() === "UNAUTHENTICATED_WHATSAPP_CONTACT";
    }

    async handleOnboarding({ contact = null, body, conversation = null } = {}) {
        const current = String(contact?.onboarding_state || conversation?.onboardingState || "NEW").toUpperCase();
        const facts = { ...(conversation?.facts || {}) };
        const text = clean(body);
        const lower = normalise(text);
        const next = { handled: true, action: "RESPOND", onboarding: true, facts, nextState: current, reply: "" };

        if (current === WHATSAPP_IDENTITY_STATES.NEW) {
            next.nextState = WHATSAPP_IDENTITY_STATES.ASK_WHATSAPP_CONSENT;
            next.reply = "Hello and welcome to Isaacs & Partners. I can assist with your enquiry and connect you with the appropriate member of our team. Before we continue, may I confirm whether WhatsApp is your preferred method of communication with Isaacs & Partners?";
            return next;
        }

        if (current === WHATSAPP_IDENTITY_STATES.ASK_WHATSAPP_CONSENT) {
            if (YES.has(lower)) {
                facts.whatsappConsent = true;
                facts.preferredChannel = "WHATSAPP";
                next.nextState = WHATSAPP_IDENTITY_STATES.ASK_MATTER;
                next.reply = "Thank you. I have recorded WhatsApp as your preferred method of communication. May I ask what matter or service I can assist you with today?";
            } else if (NO.has(lower)) {
                facts.whatsappConsent = false;
                facts.preferredChannel = null;
                next.nextState = WHATSAPP_IDENTITY_STATES.ASK_MATTER;
                next.reply = "Thank you. May I ask what matter or service I can assist you with today?";
            } else {
                next.nextState = WHATSAPP_IDENTITY_STATES.ASK_WHATSAPP_CONSENT;
                next.reply = "Please confirm yes or no: is WhatsApp your preferred method of communication with Isaacs & Partners?";
            }
            return next;
        }

        if (current === WHATSAPP_IDENTITY_STATES.ASK_MATTER) {
            facts.enquiry = text;
            next.nextState = WHATSAPP_IDENTITY_STATES.ASK_EMAIL;
            next.reply = "Thank you. What email address should we associate with your WhatsApp contact?";
            return next;
        }

        if (current === WHATSAPP_IDENTITY_STATES.ASK_EMAIL) {
            if (!looksLikeEmail(text)) {
                next.nextState = WHATSAPP_IDENTITY_STATES.ASK_EMAIL;
                next.reply = "Please provide a valid email address, for example name@example.com.";
                return next;
            }
            facts.email = clean(text, 320).toLowerCase();
            next.nextState = WHATSAPP_IDENTITY_STATES.ASK_NAME;
            next.reply = "Thank you. May I have your name and surname?";
            return next;
        }

        if (current === WHATSAPP_IDENTITY_STATES.ASK_NAME) {
            const name = splitName(text);
            if (!name.firstName || !name.lastName) {
                next.nextState = WHATSAPP_IDENTITY_STATES.ASK_NAME;
                next.reply = "Please provide both your first name and surname.";
                return next;
            }
            facts.firstName = name.firstName;
            facts.lastName = name.lastName;
            next.nextState = WHATSAPP_IDENTITY_STATES.ASK_ACCOUNT_TYPE;
            next.reply = "Thank you. Are you contacting us as: 1. an Isaacs & Partners staff member, or 2. a potential client?";
            return next;
        }

        if (current === WHATSAPP_IDENTITY_STATES.ASK_ACCOUNT_TYPE) {
            const accountType = classifyAccountType(text);
            if (!accountType) {
                next.nextState = WHATSAPP_IDENTITY_STATES.ASK_ACCOUNT_TYPE;
                next.reply = "Please reply with 1 for an Isaacs & Partners staff member, or 2 for a potential client.";
                return next;
            }
            facts.claimedAccountType = accountType;
            next.nextState = WHATSAPP_IDENTITY_STATES.IDENTITY_MATCHING;
            next.identityMatchRequired = true;
            next.reply = "Thank you. I am checking the information you provided against the Isaacs & Partners system. No dashboard access or staff permissions will be activated until the required approval has been completed.";
            return next;
        }

        if ([WHATSAPP_IDENTITY_STATES.IDENTITY_MATCHING, WHATSAPP_IDENTITY_STATES.STAFF_PENDING_APPROVAL, WHATSAPP_IDENTITY_STATES.CLIENT_PENDING_APPROVAL].includes(current)) {
            next.nextState = current;
            next.reply = "Thank you. Your information has been saved to the Isaacs & Partners database. Your WhatsApp contact is linked to your registration request. Your dashboard is not active yet because an authorised staff member must review and approve your account. We will continue assisting you here on WhatsApp while your account is awaiting activation.";
            return next;
        }

        return null;
    }

    async handleInbound({ chatId, phoneNumber = null, body, messageId = null, user = null, matter = null, operationalContext = null, conversation = null, contact = null } = {}) {
        if (!chatId) throw new Error("WhatsApp chatId is required.");
        if (!String(body || "").trim()) return { handled: false, reason: "EMPTY_MESSAGE" };

        const context = conversation || this.conversations.createContext({ chatId, phoneNumber, user, matter });
        this.conversations.addMessage(context, { direction: "INBOUND", body, sender: "CLIENT", messageId });

        if (this.isUnauthenticatedContact(contact) || (!user && contact)) {
            const onboardingResult = await this.handleOnboarding({ contact, body, conversation: context });
            if (onboardingResult) {
                this.conversations.mergeFacts(context, onboardingResult.facts);
                context.onboardingState = onboardingResult.nextState;
                return { ...onboardingResult, context };
            }
        }

        const intent = this.intentClassifier.classify({ message: body });
        const serviceMatch = this.serviceClassifier.classify({ message: body });
        const servicePlan = this.serviceIntelligence.buildPlan({
            domain: serviceMatch.value,
            serviceId: serviceMatch.serviceId || null,
            serviceName: serviceMatch.serviceName || null,
            facts: context.facts,
            clientType: user?.user_metadata?.account_type || "INDIVIDUAL"
        });
        const assessment = this.handover.assess({ intent: intent.intent, message: body, servicePlan, confidence: intent.confidence });
        const lead = this.leads.qualify({ message: body, user, service: servicePlan.service, facts: context.facts });

        context.lastIntent = intent.intent;
        context.lastService = servicePlan.service;
        this.conversations.mergeFacts(context, lead.facts);

        if (context.state === "HUMAN_ACTIVE") return { handled: true, action: "ROUTE_TO_HUMAN", context, intent, lead, servicePlan };

        if (this.mode !== "PUBLIC_LEAD" && assessment.humanRequired) {
            this.handover.escalate(context, assessment);
            const escalation = this.escalations.create({ context, assessment, lead, servicePlan });
            escalation.requiredCapabilities = this.authority.getRequiredCapabilities({ domain: servicePlan.domain, needsPricing: servicePlan.commercial?.quoteRequired === true, needsAppointment: intent.intent === "APPOINTMENT" });
            escalation.superAdminRequired = true;
            return { handled: true, action: "ESCALATE", context, intent, lead, servicePlan, escalation, reply: this.handoverReply() };
        }

        const sales = this.sales.buildState({ servicePlan, lead });
        const replyResult = await this.generateReply({ context, body, intent, servicePlan, lead, sales, user, matter, operationalContext });
        const reply = typeof replyResult === "object" ? replyResult?.text : replyResult;
        return { handled: true, action: "RESPOND", context, intent, lead, servicePlan, sales, reply, aiProvider: typeof replyResult === "object" ? replyResult?.provider || null : null, aiModel: typeof replyResult === "object" ? replyResult?.model || null : null, companySources: typeof replyResult === "object" ? replyResult?.companySources || [] : [] };
    }

    canStaffAnswer(staff, servicePlan = {}) { return this.authority.canAnswer(staff) && this.authority.canHandleDomain(staff, servicePlan.domain); }
    canStaffProvidePricing(staff) { return this.authority.canPrice(staff); }
    canStaffApproveQuote(staff) { return this.authority.canApproveQuote(staff); }
    getCommercialRule(servicePlan, options = {}) { return this.commercial.getRule(servicePlan?.domain, options); }

    async generateReply({ body, intent, servicePlan, sales, context = null, lead = null, user = null, matter = null, operationalContext = null } = {}) {
        if (this.responseGenerator) {
            const generated = await this.responseGenerator({ body, intent, servicePlan, sales, context, lead, user, matter, operationalContext });
            if (generated) return generated;
        }
        if (intent.intent === "GREETING") return "Hello and welcome to Isaacs & Partners. How may we assist you today?";
        if (intent.intent === "STATUS") {
            const hasMatters = matter || (Array.isArray(operationalContext?.userMatters) && operationalContext.userMatters.length > 0);
            if (!hasMatters) return "I don't currently see an active matter linked to your account. If you would like to open a file or make an enquiry, please let us know.";
            return "Please provide your matter number so I can route your status request to the correct client record.";
        }
        if (intent.intent === "DOCUMENTS") return "Please tell me which service or application you are dealing with so I can guide you on the document process.";
        if (intent.intent === "APPOINTMENT") return "Please confirm the service you require and a suitable date or time so our team can arrange the appointment.";
        if (intent.intent === "PAYMENT" || intent.intent === "PAYMENT_PROOF") return this.sales.buildPaymentResponse(null);
        if (servicePlan?.commercial?.quoteRequired) return this.commercial.getClientPaymentInstruction(servicePlan.domain);
        if (intent.intent === "PRICING") return servicePlan.service ? `I have identified ${servicePlan.service.name}. I will capture your enquiry for the team to prepare the applicable quotation.` : "Please tell me which service you require so I can route the enquiry correctly.";
        if (servicePlan.service) return `Thank you. I have identified your enquiry as ${servicePlan.service.name}. Please tell me briefly what you need assistance with.`;
        return "Thank you for contacting Isaacs & Partners. Please tell me what service you need.";
    }

    handoverReply() { return "Thank you. I have referred this matter to an authorised Isaacs & Partners team member for human review. Our team will follow up with you here. Super Admin oversight has been retained for this intervention."; }
}
