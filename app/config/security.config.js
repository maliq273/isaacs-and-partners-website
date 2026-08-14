/**
 * Isaacs and Partners
 * Security Configuration
 */

const securityConfig = Object.freeze({
    authentication: Object.freeze({
        enabled: true,
        sessionTimeoutMinutes: 30,
        idleTimeoutMinutes: 5,
        requireAuthenticationForDashboard: true,
        requireAuthenticationForMatterData: true,
        requireAuthenticationForDocuments: true,
    }),

    authorization: Object.freeze({
        enabled: true,
        denyByDefault: true,
        enforceServerSide: true,
        enforceClientSide: true,
    }),

    session: Object.freeze({
        storageKey:
            "isaacs_partners_session",
        userKey:
            "isaacs_partners_user",
        tokenKey:
            "isaacs_partners_access_token",
        refreshTokenKey:
            "isaacs_partners_refresh_token",

        clearOnLogout: true,
        clearSensitiveDataOnExpiry: true,
    }),

    csrf: Object.freeze({
        enabled: true,
        cookieName:
            "isaacs_partners_csrf",
        headerName:
            "X-CSRF-Token",
    }),

    uploads: Object.freeze({
        maxFileSizeMB: 25,

        allowedExtensions: Object.freeze([
            ".pdf",
            ".doc",
            ".docx",
            ".xls",
            ".xlsx",
            ".csv",
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
        ]),

        rejectExecutableFiles: true,
        rejectDoubleExtensions: true,
        validateMimeType: true,
        scanUploads: true,
    }),

    documents: Object.freeze({
        encryptSensitiveDocuments: true,
        preventUnsafeInlineRendering: true,
        requireAccessControl: true,
        auditAccess: true,
        auditDownloads: true,
    }),

    privacy: Object.freeze({
        protectPersonalInformation: true,
        minimiseDataCollection: true,
        maskSensitiveLogs: true,
        avoidSensitiveQueryParameters: true,
    }),

    headers: Object.freeze({
        contentSecurityPolicy: true,
        xContentTypeOptions: "nosniff",
        referrerPolicy:
            "strict-origin-when-cross-origin",
        frameProtection: true,
    }),

    rateLimiting: Object.freeze({
        enabled: true,
        authenticationPerMinute: 10,
        apiPerMinute: 120,
        uploadPerMinute: 20,
    }),

    audit: Object.freeze({
        enabled: true,
        authentication: true,
        authorizationFailures: true,
        documentAccess: true,
        matterAccess: true,
        dataChanges: true,
        configurationChanges: true,
    }),

    ai: Object.freeze({
        prohibitSecretExposure: true,
        prohibitCredentialExposure: true,
        prohibitUnauthorisedDataAccess: true,
        redactSensitiveLogs: true,
    }),
});

export default securityConfig;
