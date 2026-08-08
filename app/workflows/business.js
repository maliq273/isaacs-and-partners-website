/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * BUSINESS WORKFLOW
 * ============================================================
 *
 * LOCATION
 * app/workflows/business.js
 *
 * ============================================================
 */

const businessWorkflow = {

    id: "WORKFLOW-BUSINESS",

    name: "Business Matter Workflow",

    category: "BUSINESS",

    version: "1.0.0",

    active: true,

    /*
     * ========================================================
     * FUTURE INSERT
     * BUSINESS SERVICE TYPES
     *
     * Company registration
     * COIDA
     * UIF
     * SARS
     * Business bank account
     * Compliance
     * Business visas
     * Corporate documentation
     * ========================================================
     */

    triggers: [

        "BUSINESS_MATTER_CREATED",

        "CONSULTATION_COMPLETED",

        "BUSINESS_SERVICE_SELECTED",

        "DOCUMENT_UPLOADED"

    ],

    stages: [

        {
            id: "INTAKE",

            name: "Business Intake",

            order: 1,

            actions: [
                "CREATE_MATTER",
                "CAPTURE_CLIENT",
                "IDENTIFY_BUSINESS",
                "IDENTIFY_SERVICE"
            ]
        },

        {
            id: "ASSESSMENT",

            name: "Business Assessment",

            order: 2,

            actions: [
                "ASSESS_REQUIREMENTS",
                "IDENTIFY_COMPLIANCE_REQUIREMENTS",
                "GENERATE_RECOMMENDATIONS"
            ]
        },

        {
            id: "DOCUMENTS",

            name: "Document Collection",

            order: 3,

            actions: [
                "GENERATE_CHECKLIST",
                "REQUEST_DOCUMENTS",
                "UPLOAD_DOCUMENTS",
                "VERIFY_DOCUMENTS"
            ]
        },

        {
            id: "PREPARATION",

            name: "Application Preparation",

            order: 4,

            actions: [
                "PREPARE_FORMS",
                "PREPARE_SUPPORTING_DOCUMENTS",
                "REVIEW_APPLICATION"
            ]
        },

        {
            id: "QUALITY_CONTROL",

            name: "Quality Control",

            order: 5,

            actions: [
                "COMPLETENESS_CHECK",
                "COMPLIANCE_CHECK",
                "SUPERVISOR_REVIEW"
            ]
        },

        {
            id: "SUBMISSION",

            name: "Submission",

            order: 6,

            actions: [
                "GENERATE_BUNDLE",
                "SUBMIT_APPLICATION",
                "CAPTURE_REFERENCE"
            ]
        },

        {
            id: "FOLLOW_UP",

            name: "Follow Up",

            order: 7,

            actions: [
                "TRACK_APPLICATION",
                "CAPTURE_CORRESPONDENCE",
                "UPDATE_CLIENT"
            ]
        },

        {
            id: "CLOSURE",

            name: "Closure",

            order: 8,

            actions: [
                "CAPTURE_OUTCOME",
                "ARCHIVE_DOCUMENTS",
                "CLOSE_MATTER"
            ]
        }

    ],

    ai: {

        enabled: true,

        analyses: [

            "COMPLETENESS",

            "COMPLIANCE",

            "RISK",

            "RECOMMENDATION",

            "SUMMARY"

        ]

    },

    transitions: [

        {
            from: "INTAKE",
            to: "ASSESSMENT",
            condition: "INTAKE_COMPLETE"
        },

        {
            from: "ASSESSMENT",
            to: "DOCUMENTS",
            condition: "ASSESSMENT_COMPLETE"
        },

        {
            from: "DOCUMENTS",
            to: "PREPARATION",
            condition: "DOCUMENTS_COMPLETE"
        },

        {
            from: "PREPARATION",
            to: "QUALITY_CONTROL",
            condition: "PREPARATION_COMPLETE"
        },

        {
            from: "QUALITY_CONTROL",
            to: "SUBMISSION",
            condition: "QUALITY_CONTROL_PASSED"
        },

        {
            from: "SUBMISSION",
            to: "FOLLOW_UP",
            condition: "SUBMISSION_COMPLETED"
        },

        {
            from: "FOLLOW_UP",
            to: "CLOSURE",
            condition: "OUTCOME_CAPTURED"
        }

    ],

    submission: {

        bundleRequired: true,

        printable: true,

        archiveRequired: true

    }

};

export default businessWorkflow;
