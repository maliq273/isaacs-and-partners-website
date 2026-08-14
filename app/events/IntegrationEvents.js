/**
 * IntegrationEvents
 * ------------------------------------------------------------
 * Events concerning communication with external systems.
 */

export const IntegrationEvents = Object.freeze({
    API_REQUEST_STARTED:
        "integration.api.request.started",

    API_REQUEST_COMPLETED:
        "integration.api.request.completed",

    API_REQUEST_FAILED:
        "integration.api.request.failed",

    SUPABASE_SYNC_STARTED:
        "integration.supabase.sync.started",

    SUPABASE_SYNC_COMPLETED:
        "integration.supabase.sync.completed",

    SUPABASE_SYNC_FAILED:
        "integration.supabase.sync.failed",

    WHATSAPP_MESSAGE_SENT:
        "integration.whatsapp.message.sent",

    WHATSAPP_MESSAGE_FAILED:
        "integration.whatsapp.message.failed",

    EMAIL_SENT:
        "integration.email.sent",

    EMAIL_FAILED:
        "integration.email.failed",

    EXTERNAL_DOCUMENT_RECEIVED:
        "integration.document.received",

    EXTERNAL_SERVICE_UNAVAILABLE:
        "integration.service.unavailable"
});

export default IntegrationEvents;
