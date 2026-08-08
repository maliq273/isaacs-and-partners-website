/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * IMMIGRATION WORKFLOW
 * ============================================================
 *
 * LOCATION
 * app/workflows/immigration.js
 *
 * PURPOSE
 * Master workflow definition for immigration matters.
 *
 * This file DEFINES the workflow.
 * It does not execute the workflow.
 *
 * Execution is handled by:
 * app/services/WorkflowService.js
 * app/ai/runtime/WorkflowRuntime.js
 *
 * ============================================================
 */

const immigrationWorkflow = {

    id: "WORKFLOW-IMMIGRATION",

    name: "Immigration Matter Workflow",

    category: "IMMIGRATION",

    version: "1.0.0",

    active: true,

    /*
     * ========================================================
     * FUTURE INSERT
     * WORKFLOW VERSION CONTROL
     *
     * Effective dates
     * Superseded versions
     * Regulatory version
     * Knowledgebase version
     * ========================================================
     */

    triggers: [

        "MATTER_CREATED",

        "CONSULTATION_COMPLETED",

        "IMMIGRATION_SERVICE_SELECTED",

        "DOCUMENT_UPLOADED",

        "DOCUMENT_REVIEW_REQUIRED"

    ],

    stages: [

        {
            id: "INTAKE",

            name: "Matter Intake",

            order: 1,

            actions: [
                "CREATE_MATTER",
                "CAPTURE_CLIENT",
                "IDENTIFY_SERVICE",
                "CAPTURE_PASSPORT",
                "CAPTURE_CONTACT_DETAILS"
            ]
        },

        {
            id: "CONSULTATION",

            name: "Immigration Consultation",

            order: 2,

            actions: [
                "RUN_CONSULTATION",
                "CAPTURE_FACTS",
                "IDENTIFY_IMMIGRATION_PATH",
                "RUN_ELIGIBILITY_ANALYSIS"
            ]
        },

        {
            id: "DOCUMENT_REVIEW",

            name: "Document Review",

            order: 3,

            actions: [
                "GENERATE_DOCUMENT_CHECKLIST",
                "REQUEST_DOCUMENTS",
                "UPLOAD_DOCUMENTS",
                "ANALYSE_DOCUMENTS",
                "CHECK_COMPLETENESS"
            ]
        },

        {
            id: "PREPARATION",

            name: "Application Preparation",

            order: 4,

            actions: [
                "GENERATE_FORMS",
                "POPULATE_FORMS",
                "GENERATE_SUPPORTING_DOCUMENTS",
                "REVIEW_APPLICATION"
            ]
        },

        {
            id: "QUALITY_CONTROL",

            name: "Quality Control",

            order: 5,

            actions: [
                "RUN_COMPLETENESS_CHECK",
                "RUN_COMPLIANCE_CHECK",
                "RUN_DOCUMENT_QUALITY_CHECK",
                "RUN_FINAL_AI_REVIEW",
                "SUPERVISOR_REVIEW"
            ]
        },

        {
            id: "SUBMISSION",

            name: "Submission",

            order: 6,

            actions: [
                "GENERATE_SUBMISSION_BUNDLE",
                "GENERATE_COVER_SHEET",
                "GENERATE_INDEX",
                "MARK_BUNDLE_READY",
                "SUBMIT_TO_AUTHORITY"
            ]
        },

        {
            id: "POST_SUBMISSION",

            name: "Post Submission",

            order: 7,

            actions: [
                "TRACK_APPLICATION",
                "CAPTURE_CORRESPONDENCE",
                "UPDATE_CLIENT",
                "TRACK_OUTCOME"
            ]
        },

        {
            id: "CLOSURE",

            name: "Matter Closure",

            order: 8,

            actions: [
                "CAPTURE_OUTCOME",
                "ARCHIVE_DOCUMENTS",
                "GENERATE_FINAL_REPORT",
                "CLOSE_MATTER"
            ]
        }

    ],

    /*
     * ========================================================
     * FUTURE INSERT
     * IMMIGRATION SERVICE TYPES
     *
     * Section 11
     * Section 13
     * Section 22
     * Section 24
     * Business visas
     * Critical skills
     * General work
     * Study
     * Visitor
     * Permanent residence
     * Appeals
     * Waivers
     * Extensions
     * ========================================================
     */

    requiredServices: [

        "IMMIGRATION_CONSULTATION",

        "DOCUMENT_REVIEW",

        "APPLICATION_PREPARATION",

        "QUALITY_CONTROL",

        "SUBMISSION"

    ],

    requiredDocuments: {

        source: "KNOWLEDGEBASE",

        dynamic: true

        /*
         * ====================================================
         * FUTURE INSERT
         *
         * Visa-specific document mappings belong here
         * only if they are static.
         *
         * Dynamic requirements must come from:
         *
         * KnowledgeService
         * KnowledgeEngine
         * ====================================================
         */

    },

    ai: {

        enabled: true,

        analyses: [

            "ELIGIBILITY",

            "COMPLETENESS",

            "COMPLIANCE",

            "RISK",

            "QUALITY",

            "RECOMMENDATION",

            "SUMMARY"

        ]

    },

    transitions: [

        {
            from: "INTAKE",
            to: "CONSULTATION",
            condition: "INTAKE_COMPLETE"
        },

        {
            from: "CONSULTATION",
            to: "DOCUMENT_REVIEW",
            condition: "CONSULTATION_COMPLETE"
        },

        {
            from: "DOCUMENT_REVIEW",
            to: "PREPARATION",
            condition: "DOCUMENTS_COMPLETE"
        },

        {
            from: "PREPARATION",
            to: "QUALITY_CONTROL",
            condition: "APPLICATION_PREPARED"
        },

        {
            from: "QUALITY_CONTROL",
            to: "SUBMISSION",
            condition: "QUALITY_CONTROL_PASSED"
        },

        {
            from: "SUBMISSION",
            to: "POST_SUBMISSION",
            condition: "SUBMISSION_COMPLETED"
        },

        {
            from: "POST_SUBMISSION",
            to: "CLOSURE",
            condition: "OUTCOME_CAPTURED"
        }

    ],

    /*
     * ========================================================
     * FUTURE INSERT
     * AUTHORITY ROUTING
     *
     * VFS
     * DHA
     * Other designated submission channels
     * ========================================================
     */

    submission: {

        supportedChannels: [

            "VFS",

            "DHA"

        ],

        bundleRequired: true,

        printable: true,

        archiveRequired: true

    }

};

export default immigrationWorkflow;
