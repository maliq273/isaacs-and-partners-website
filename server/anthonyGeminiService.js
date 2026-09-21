import { GoogleGenAI } from '@google/genai';
import CompanyTruthService from '../app/ai/CompanyTruthService.js';

// Initialize Company Truth Service with reviewed company facts
const companyTruth = new CompanyTruthService();

// In-memory conversation session store with TTL
const sessions = new Map();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getOrCreateSession(sessionId, initialData = {}) {
  const now = Date.now();
  let session = sessions.get(sessionId);

  if (!session || (now - session.updatedAt > SESSION_TTL_MS)) {
    session = {
      id: sessionId,
      role: initialData.role || 'CLIENT', // 'CLIENT' | 'STAFF' | 'SUPER_ADMIN'
      serviceCategory: initialData.serviceCategory || null,
      serviceName: initialData.serviceName || null,
      clientWants: [], // Tracks identified goals and needs
      facts: {},       // Client profile facts (name, timeline, documents, etc.)
      history: [],     // Array of { role: 'user' | 'model', parts: [{ text }] }
      createdAt: now,
      updatedAt: now,
    };
    sessions.set(sessionId, session);
  } else {
    // Update session metadata if provided
    if (initialData.role && initialData.role !== session.role) {
      session.role = initialData.role;
    }
    if (initialData.serviceCategory) {
      session.serviceCategory = initialData.serviceCategory;
    }
    if (initialData.serviceName) {
      session.serviceName = initialData.serviceName;
    }
    session.updatedAt = now;
  }

  // Periodic cleanup
  if (sessions.size > 1000) {
    for (const [id, s] of sessions.entries()) {
      if (now - s.updatedAt > SESSION_TTL_MS) {
        sessions.delete(id);
      }
    }
  }

  return session;
}

// Lazy Gemini client helper
let geminiClient = null;
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

/**
 * Builds grounded system prompt for Anthony according to his multi-role architecture
 */
function buildSystemPrompt(session, relevantTruth) {
  const { role, serviceCategory, serviceName, clientWants, facts } = session;

  let roleInstruction = '';
  if (role === 'SUPER_ADMIN') {
    roleInstruction = `
CURRENT USER ROLE: SUPER ADMIN / EXECUTIVE DIRECTOR (Abdul Maaliek Isaacs & Shareholders)
YOU ARE ACTING AS: Executive Personal Assistant & Business Intelligence Advisor
YOUR OBJECTIVES:
1. Deliver sharp executive briefings, summaries of active leads, client matters, and operational status.
2. Highlight high-priority action items, upcoming deadlines, and commitments.
3. Assist in drafting executive correspondence, board reports, and commercial proposals.
4. Provide strategic decision support across immigration policy, labour law disputes, and firm growth.
5. Coordinate authorised staff workload, summarize employee activities, and flag operational alerts.
`;
  } else if (role === 'STAFF') {
    roleInstruction = `
CURRENT USER ROLE: AUTHORISED STAFF MEMBER
YOU ARE ACTING AS: Colleague & Internal Operational Support Agent
YOUR OBJECTIVES:
1. Answer internal questions regarding firm policies, standard operating procedures, and compliance.
2. Assist staff in finding client facts, matter histories, and service requirements.
3. Help draft client communications, CCMA dispute documentation, contract clauses, and visa checklists.
4. Support workload management and administrative efficiency within the staff member's permissions.
`;
  } else {
    roleInstruction = `
CURRENT USER ROLE: PROSPECTIVE OR ACTIVE CLIENT
YOU ARE ACTING AS: Client Receptionist, Preliminary Consultation Liaison, and Portfolio Guide
YOUR OBJECTIVES:
1. Warmly welcome the client and provide a clear, professional first impression for Isaacs & Partners.
2. Actively listen to their situation and understand EXACTLY WHAT THEY WANT (their objectives, background, timeline, and documents).
3. Ground your answers strictly in the verified Isaacs & Partners Company Truth provided below (Immigration, Labour Law, HR, Business Compliance, Contracts, CCMA, Notary).
4. Maintain conversational continuity: NEVER ask the client to repeat details they have already provided. Refer back to what they shared earlier.
5. Provide helpful preliminary consultation insights and guide them to register their account or book a consultation with our specialist partners.
`;
  }

  const truthContext = relevantTruth && relevantTruth.length > 0
    ? relevantTruth.map(item => `[${item.sourceName}]: ${item.text}`).join('\n')
    : 'All standard Isaacs & Partners practice areas: Immigration, HR & Labour Law, CCMA Representation, Business Compliance, Notary & Legal Contracts.';

  const wantsContext = clientWants && clientWants.length > 0
    ? `CLIENT'S STATED WANTS & GOALS SO FAR:\n- ${clientWants.join('\n- ')}`
    : 'CLIENT\'S STATED WANTS: (Listening to discover their specific requirements)';

  const profileContext = Object.keys(facts).length > 0
    ? `KNOWN CLIENT FACTS:\n${JSON.stringify(facts, null, 2)}`
    : '';

  return `You are Anthony Isaacs, the official AI Executive Assistant, Receptionist, Portfolio Manager, and Colleague for Isaacs & Partners Pty (Ltd).

FIRM PROFILE:
- Isaacs & Partners is a premier South African professional consultancy based in Cape Town and Gauteng.
- Core Domains:
  1. South African Immigration & Visas (Critical Skills, General Work, Spousal, Business, PR, VFS/DIRCO, Appeals).
  2. Labour Law, Industrial Relations & HR (CCMA representation, Disciplinary hearings, Retrenchments, Policies, Outsourced Payroll).
  3. Business Compliance & Enterprise Setup (CIPC, SARS, COIDA, UIF, Department of Labour, Franchising).
  4. Legal & Commercial Contracts (Employment agreements, NDAs, Commercial leases, SLAs, Notarial certifications).
- Key Leadership:
  * Adul Maaliek Isaacs (Business Intelligence Partner, 22+ yrs HR & Immigration compliance).
  * Stephanie Byleveldt (Head of HR & Payroll, 18+ yrs outsourced payroll & statutory compliance).
  * Uzair Abrahams (Business Intelligence Partner, 20+ yrs enterprise setup & franchising).
  * Hakeem Allies (High Court Admitted Attorney & Bar exam graduate, commercial litigation & CCMA advocacy).

${roleInstruction}

${wantsContext}
${profileContext}
${serviceCategory || serviceName ? `ACTIVE SERVICE FOCUS: ${serviceCategory || ''} ${serviceName ? `-> ${serviceName}` : ''}` : ''}

VERIFIED COMPANY TRUTH (GROUNDED KNOWLEDGE):
${truthContext}

CONVERSATIONAL RULES:
- Tone: Highly capable, articulate, respectful, warm, professional, and reassuring.
- Do NOT sound robotic or scripted. Never recite rigid questionnaires or boilerplate disclaimers repeatedly.
- When the client mentions what they need (e.g. visa type, dispute with employer, business registration, contract draft), acknowledge it specifically and tailor your response directly to what they want.
- Memory: Remember everything discussed in this conversation session. If the user refers to earlier statements, synthesize seamlessly.
- Pricing: Refer to standard pricing and fee structures accurately based on company truth; do not guarantee speculative outcomes.
- Privacy & Discretion: Keep all consultations confidential.
`;
}

/**
 * Extracts and updates client wants and key facts from the conversation
 */
function extractClientWantsAndFacts(session, userMessage) {
  const text = userMessage.toLowerCase();

  // Extract potential client wants
  if (text.includes('visa') || text.includes('permit') || text.includes('citizenship') || text.includes('permanent residency')) {
    if (!session.clientWants.some(w => w.toLowerCase().includes('visa') || w.toLowerCase().includes('immigration'))) {
      session.clientWants.push('Immigration or Visa advisory / application assistance');
    }
  }
  if (text.includes('ccma') || text.includes('dismiss') || text.includes('unfair') || text.includes('disciplinary') || text.includes('retrench')) {
    if (!session.clientWants.some(w => w.toLowerCase().includes('ccma') || w.toLowerCase().includes('labour'))) {
      session.clientWants.push('Labour dispute / CCMA representation or employee relations guidance');
    }
  }
  if (text.includes('company') || text.includes('cipc') || text.includes('register') || text.includes('compliance') || text.includes('sars')) {
    if (!session.clientWants.some(w => w.toLowerCase().includes('business') || w.toLowerCase().includes('compliance'))) {
      session.clientWants.push('Business registration, CIPC / SARS compliance, or enterprise setup');
    }
  }
  if (text.includes('contract') || text.includes('agreement') || text.includes('lease') || text.includes('notary') || text.includes('affidavit')) {
    if (!session.clientWants.some(w => w.toLowerCase().includes('contract') || w.toLowerCase().includes('legal'))) {
      session.clientWants.push('Legal contract drafting, review, or notarial services');
    }
  }

  // Detect urgent timeline
  if (text.includes('urgent') || text.includes('asap') || text.includes('today') || text.includes('tomorrow') || text.includes('deadline')) {
    session.facts.urgency = 'High / Immediate deadline';
  }

  // Detect name if introduced
  const nameMatch = userMessage.match(/(?:my name is|i am|i'm)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (nameMatch && nameMatch[1] && !session.facts.clientName) {
    session.facts.clientName = nameMatch[1];
  }
}

/**
 * Fallback response generator if GEMINI_API_KEY is not configured
 */
function generateFallbackResponse(session, message, relevantTruth) {
  const truthSummary = relevantTruth.slice(0, 3).map(r => r.text).join(' ');
  const service = session.serviceName || 'our specialized advisory services';
  const name = session.facts.clientName ? `${session.facts.clientName}` : 'there';

  return `Hello ${name}. I am Anthony Isaacs, AI Executive Assistant and Client Liaison at Isaacs & Partners.

Regarding your enquiry about ${service}: Isaacs & Partners provides specialized legal, immigration, HR, and business compliance support in South Africa. ${truthSummary ? `\n\nKey Information: ${truthSummary}` : ''}

I have noted your requirements in our system. You can create an account or book an appointment directly with our specialist team at any time so our partners can review your specific documents.`;
}

/**
 * Core Chat Handler
 */
export async function handleAnthonyChat({
  sessionId,
  message,
  role = 'CLIENT',
  serviceCategory = null,
  serviceName = null,
  user = null
}) {
  if (!message || typeof message !== 'string') {
    throw new Error('Message is required.');
  }

  const effectiveSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const session = getOrCreateSession(effectiveSessionId, {
    role,
    serviceCategory,
    serviceName,
  });

  // Extract client wants & profile facts
  extractClientWantsAndFacts(session, message);

  // Search Company Truth for grounded knowledge
  const queryToSearch = `${message} ${serviceCategory || ''} ${serviceName || ''}`.trim();
  const searchResults = companyTruth.search(queryToSearch, { limit: 12 });

  // Append user message to history
  session.history.push({
    role: 'user',
    parts: [{ text: message }]
  });

  // Build system prompt with all role and company truth context
  const systemInstruction = buildSystemPrompt(session, searchResults);

  let replyText = '';
  let successfulModel = null;
  const ai = getGeminiClient();
  const candidateModels = [
    process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest'
  ].filter((v, i, a) => a.indexOf(v) === i);

  if (ai) {
    const contents = session.history.slice(-20);
    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: 0.35,
            maxOutputTokens: 1600,
          }
        });

        if (response.text?.trim()) {
          replyText = response.text.trim();
          successfulModel = model;
          break;
        }
      } catch (error) {
        console.warn(`[AnthonyGeminiService] Gemini (${model}) notice:`, error.message || error);
      }
    }

    if (!replyText) {
      replyText = generateFallbackResponse(session, message, searchResults);
      successfulModel = 'COMPANY_TRUTH_FALLBACK';
    }
  } else {
    // API key not yet configured in container; use grounded company truth response
    replyText = generateFallbackResponse(session, message, searchResults);
    successfulModel = 'COMPANY_TRUTH_FALLBACK';
  }

  // Append assistant message to history
  session.history.push({
    role: 'model',
    parts: [{ text: replyText }]
  });

  session.updatedAt = Date.now();

  return {
    ok: true,
    sessionId: session.id,
    reply: replyText,
    role: session.role,
    clientWants: session.clientWants,
    facts: session.facts,
    serviceCategory: session.serviceCategory,
    serviceName: session.serviceName,
    companySources: searchResults.slice(0, 5).map(s => s.sourceName),
    model: successfulModel || 'gemini-3.8-flash'
  };
}

/**
 * Get current session state
 */
export function getAnthonySession(sessionId) {
  return sessions.get(sessionId) || null;
}

/**
 * Reset a session
 */
export function resetAnthonySession(sessionId) {
  if (sessions.has(sessionId)) {
    sessions.delete(sessionId);
    return true;
  }
  return false;
}
