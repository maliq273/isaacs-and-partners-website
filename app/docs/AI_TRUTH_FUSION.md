# Isaacs & Partners AI Truth Fusion

## Purpose

The AI Liaison now supports ChatGPT/Gemini-quality conversational generation while keeping Isaacs & Partners information authoritative for company-specific answers.

## Source hierarchy

1. Super Admin instruction
2. Live client and matter data
3. Approved company policy and pricing
4. Approved Isaacs & Partners knowledgebase
5. General model knowledge

General model knowledge is used for reasoning, explanation and natural conversation. It must not override company-specific facts.

## Provider configuration

Configure the following as **Supabase Edge Function secrets**. Never place these values in browser JavaScript, HTML, GitHub source, or client-side environment variables.

```text
AI_PROVIDER=openai
OPENAI_API_KEY=<secret>
OPENAI_MODEL=gpt-4.1-mini
```

Or:

```text
AI_PROVIDER=gemini
GEMINI_API_KEY=<secret>
GEMINI_MODEL=gemini-2.5-flash
```

Only the selected provider needs its API key. The provider adapter is server-side only.

## Behaviour

The runtime first applies the existing liaison classification, commercial rules and human-handover controls. TruthFusionEngine then supplies the general model with relevant company knowledge plus the authorised client/matter context.

The final response is persisted as an AI message with provider/model metadata and the company knowledge source IDs used for synthesis.

## Important commercial rule

AI may explain services and provide preliminary guidance, but a binding company quotation remains governed by the existing staff approval/commercial policy. AI must not invent or override a price.

## Current implementation

```text
Client
  -> ai-liaison-runtime
  -> WhatsAppAgent
  -> TruthFusionEngine
       -> CompanyTruthService
       -> OpenAI or Gemini
  -> governed response
  -> ai_conversation_messages
```

This is deliberately server-side so API credentials and trusted company context are never supplied by the browser.
