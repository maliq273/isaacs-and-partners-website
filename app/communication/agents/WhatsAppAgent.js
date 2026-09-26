import ServiceIntelligenceEngine from "../../ai/ServiceIntelligenceEngine.js";
import ServiceClassifier from "../../ai/classifier/ServiceClassifier.js";
import WhatsAppIntentClassifier from "../classifiers/WhatsAppIntentClassifier.js";
import ConversationService, { CONVERSATION_STATES } from "../services/ConversationService.js";
import HandoverService from "../services/HandoverService.js";
import LeadService from "../services/LeadService.js";
import SalesService from "../services/SalesService.js";
import EscalationHandler from "../handlers/EscalationHandler.js";
import StaffAuthorityService from "../services/StaffAuthorityService.js";
import CommercialPolicyService from "../services/CommercialPolicyService.js";
import CustomerMemoryService from "../../ai/CustomerMemoryService.js";
import AuthorityActionService from "../../ai/AuthorityActionService.js";
import Communication from "../../models/Communication.js";
import CostingModelService from "../../ai/CostingModelService.js";

export { CONVERSATION_STATES };

export const WHATSAPP_IDENTITY_STATES = Object.freeze({
    NEW: "NEW", ASK_WHATSAPP_CONSENT: "ASK_WHATSAPP_CONSENT", ASK_MATTER: "ASK_MATTER", ASK_EMAIL: "ASK_EMAIL",
    ASK_NAME: "ASK_NAME", ASK_ACCOUNT_TYPE: "ASK_ACCOUNT_TYPE", IDENTITY_MATCHING: "IDENTITY_MATCHING",
    STAFF_PENDING_APPROVAL: "STAFF_PENDING_APPROVAL", CLIENT_PENDING_APPROVAL: "CLIENT_PENDING_APPROVAL",
    AUTHENTICATED_CLIENT: "AUTHENTICATED_CLIENT", AUTHENTICATED_STAFF: "AUTHENTICATED_STAFF"
});
const YES = new Set(["yes", "y", "yeah", "yep", "sure", "correct", "ok", "okay", "please do", "i do"]);
const NO = new Set(["no", "n", "nope", "not really", "not now"]);
const STAFF_WORDS = ["staff", "employee", "team member", "employee of isaacs", "isaacs staff", "i work here"];
const CLIENT_WORDS = ["client", "customer", "potential client", "new client"];
function clean(value, max = 4096) { return String(value ?? "").trim().slice(0, max); }
function normalise(value) { return clean(value, 512).toLowerCase().replace(/[’']/g, "'").replace(/\s+/g, " ").trim(); }
function looksLikeEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(clean(value, 320)); }
function splitName(value) { const text = clean(value, 255).replace(/^(my name is|i am|i'm|name is)\s+/i, "").trim(); const parts = text.split(/\s+/).filter(Boolean); if (parts.length < 2) return { firstName: parts[0] || null, lastName: null }; return { firstName: parts.slice(0, -1).join(" "), lastName: parts.at(-1) }; }
function classifyAccountType(value) { const text = normalise(value); if (STAFF_WORDS.some(item => text.includes(item))) return "STAFF"; if (CLIENT_WORDS.some(item => text.includes(item))) return "CLIENT"; if (/\b(2|two)\b/.test(text) || text.includes("potential")) return "CLIENT"; if (/\b(1|one)\b/.test(text) || text.includes("employee")) return "STAFF"; return null; }

export default class WhatsAppAgent {
    constructor({ serviceCatalog = null, pricingPolicy = null, responseGenerator = null, mode = "OPERATIONS", db = null } = {}) {
        this.intentClassifier = new WhatsAppIntentClassifier(); this.serviceClassifier = new ServiceClassifier();
        this.serviceIntelligence = new ServiceIntelligenceEngine({ serviceCatalog, pricingPolicy }); this.conversations = new ConversationService();
        this.costingModel = new CostingModelService({ pricing: pricingPolicy, catalog: serviceCatalog });
        this.memory = new CustomerMemoryService(); this.handover = new HandoverService(); this.leads = new LeadService(); this.sales = new SalesService();
        this.escalations = new EscalationHandler(); this.authority = new StaffAuthorityService(); this.commercial = new CommercialPolicyService();
        this.actionService = db ? new AuthorityActionService({ db }) : null;
        this.responseGenerator = responseGenerator; this.mode = String(mode || "OPERATIONS").toUpperCase();
    }
    isUnauthenticatedContact(contact) { return String(contact?.identity_status || "").toUpperCase() === "UNAUTHENTICATED_WHATSAPP_CONTACT"; }
    isAuthenticatedAuthority(operationalContext = null) {
        const authority = operationalContext?.authorityContext;
        return Boolean(authority?.authenticated && ["STAFF", "SUPER_ADMIN", "DIRECTOR", "PARTNER", "SHAREHOLDER", "STAKEHOLDER"].includes(String(authority.authorityRole || "").toUpperCase()));
    }

    async handleOnboarding({ contact = null, body, conversation = null } = {}) {
        const current = String(contact?.onboarding_state || conversation?.onboardingState || "NEW").toUpperCase(); const facts = { ...(conversation?.facts || {}) };
        const text = clean(body); const lower = normalise(text); const next = { handled: true, action: "RESPOND", onboarding: true, facts, nextState: current, reply: "" };
        if (current === WHATSAPP_IDENTITY_STATES.NEW) { next.nextState = WHATSAPP_IDENTITY_STATES.ASK_WHATSAPP_CONSENT; next.reply = "Hello and welcome to Isaacs & Partners. I’m here to help with your enquiry and, when needed, connect you with the right member of our team. Before we get started, is WhatsApp your preferred way to communicate with us?"; return next; }
        if (current === WHATSAPP_IDENTITY_STATES.ASK_WHATSAPP_CONSENT) { if (YES.has(lower)) { facts.whatsappConsent = true; facts.preferredChannel = "WHATSAPP"; next.nextState = WHATSAPP_IDENTITY_STATES.ASK_MATTER; next.reply = "Perfect, thank you. I’ll keep WhatsApp as your preferred communication channel. What can I help you with today?"; } else if (NO.has(lower)) { facts.whatsappConsent = false; facts.preferredChannel = null; next.nextState = WHATSAPP_IDENTITY_STATES.ASK_MATTER; next.reply = "No problem. What can I help you with today?"; } else { next.nextState = WHATSAPP_IDENTITY_STATES.ASK_WHATSAPP_CONSENT; next.reply = "Just so I record this correctly, is WhatsApp your preferred way to communicate with Isaacs & Partners — yes or no?"; } return next; }
        if (current === WHATSAPP_IDENTITY_STATES.ASK_MATTER) { facts.enquiry = text; next.nextState = WHATSAPP_IDENTITY_STATES.ASK_EMAIL; next.reply = "Thanks. What email address would you like us to associate with this WhatsApp contact?"; return next; }
        if (current === WHATSAPP_IDENTITY_STATES.ASK_EMAIL) { if (!looksLikeEmail(text)) { next.nextState = WHATSAPP_IDENTITY_STATES.ASK_EMAIL; next.reply = "Could you send me your email address? For example: name@example.com."; return next; } facts.email = clean(text, 320).toLowerCase(); next.nextState = WHATSAPP_IDENTITY_STATES.ASK_NAME; next.reply = "Thank you. What is your name and surname?"; return next; }
        if (current === WHATSAPP_IDENTITY_STATES.ASK_NAME) { const name = splitName(text); if (!name.firstName || !name.lastName) { next.nextState = WHATSAPP_IDENTITY_STATES.ASK_NAME; next.reply = "Please send me both your first name and surname so I can record you correctly."; return next; } facts.firstName = name.firstName; facts.lastName = name.lastName; next.nextState = WHATSAPP_IDENTITY_STATES.ASK_ACCOUNT_TYPE; next.reply = `Thanks, ${name.firstName}. Are you contacting us as 1) an Isaacs & Partners staff member, or 2) a potential client?`; return next; }
        if (current === WHATSAPP_IDENTITY_STATES.ASK_ACCOUNT_TYPE) {
            const accountType = classifyAccountType(text);
            if (!accountType) {
                next.nextState = WHATSAPP_IDENTITY_STATES.ASK_ACCOUNT_TYPE;
                next.reply = "Please reply with 1 for an Isaacs & Partners staff member, or 2 for a potential client.";
                return next;
            }
            facts.claimedAccountType = accountType;
            facts.registrationStatus = "PENDING_ADMIN_APPROVAL";
            next.nextState = accountType === "STAFF" ? WHATSAPP_IDENTITY_STATES.STAFF_PENDING_APPROVAL : WHATSAPP_IDENTITY_STATES.CLIENT_PENDING_APPROVAL;
            next.identityMatchRequired = true;
            next.approvalRequired = true;
            next.reply = "Thank you. Your information has been saved to the Isaacs & Partners database. Your WhatsApp contact has been linked to your registration request. Your dashboard is not active yet because an authorised member of our team must review and approve your account. We will continue assisting you here on WhatsApp while your account is awaiting activation.";
            return next;
        }
        if (current === WHATSAPP_IDENTITY_STATES.IDENTITY_MATCHING) {
            next.nextState = facts.claimedAccountType === "STAFF" ? WHATSAPP_IDENTITY_STATES.STAFF_PENDING_APPROVAL : WHATSAPP_IDENTITY_STATES.CLIENT_PENDING_APPROVAL;
            next.reply = "Your registration is still awaiting authorised review. Your WhatsApp enquiry remains active and we can continue assisting you here.";
            next.approvalRequired = true;
            return next;
        }
        if (current === WHATSAPP_IDENTITY_STATES.STAFF_PENDING_APPROVAL || current === WHATSAPP_IDENTITY_STATES.CLIENT_PENDING_APPROVAL) {
            next.handled = false;
            next.onboarding = false;
            next.pendingApproval = true;
            next.nextState = current;
            next.facts = facts;
            return next;
        }
        return null;
    }

    async handleInbound({ chatId, phoneNumber = null, body, messageId = null, user = null, matter = null, operationalContext = null, conversation = null, contact = null, historicalMemory = null } = {}) {
        if (!chatId) throw new Error("WhatsApp chatId is required."); if (!String(body || "").trim()) return { handled: false, reason: "EMPTY_MESSAGE" };
        const context = conversation || this.conversations.createContext({ chatId, phoneNumber, user, matter }); this.conversations.ensureContext(context);
        this.conversations.addMessage(context, { direction: "INBOUND", body, sender: "CLIENT", messageId });
        // Unauthenticated prospects are handled directly via Gemini AI response generator without static onboarding traps.
        if (this.actionService && this.isAuthenticatedAuthority(operationalContext)) {
            const actionResult = await this.actionService.execute({ identity: operationalContext.authorityContext, message: body, conversationId: context?.id || null });
            if (actionResult?.handled) return { ...actionResult, context, intent: { intent: actionResult.action || "AUTHORITY_ACTION", confidence: 1 } };
        }

        this.memory.observe(context, { body, user, contact, onboardingFacts: contact?.onboarding_facts || context?.facts || {}, conversationId: context?.id || null, sourceMessageId: messageId });
        const intent = this.intentClassifier.classify({ message: body }); const serviceMatch = this.serviceClassifier.classify({ message: body });
        const servicePlan = this.serviceIntelligence.buildPlan({ domain: serviceMatch.value, serviceId: serviceMatch.serviceId || null, serviceName: serviceMatch.serviceName || null, facts: context.facts, clientType: user?.user_metadata?.account_type || "INDIVIDUAL" });
        const assessment = this.handover.assess({ intent: intent.intent, message: body, servicePlan, confidence: intent.confidence });
        const lead = this.leads.qualify({ message: body, user, service: servicePlan.service, facts: context.facts });
        context.lastIntent = intent.intent; context.lastService = servicePlan.service; this.conversations.mergeFacts(context, lead.facts);
        if (context.state === "HUMAN_ACTIVE") return { handled: true, action: "ROUTE_TO_HUMAN", context, intent, lead, servicePlan };
        const sales = this.sales.buildState({ servicePlan, lead, quote: matter?.quote || null, invoice: matter?.invoice || null, payment: matter?.payment || null, applicationComplete: Boolean(matter?.applicationComplete) });

        // Compile price quote from the costing model if query asks for quotes/pricing
        const isPricingInquiry = this.costingModel.isPricingOrQuoteInquiry(body, intent?.intent, servicePlan);
        let compiledQuote = null;
        if (isPricingInquiry) {
            compiledQuote = this.costingModel.compilePriceQuote({
                domain: servicePlan.domain,
                serviceId: servicePlan.service?.id || null,
                serviceName: servicePlan.service?.name || null,
                message: body,
                facts: context.facts,
                clientType: user?.user_metadata?.account_type || "INDIVIDUAL",
                // Costing Centre data must be supplied by the trusted operational
                // context. Without an approved record Anthony must escalate rather
                // than use a hard-coded fallback price.
                costingCentre: operationalContext?.costingCentre ?? {}
            });
        }

        let replyResult = null;
        let reply = "";
        if (isPricingInquiry && compiledQuote?.status === "PRICING_REQUIRED_FROM_SUPER_ADMIN") {
            reply = "I have confirmed the service you are enquiring about. I do not have an approved price in our Costing Centre yet, so I will obtain the applicable fee from our Super Admin before giving you a quotation.";
            replyResult = {
                text: reply,
                provider: "COSTING_CENTRE",
                model: "AnthonyCommercialWorkflow",
                requiresApproval: true,
                approval_needed: true,
                pricingRequiredFromSuperAdmin: true
            };
        } else if (isPricingInquiry && compiledQuote) {
            reply = compiledQuote.clientQuoteText;
            replyResult = {
                text: reply,
                provider: "COSTING_MODEL",
                model: "CostingModelService",
                requiresApproval: false,
                approval_needed: false
            };
        } else {
            replyResult = await this.generateReply({ context, body, intent, servicePlan, lead, sales, user, matter, operationalContext, historicalMemory });
            reply = typeof replyResult === "object" ? replyResult?.text : replyResult;
        }

        // When the AI query has been fully processed (reply generated),
        // determine if it is pending human review (for quotes/pricing: must compile price and ask approval before sending to client)
        const pendingReview = Boolean(
            (isPricingInquiry && compiledQuote?.status !== "PRICE_AVAILABLE") ||
            compiledQuote?.requiresApproval ||
            compiledQuote?.status === "PRICING_REQUIRED_FROM_SUPER_ADMIN" ||
            assessment?.humanRequired ||
            operationalContext?.requiresApproval ||
            operationalContext?.pendingReview ||
            operationalContext?.approval_needed ||
            (typeof replyResult === "object" && (replyResult?.requiresApproval || replyResult?.approvalNeeded || replyResult?.approval_needed || replyResult?.pendingReview)) ||
            context?.approval_needed ||
            context?.facts?.approval_needed ||
            (servicePlan?.commercial?.quoteApprovalRequired && ["PRICING", "QUOTE", "PAYMENT"].includes(intent?.intent))
        );

        if (pendingReview) {
            this.transitionToApprovalNeeded(context, { assessment, proposedReply: reply, compiledQuote });

            const communication = new Communication({
                matterId: matter?.id || context?.matter?.id || null,
                clientId: user?.id || context?.user?.id || null,
                userId: user?.id || context?.user?.id || null,
                channel: "WHATSAPP",
                direction: "OUTBOUND",
                subject: intent?.intent ? `AI Response: ${intent.intent}` : (isPricingInquiry ? "Quotation Estimate" : "WhatsApp AI Consultation"),
                message: reply || "",
                recipient: phoneNumber || context?.phoneNumber || null,
                sender: "ANTHONY_AI",
                status: "APPROVAL_NEEDED",
                threadId: chatId || context?.chatId || null,
                approval_needed: true,
                metadata: {
                    approval_needed: true,
                    is_pricing: isPricingInquiry,
                    compiled_quote: compiledQuote || null
                }
            });

            return {
                handled: true,
                action: "APPROVAL_NEEDED",
                state: CONVERSATION_STATES.APPROVAL_NEEDED,
                approval_needed: true,
                approvalNeeded: true,
                requiresApproval: true,
                pendingReview: true,
                context,
                intent,
                lead,
                servicePlan,
                sales,
                reply,
                proposedReply: reply,
                compiledQuote,
                communication,
                assessment,
                reasons: assessment?.reasons || (isPricingInquiry ? ["Price quote compiled from costing model awaiting Super Admin verification."] : []),
                aiProvider: typeof replyResult === "object" ? replyResult?.provider || null : null,
                aiModel: typeof replyResult === "object" ? replyResult?.model || null : null,
                companySources: typeof replyResult === "object" ? replyResult?.companySources || [] : []
            };
        }

        return {
            handled: true,
            action: "RESPOND",
            context,
            intent,
            lead,
            servicePlan,
            sales,
            reply,
            aiProvider: typeof replyResult === "object" ? replyResult?.provider || null : null,
            aiModel: typeof replyResult === "object" ? replyResult?.model || null : null,
            companySources: typeof replyResult === "object" ? replyResult?.companySources || [] : []
        };
    }

    transitionToApprovalNeeded(context, { assessment = null, proposedReply = null, compiledQuote = null, reason = "Pending human review" } = {}) {
        this.conversations.setState(context, CONVERSATION_STATES.APPROVAL_NEEDED);
        context.approval_needed = true;
        if (!context.facts || typeof context.facts !== "object" || Array.isArray(context.facts)) context.facts = {};
        context.facts.approval_needed = true;
        if (proposedReply) context.facts.proposedReply = proposedReply;
        if (compiledQuote) context.facts.compiledQuote = compiledQuote;
        context.handover = {
            ...(context.handover || {}),
            ...(assessment || {}),
            reason,
            proposedReply,
            compiledQuote,
            pendingReview: true,
            approval_needed: true,
            pendingApprovalAt: new Date().toISOString()
        };
        return context;
    }
    canStaffAnswer(staff, servicePlan = {}) { return this.authority.canAnswer(staff) && this.authority.canHandleDomain(staff, servicePlan.domain); }
    canStaffProvidePricing(staff) { return this.authority.canPrice(staff); }
    canStaffApproveQuote(staff) { return this.authority.canApproveQuote(staff); }
    getCommercialRule(servicePlan, options = {}) { return this.commercial.getRule(servicePlan?.domain, options); }
    async generateReply({ body, intent, servicePlan, sales, context = null, lead = null, user = null, matter = null, operationalContext = null, historicalMemory = null } = {}) {
        const authorityFirst = this.isAuthenticatedAuthority(operationalContext); const usableHistoricalMemory = authorityFirst ? null : historicalMemory; const strongest = usableHistoricalMemory?.strongestExplicitMemory;
        if (usableHistoricalMemory?.isCorrection && strongest?.value_text) return `You’re right — I got that wrong. You previously told me you were interested in ${strongest.value_text}. I’ll treat that as the correct information going forward.`;
        if (usableHistoricalMemory?.isHistoricalRecall && strongest?.value_text) return `You previously told me you were interested in ${strongest.value_text}.`;
        if (this.responseGenerator) { const generated = await this.responseGenerator({ body, intent, servicePlan, sales, context, lead, user, matter, operationalContext, historicalMemory: usableHistoricalMemory }); if (generated) return generated; }
        if (intent.intent === "GREETING") return "Hello, it’s good to hear from you. How can I help today?";
        if (intent.intent === "STATUS") { const matters = Array.isArray(operationalContext?.matters) ? operationalContext.matters : Array.isArray(operationalContext?.userMatters) ? operationalContext.userMatters : []; const hasMatters = matter || matters.length > 0; if (!hasMatters) return "I don’t currently see an active matter linked to this contact in our live records. If you’re making a new enquiry, tell me what you need help with and I’ll guide you from there."; if (matters.length === 1) { const m = matters[0]; return `I can see your active matter (${m.matter_number || m.reference || m.title || "Matter"}). Status: ${m.status || "In Progress"}${m.workflow_status ? ` (${m.workflow_status})` : ""}. How can I assist you with this matter today?`; } return "I can help with that. Please send me your matter number or reference so I can check the correct record."; }
        if (intent.intent === "DOCUMENTS") return "Absolutely. Tell me which service or application you’re dealing with, and I’ll help you work out what documents are needed.";
        if (intent.intent === "APPOINTMENT") return "Of course. Tell me which service you need and, if you already have a preferred day or time, include that as well.";
        if (intent.intent === "PAYMENT" || intent.intent === "PAYMENT_PROOF") return this.sales.buildPaymentResponse(null);
        if (servicePlan?.commercial?.quoteRequired) return this.commercial.getClientPaymentInstruction(servicePlan.domain);
        if (intent.intent === "PRICING") return servicePlan.service ? `I can see you’re asking about ${servicePlan.service.name}. I’ll capture the enquiry so the team can provide the applicable quotation rather than guessing at a price.` : "Tell me which service you’re interested in and I’ll point you in the right direction.";
        if (servicePlan.service) return `I understand you’re asking about ${servicePlan.service.name}. Tell me a little more about what you’re trying to achieve, and I’ll take it from there.`;
        return "Thanks for reaching out to Isaacs & Partners. Tell me what you need help with, and I’ll guide you from there.";
    }
    handoverReply() { return "I understand. This needs an authorised team member to review, so I’ve referred it to the appropriate person. I’ll keep the conversation connected here so you don’t have to start again."; }
}
