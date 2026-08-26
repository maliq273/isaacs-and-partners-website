/**
 * Isaacs & Partners
 * Integration Registry
 *
 * The browser never stores provider secrets. This registry describes the
 * provider capabilities the Super Admin control plane can orchestrate.
 * Credentials and privileged API calls belong in Supabase Edge Functions.
 */

export const INTEGRATION_PROVIDERS = Object.freeze({
    SUPABASE: Object.freeze({
        key: "supabase",
        name: "Supabase",
        category: "DATA",
        requiredSecrets: []
    }),
    ZOHO: Object.freeze({
        key: "zoho",
        name: "Zoho",
        category: "CRM_FINANCE",
        requiredSecrets: ["ZOHO_CLIENT_ID", "ZOHO_CLIENT_SECRET", "ZOHO_REFRESH_TOKEN"]
    }),
    WHATSAPP: Object.freeze({
        key: "whatsapp",
        name: "WhatsApp",
        category: "COMMUNICATIONS",
        requiredSecrets: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"]
    }),
    EMAIL: Object.freeze({
        key: "email",
        name: "Email",
        category: "COMMUNICATIONS",
        requiredSecrets: ["EMAIL_PROVIDER_API_KEY"]
    }),
    PAYMENTS: Object.freeze({
        key: "payments",
        name: "Payments",
        category: "FINANCE",
        requiredSecrets: ["PAYMENT_PROVIDER_SECRET"]
    })
});

export const INTEGRATION_EVENTS = Object.freeze({
    CREATED: "CREATED",
    UPDATED: "UPDATED",
    DELETED: "DELETED",
    SYNC_REQUESTED: "SYNC_REQUESTED",
    SYNC_COMPLETED: "SYNC_COMPLETED",
    SYNC_FAILED: "SYNC_FAILED"
});

export function getIntegrationProvider(key) {
    const normalised = String(key || "").trim().toLowerCase();
    return Object.values(INTEGRATION_PROVIDERS).find(provider => provider.key === normalised) || null;
}

export function listIntegrationProviders() {
    return Object.values(INTEGRATION_PROVIDERS);
}

export default INTEGRATION_PROVIDERS;
