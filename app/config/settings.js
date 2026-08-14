/**
 * Isaacs and Partners
 * Application Settings
 */

const settings = {
    application: {
        language: "en",
        country: "ZA",
        timezone: "Africa/Johannesburg",
        currency: "ZAR",
    },

    consultation: {
        autoSave: true,
        autoSaveIntervalSeconds: 30,
        showProgress: true,
        requireConsent: true,
    },

    notifications: {
        enabled: true,
        email: true,
        whatsapp: true,
        browser: true,
        reminders: true,
    },

    documents: {
        autoClassify: true,
        autoOcr: true,
        autoValidate: true,
        autoMatch: true,
        preserveOriginal: true,
        generateAuditTrail: true,
    },

    matters: {
        autoTimeline: true,
        autoTaskCreation: true,
        autoDocumentChecklist: true,
        autoRiskAssessment: true,
        autoCompletenessCheck: true,
    },

    bookings: {
        enabled: true,
        reminders: true,
        defaultDurationMinutes: 30,
        allowOnlineBooking: true,
    },

    knowledgebase: {
        enabled: true,
        automaticUpdates: true,
        requireSourceVerification: true,
        showSourceReferences: true,
    },

    reporting: {
        enabled: true,
        defaultPageSize: 25,
        exportFormats: [
            "pdf",
            "csv",
            "xlsx",
        ],
    },

    ui: {
        theme: "system",
        animations: true,
        compactTables: false,
        confirmDestructiveActions: true,
    },

    development: {
        mockData: false,
        debugMode: false,
        verboseLogging: false,
    },

    production: {
        failClosed: true,
        strictValidation: true,
        auditChanges: true,
        preventUnsafeFallbacks: true,
    },
};

export function getSetting(
    path,
    defaultValue = undefined
) {
    const parts =
        String(path).split(".");

    let current = settings;

    for (const part of parts) {
        if (
            current === null ||
            current === undefined ||
            !(part in current)
        ) {
            return defaultValue;
        }

        current = current[part];
    }

    return current;
}

export function setSetting(
    path,
    value
) {
    const parts =
        String(path).split(".");

    if (!parts.length) {
        return false;
    }

    let current = settings;

    for (
        let index = 0;
        index < parts.length - 1;
        index += 1
    ) {
        const part =
            parts[index];

        if (
            !current[part] ||
            typeof current[part] !==
                "object"
        ) {
            current[part] = {};
        }

        current =
            current[part];
    }

    current[
        parts[parts.length - 1]
    ] = value;

    return true;
}

export function getAllSettings() {
    return structuredClone(
        settings
    );
}

export default settings;
