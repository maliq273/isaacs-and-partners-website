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

    async handleInbound({ chatId, phoneNumber = null, body, messageId = null, user = null, matter = null, conversation = null } = {}) {
        if (!chatId) throw new Error("WhatsApp chatId is required.");
        if (!String(body || "").trim()) return { handled: false, reason: "EMPTY_MESSAGE" };

        const context = conversation || this.conversations.createContext({ chatId, phoneNumber, user, matter });
        this.conversations.addMessage(context, { direction: "INBOUND", body, sender: "CLIENT", messageId });

        const intent = this.intentClassifier.classify({ message: body });
        const serviceMatch = this.serviceClassifier.classify({ message: body });
        const servicePlan = this.serviceIntelligence.buildPlan({
            domain: serviceMatch.value,
            facts: context.facts,
            clientType: user?.user_metadata?.account_type || "INDIVIDUAL"
        });
        const assessment = this.handover.assess({
            intent: intent.intent,
            message: body,
            servicePlan,
            confidence: intent.confidence
        });
        const lead = this.leads.qualify({ message: body, user, service: servicePlan.service, facts: context.facts });

        context.lastIntent = intent.intent;
        context.lastService = servicePlan.service;
        this.conversations.mergeFacts(context, lead.facts);

        if (context.state === "HUMAN_ACTIVE") {
            return { handled: true, action: "ROUTE_TO_HUMAN", context, intent, lead, servicePlan };
        }

        // Public website mode is a lead-generation layer. It uses the same
        // classification, service intelligence, lead and sales pipeline, but
        // does not create a staff intervention from an anonymous website chat.
        // Sensitive/decision-critical matters are still clearly directed to
        // the firm rather than represented as completed by AI.
        if (this.mode !== "PUBLIC_LEAD" && assessment.humanRequired) {
            this.handover.escalate(context, assessment);
            const escalation = this.escalations.create({ context, assessment, lead, servicePlan });
            escalation.requiredCapabilities = this.authority.getRequiredCapabilities({
                domain: servicePlan.domain,
                needsPricing: servicePlan.commercial?.quoteRequired === true,
                needsAppointment: intent.intent === "APPOINTMENT"
            });
            escalation.superAdminRequired = true;
            return {
                handled: true,
                action: "ESCALATE",
                context,
                intent,
                lead,
                servicePlan,
                escalation,
                reply: this.handoverReply()
            };
        }

        const sales = this.sales.buildState({ servicePlan, lead });
        const replyResult = await this.generateReply({
            context,
            body,
            intent,
            servicePlan,
            lead,
            sales,
            user,
            matter
        });
        const reply = typeof replyResult === "object" ? replyResult?.text : replyResult;
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

    canStaffAnswer(staff, servicePlan = {}) {
        return this.authority.canAnswer(staff) && this.authority.canHandleDomain(staff, servicePlan.domain);
    }

    canStaffProvidePricing(staff) {
        return this.authority.canPrice(staff);
    }

    canStaffApproveQuote(staff) {
        return this.authority.canApproveQuote(staff);
    }

    getCommercialRule(servicePlan, options = {}) {
        return this.commercial.getRule(servicePlan?.domain, options);
    }

    async generateReply({ body, intent, servicePlan, sales, context = null, lead = null, user = null, matter = null } = {}) {
        if (this.responseGenerator) {
            const generated = await this.responseGenerator({ body, intent, servicePlan, sales, context, lead, user, matter });
            if (generated) return generated;
        }
        if (intent.intent === "GREETING") return "Hello and welcome to Isaacs & Partners. How may we assist you today?";
        if (intent.intent === "STATUS") return "Please provide your matter number so I can route your status request to the correct client record.";
        if (intent.intent === "DOCUMENTS") return "Please tell me which service or application you are dealing with so I can guide you on the document process.";
        if (intent.intent === "APPOINTMENT") return "Please confirm the service you require and a suitable date or time so our team can arrange the appointment.";
        if (intent.intent === "PAYMENT" || intent.intent === "PAYMENT_PROOF") return this.sales.buildPaymentResponse(null);
        if (servicePlan?.commercial?.quoteRequired) {
            return this.commercial.getClientPaymentInstruction(servicePlan.domain);
        }
        if (intent.intent === "PRICING") {
            return servicePlan.service
                ? `I have identified ${servicePlan.service.name}. I will capture your enquiry for the team to prepare the applicable quotation.`
                : "Please tell me which service you require so I can route the enquiry correctly.";
        }
        if (servicePlan.service) return `Thank you. I have identified your enquiry as ${servicePlan.service.name}. Please tell me briefly what you need assistance with.`;
        return "Thank you for contacting Isaacs & Partners. Please tell me what service you need.";
    }

    handoverReply() {
        return "Thank you. I have referred this matter to an authorised Isaacs & Partners team member for human review. Our team will follow up with you here. Super Admin oversight has been retained for this intervention.";
    }
}
