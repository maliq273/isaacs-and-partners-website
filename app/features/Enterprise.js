/**
 * Enterprise Features
 * ------------------------------------------------------------
 * Defines functionality intended for enterprise subscriptions
 * or authorised enterprise deployments.
 */

export const ENTERPRISE_FEATURES = Object.freeze({
    ADVANCED_REPORTING: {
        key: "enterprise.advancedReporting",
        name: "Advanced Reporting",
        description:
            "Advanced operational, financial and performance reporting.",
        requiresLicense: true,
        minimumPlan: "enterprise"
    },

    MULTI_BRANCH: {
        key: "enterprise.multiBranch",
        name: "Multi Branch",
        description:
            "Supports multiple branches or operational locations.",
        requiresLicense: true,
        minimumPlan: "enterprise"
    },

    ADVANCED_USER_MANAGEMENT: {
        key: "enterprise.userManagement",
        name: "Advanced User Management",
        description:
            "Advanced roles, permissions and user administration.",
        requiresLicense: true,
        minimumPlan: "enterprise"
    },

    AUDIT_LOGS: {
        key: "enterprise.auditLogs",
        name: "Audit Logs",
        description:
            "Detailed system activity and compliance audit records.",
        requiresLicense: true,
        minimumPlan: "enterprise"
    },

    ADVANCED_WORKFLOWS: {
        key: "enterprise.advancedWorkflows",
        name: "Advanced Workflows",
        description:
            "Advanced workflow automation and matter routing.",
        requiresLicense: true,
        minimumPlan: "enterprise"
    },

    KNOWLEDGEBASE_MANAGEMENT: {
        key: "enterprise.knowledgebaseManagement",
        name: "Knowledgebase Management",
        description:
            "Controlled management of institutional knowledge and source material.",
        requiresLicense: true,
        minimumPlan: "enterprise"
    }
});

export function getEnterpriseFeatures() {
    return Object.values(ENTERPRISE_FEATURES);
}

export function getEnterpriseFeature(key) {
    return getEnterpriseFeatures().find(
        (feature) => feature.key === key
    ) || null;
}

export default ENTERPRISE_FEATURES;
