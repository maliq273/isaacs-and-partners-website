/**
 * AuditEvents
 * ------------------------------------------------------------
 * Events used by the audit/security layer.
 *
 * These events should be consumed by the audit logger and
 * should never be used as a replacement for authorization.
 */

export const AuditEvents = Object.freeze({
    LOGIN:
        "audit.login",

    LOGOUT:
        "audit.logout",

    LOGIN_FAILED:
        "audit.login.failed",

    ACCESS_GRANTED:
        "audit.access.granted",

    ACCESS_DENIED:
        "audit.access.denied",

    RECORD_CREATED:
        "audit.record.created",

    RECORD_VIEWED:
        "audit.record.viewed",

    RECORD_UPDATED:
        "audit.record.updated",

    RECORD_DELETED:
        "audit.record.deleted",

    DOCUMENT_UPLOADED:
        "audit.document.uploaded",

    DOCUMENT_DOWNLOADED:
        "audit.document.downloaded",

    DOCUMENT_DELETED:
        "audit.document.deleted",

    MATTER_CREATED:
        "audit.matter.created",

    MATTER_UPDATED:
        "audit.matter.updated",

    EXPORT_CREATED:
        "audit.export.created",

    SETTINGS_CHANGED:
        "audit.settings.changed",

    SECURITY_EVENT:
        "audit.security.event"
});

export default AuditEvents;
