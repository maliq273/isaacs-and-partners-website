/**
 * Isaacs and Partners
 * Workflow Configuration
 */

const workflowConfig = Object.freeze({
    enabled: true,

    defaultPriority: "normal",

    departments: Object.freeze({
        immigration: {
            enabled: true,
            workflow: "immigration",
        },

        hr: {
            enabled: true,
            workflow: "hr",
        },

        business: {
            enabled: true,
            workflow: "business",
        },

        legal: {
            enabled: true,
            workflow: "legal",
        },

        appeals: {
            enabled: true,
            workflow: "appeals",
        },
    }),

    execution: Object.freeze({
        automatic: true,
        transactional: true,
        stopOnFailure: true,
        allowRetry: true,
        maxRetries: 3,
    }),

    states: Object.freeze([
        "draft",
        "pending",
        "active",
        "paused",
        "awaiting_document",
        "awaiting_client",
        "awaiting_external_party",
        "under_review",
        "completed",
        "cancelled",
        "failed",
    ]),

    automation: Object.freeze({
        createTasks: true,
        createTimelineEntries: true,
        createDocumentRequirements: true,
        createNotifications: true,
        createReminders: true,
        runComplianceChecks: true,
        runRiskChecks: true,
        runCompletenessChecks: true,
    }),

    escalation: Object.freeze({
        enabled: true,

        highRisk: true,
        lowConfidence: true,
        overdueMatter: true,
        missingCriticalDocument: true,
        legalConflict: true,
        complianceFailure: true,
    }),

    deadlines: Object.freeze({
        enabled: true,
        calculateBusinessDays: true,
        excludePublicHolidays: true,
        createReminderBeforeDeadline: true,
    }),

    audit: Object.freeze({
        enabled: true,
        recordTransitions: true,
        recordActions: true,
        recordFailures: true,
        recordOverrides: true,
    }),

    safeguards: Object.freeze({
        requireValidMatter: true,
        requireAuthorisedUser: true,
        requireValidTransition: true,
        preventDuplicateExecution: true,
        preventExecutionAfterCompletion: true,
    }),
});

export default workflowConfig;
