/**
 * Isaacs & Partners — Authority Interaction Engine
 *
 * Authority-first orchestration layer for Anthony.
 *
 * This engine is intentionally separate from the prompt layer. It decides:
 *  - whether the speaker is an internal authority
 *  - which interaction mode applies
 *  - which internal intent category applies
 *  - whether normal customer qualification/sales flows must be bypassed
 *  - which relationship/session facts must persist across turns
 *  - which company-truth records must be consulted before model reasoning
 *
 * It does not grant authority. IdentityRelationshipResolutionEngine and
 * AnthonyAuthorizationEngine remain the security/authority sources of truth.
 */

const AUTHORITY_ROLES = new Set([
  "SUPER_ADMIN",
  "DIRECTOR",
  "SHAREHOLDER",
  "PARTNER",
  "STAKEHOLDER",
  "STAFF"
]);

export const AUTHORITY_INTENTS = Object.freeze({
  QUOTE_REQUEST: "QUOTE_REQUEST",
  INTERNAL_INFORMATION_REQUEST: "INTERNAL_INFORMATION_REQUEST",
  EXECUTIVE_TASK: "EXECUTIVE_TASK",
  STAFF_COORDINATION: "STAFF_COORDINATION",
  PERSONAL_REQUEST: "PERSONAL_REQUEST",
  DOCUMENT_REQUEST: "DOCUMENT_REQUEST",
  OPERATIONAL_REQUEST: "OPERATIONAL_REQUEST",
  STRATEGIC_REQUEST: "STRATEGIC_REQUEST",
  GENERAL_CONVERSATION: "GENERAL_CONVERSATION"
});

const INTENT_ORDER = Object.freeze(Object.values(AUTHORITY_INTENTS));

function clean(value, max = 4096) {
  return String(value ?? "").trim().slice(0, max);
}

function upper(value) {
  return clean(value, 128).toUpperCase();
}

function normalise(value) {
  return clean(value, 4096)
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(value, patterns) {
  return patterns.some((pattern) => pattern.test(value));
}

function isAuthority(identity) {
  return Boolean(
    identity?.verified &&
    AUTHORITY_ROLES.has(upper(identity?.authorityRole))
  );
}

function classifyInternalIntent(message) {
  const text = normalise(message);

  if (includesAny(text, [
    /\b(price|pricing|quote|quotation|cost|fee|fees|rate|rates)\b/i,
    /\b(prys|pryslys|kwotasie|kwotasie|koste|fooi|fooie|tarief|tariewe)\b/i,
    /\bwat is die prys\b/i,
    /\bwat kos\b/i
  ])) {
    return AUTHORITY_INTENTS.QUOTE_REQUEST;
  }

  if (includesAny(text, [
    /\b(get|send|find|fetch|show|give|retrieve)\b.*\b(document|file|report|invoice|quote|record)\b/i,
    /\b(stuur|kry|soek|vind|wys|haal)\b.*\b(dokument|lêer|verslag|faktuur|kwotasie|rekord)\b/i
  ])) {
    return AUTHORITY_INTENTS.DOCUMENT_REQUEST;
  }

  if (includesAny(text, [
    /\b(get|ask|tell|find|check|show|give|what is|how much|which)\b.*\b(staff|employee|team|client|customer|matter|appointment|invoice|payment|business|company|service|hr|human resources|legal|immigration)\b/i,
    /\b(kry|vra|sê|vind|kyk|wys|wat is|hoeveel|watter)\b.*\b(personeel|werknemer|span|kliënt|saak|afspraak|faktuur|betaling|besigheid|maatskappy|diens|hr|menslike hulpbronne|regs|immigrasie)\b/i
  ])) {
    return AUTHORITY_INTENTS.INTERNAL_INFORMATION_REQUEST;
  }

  if (includesAny(text, [
    /\b(schedule|book|arrange|organise|organize|remind|follow up|contact|call|get .* to|ask .* to)\b/i,
    /\b(reël|skeduleer|bespreek|organiseer|herinner|volg op|kontak|bel|kry .* om|vra .* om)\b/i
  ])) {
    return AUTHORITY_INTENTS.EXECUTIVE_TASK;
  }

  if (includesAny(text, [
    /\b(staff|employee|team|colleague|permission|permissions|delegate|assign)\b/i,
    /\b(personeel|werknemer|span|kollega|toestemming|toestemmings|delegeer|toewys)\b/i
  ])) {
    return AUTHORITY_INTENTS.STAFF_COORDINATION;
  }

  if (includesAny(text, [
    /\b(my hair|hair|love me|tell .* loves me|personal|birthday|gift|family|relationship)\b/i,
    /\b(my persoonlike|hare|lief vir my|persoonlik|verjaardag|geskenk|familie|verhouding)\b/i
  ])) {
    return AUTHORITY_INTENTS.PERSONAL_REQUEST;
  }

  if (includesAny(text, [
    /\b(strategy|strategic|plan|planning|growth|direction|priority|priorities|decision)\b/i,
    /\b(strategie|strategies|plan|beplanning|groei|rigting|prioriteit|prioriteite|besluit)\b/i
  ])) {
    return AUTHORITY_INTENTS.STRATEGIC_REQUEST;
  }

  if (includesAny(text, [
    /\b(operations|operational|workflow|deadline|task|status|outstanding|portfolio|matter)\b/i,
    /\b(operasioneel|bedryf|werkvloei|sperdatum|taak|status|uitstaande|portefeulje|saak)\b/i
  ])) {
    return AUTHORITY_INTENTS.OPERATIONAL_REQUEST;
  }

  return AUTHORITY_INTENTS.GENERAL_CONVERSATION;
}

function classifyPublicIntent(message) {
  const text = normalise(message);
  if (/\b(quote|quotation|price|pricing|cost|fee|fees|rate)\b/i.test(text) ||
      /\b(kwotasie|prys|koste|fooi|tarief)\b/i.test(text)) {
    return AUTHORITY_INTENTS.QUOTE_REQUEST;
  }
  if (/\b(document|file|report|invoice|receipt)\b/i.test(text) ||
      /\b(dokument|lêer|verslag|faktuur|kwitansie)\b/i.test(text)) {
    return AUTHORITY_INTENTS.DOCUMENT_REQUEST;
  }
  if (/\b(book|schedule|appointment|meeting)\b/i.test(text) ||
      /\b(afspraak|skeduleer|vergadering)\b/i.test(text)) {
    return AUTHORITY_INTENTS.OPERATIONAL_REQUEST;
  }
  return AUTHORITY_INTENTS.GENERAL_CONVERSATION;
}

export default class AuthorityInteractionEngine {
  constructor({ db, companyTruth } = {}) {
    if (!db) throw new Error("AuthorityInteractionEngine requires a Supabase admin client.");
    this.db = db;
    this.companyTruth = companyTruth || null;
  }

  isInternalAuthority(identity) {
    return isAuthority(identity);
  }

  classify(message, identity = null) {
    const internal = this.isInternalAuthority(identity);
    const intent = internal ? classifyInternalIntent(message) : classifyPublicIntent(message);

    return {
      intent,
      internalAuthority: internal,
      authorityRole: internal ? upper(identity.authorityRole) : null,
      mode: internal ? "EXECUTIVE_ASSISTANT" : "CUSTOMER_SERVICE",
      bypassCustomerQualification: internal,
      bypassLeadGeneration: internal,
      bypassSalesWorkflow: internal,
      bypassCommercialApprovalWorkflow: internal && intent === AUTHORITY_INTENTS.QUOTE_REQUEST
        ? false
        : internal,
      memoryMode: internal ? "AUTHORITY_RELATIONSHIP" : "CUSTOMER_RELATIONSHIP"
    };
  }

  async loadPersistedSession({ chatId, conversation = null } = {}) {
    const current = conversation?.facts?.authoritySession;
    if (current && typeof current === "object") return current;

    if (!chatId) return null;

    const result = await this.db
      .from("ai_conversations")
      .select("id,chat_id,facts,updated_at")
      .eq("channel", "WHATSAPP")
      .eq("chat_id", chatId)
      .order("updated_at", { ascending: false })
      .limit(10);

    if (result.error) throw result.error;

    for (const row of result.data || []) {
      const session = row?.facts?.authoritySession;
      if (session && typeof session === "object") return session;
    }

    return null;
  }

  buildSession({ identity, previous = null, classification }) {
    const internal = this.isInternalAuthority(identity);
    if (!internal) return previous || null;

    const firstEstablished = !previous?.identityEstablishedAt;
    const establishedAt = previous?.identityEstablishedAt || new Date().toISOString();

    return {
      version: 1,
      identityEstablished: true,
      identityEstablishedAt: establishedAt,
      identityReaffirmationRequired: false,
      identitySource: "AUTHORITY_DIRECTORY",
      authoritativeName: identity.authoritativeName || previous?.authoritativeName || null,
      authorityRole: upper(identity.authorityRole),
      internalAuthority: true,
      relationship: {
        assistantName: "Anthony Isaacs",
        relationshipType: "EXECUTIVE_ASSISTANT",
        principalName: identity.authoritativeName || previous?.authoritativeName || null,
        principalRole: upper(identity.authorityRole),
        description: "Anthony is the executive assistant, receptionist, portfolio manager, administrative assistant and staff colleague for authorised Isaacs & Partners personnel."
      },
      currentIntent: classification.intent,
      lastInteractionAt: new Date().toISOString(),
      firstEstablishedThisTurn: firstEstablished,
      historicalCustomerMemorySuppressed: true
    };
  }

  async persistSession(conversationId, session) {
    if (!conversationId || !session) return session;

    const existing = await this.db
      .from("ai_conversations")
      .select("facts")
      .eq("id", conversationId)
      .maybeSingle();

    if (existing.error) throw existing.error;

    const facts = {
      ...(existing.data?.facts || {}),
      authoritySession: session
    };

    const update = await this.db
      .from("ai_conversations")
      .update({
        facts,
        updated_at: new Date().toISOString()
      })
      .eq("id", conversationId);

    if (update.error) throw update.error;
    return session;
  }

  async companyTruthFirst(message, classification) {
    if (!this.companyTruth) {
      return {
        required: false,
        found: false,
        records: [],
        reason: "CompanyTruthService is not attached."
      };
    }

    const mustSearch = [
      AUTHORITY_INTENTS.QUOTE_REQUEST,
      AUTHORITY_INTENTS.INTERNAL_INFORMATION_REQUEST,
      AUTHORITY_INTENTS.DOCUMENT_REQUEST,
      AUTHORITY_INTENTS.OPERATIONAL_REQUEST
    ].includes(classification.intent);

    if (!mustSearch) {
      return { required: false, found: false, records: [] };
    }

    const records = this.companyTruth.search(message, { limit: 24 });
    let liveCosting = [];
    if ([AUTHORITY_INTENTS.QUOTE_REQUEST, AUTHORITY_INTENTS.INTERNAL_INFORMATION_REQUEST].includes(classification.intent)) {
      try {
        const costing = await this.db.from("service_costing_summary").select("service_id,code,name,service_domain,description,pricing_mode,default_currency,tax_rate,minimum_fee,active,direct_cost,component_billable_total,fixed_price,rule_markup_percent,effective_minimum_fee").eq("active", true);
        if (!costing.error) liveCosting = costing.data || [];
      } catch (error) {
        console.warn("Live service costing lookup failed", error);
      }
    }
    return {
      required: true,
      found: records.length > 0 || liveCosting.length > 0,
      records,
      liveCosting,
      sourcePolicy: "LIVE_SERVICE_COSTING_AND_COMPANY_TRUTH_BEFORE_GENERAL_MODEL_REASONING"
    };
  }

  async resolve({ identity, conversation, chatId, message } = {}) {
    const previous = await this.loadPersistedSession({ chatId, conversation });
    const classification = this.classify(message, identity);
    const session = this.buildSession({ identity, previous, classification });
    const companyTruth = await this.companyTruthFirst(message, classification);

    return {
      ...classification,
      session,
      companyTruth,
      identityEstablishedThisTurn: Boolean(session?.firstEstablishedThisTurn),
      shouldIntroduceIdentity: Boolean(session?.firstEstablishedThisTurn),
      currentMessageIsAuthoritativeIntent: true
    };
  }
}

export { AUTHORITY_INTENTS };
