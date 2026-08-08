/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * APPEALS WORKFLOW
 * ============================================================
 *
 * LOCATION
 * app/workflows/appeals.js
 *
 * ============================================================
 */

const appealsWorkflow = {

    id: "WORKFLOW-APPEALS",

    name: "Appeals Matter Workflow",

    category: "APPEALS",

    version: "1.0.0",

    active: true,

    /*
     * ========================================================
     * FUTURE INSERT
     * APPEAL TYPES
     *
     * Immigration appeal
     * Administrative appeal
     * Internal appeal
     * Review
     * Waiver
     * Reconsideration
     * ========================================================
     */

    triggers: [

        "APPEAL_MATTER_CREATED",

        "REFUSAL_DOCUMENT_UPLOADED",

        "APPEAL_REQUESTED",

        "DEADLINE_APPROACHING"

    ],

    stages: [

        {
            id: "INTAKE",

            name: "Appeal Intake",

            order: 1,

            actions: [
                "CREATE_MATTER",
                "IDENTIFY_ORIGINAL_MATTER",
                "CAPTURE_REFUSAL",
                "CAPTURE_CLIENT"
            ]
        },

        {
            id: "REFUSAL_ANALYSIS",

            name: "Refusal Analysis",

            order: 2,

            actions: [
                "ANALYSE_REFUSAL",
                "IDENTIFY_GROUNDS",
                "IDENTIFY_DEADLINES",
                "IDENTIFY_REMEDY"
            ]
        },

        {
            id: "EVIDENCE",

            name: "Evidence Collection",

            order: 3,

            actions: [
                "GENERATE_DOCUMENT_CHECKLIST",
                "REQUEST_EVIDENCE",
                "UPLOAD_EVIDENCE",
                "ANALYSE_EVIDENCE"
            ]
        },

        {
            id: "DRAFTING",

            name: "Appeal Drafting",

            order: 4,

            actions: [
                "GENERATE_ARGUMENT_STRUCTURE",
                "DRAFT_APPEAL",
                "DRAFT_SUPPORTING_ARGUMENTS",
                "REVIEW_DRAFT"
            ]
        },

        {
            id: "QUALITY_CONTROL",

            name: "Appeal Quality Control",

            order: 5,

            actions: [
                "COMPLETENESS_CHECK",
                "LEGAL_REVIEW",
                "DEADLINE_CHECK",
                "SUPERVISOR_REVIEW"
            ]
        },

        {
            id: "SUBMISSION",

            name: "Appeal Submission",

            order: 6,

            actions: [
                "GENERATE_BUNDLE",
                "GENERATE_INDEX",
                "GENERATE_COVER_LETTER",
                "SUBMIT_APPEAL"
            ]
        },

        {
            id: "FOLLOW_UP",

            name: "Appeal Follow Up",

            order: 7,

            actions: [
                "TRACK_SUBMISSION",
                "CAPTURE_CORRESPONDENCE",
                "UPDATE_CLIENT"
            ]
        },

        {
            id: "CLOSURE",

            name: "Appeal Closure",

            order: 8,

            actions: [
                "CAPTURE_OUTCOME",
                "ARCHIVE_MATTER",
                "CLOSE_MATTER"
            ]
        }

    ],

    ai: {

        enabled: true,

        analyses: [

            "DOCUMENT_ANALYSIS",

            "REFUSAL_ANALYSIS",

            "RISK",

            "COMPLETENESS",

            "RECOMMENDATION",

            "SUMMARY"

        ]

    },

    transitions: [

        {
            from: "INTAKE",
            to: "REFUSAL_ANALYSIS",
            condition: "INTAKE_COMPLETE"
        },

        {
            from: "REFUSAL_ANALYSIS",
            to: "EVIDENCE",
            condition: "GROUNDS_IDENTIFIED"
        },

        {
            from: "EVIDENCE",
            to: "DRAFTING",
            condition: "EVIDENCE_COMPLETE"
        },

        {
            from: "DRAFTING",
            to: "QUALITY_CONTROL",
            condition: "DRAFT_COMPLETE"
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

    deadlines: {

        enabled: true,

        /*
         * ====================================================
         * FUTURE INSERT
         *
         * Statutory deadlines must come from the
         * knowledgebase and not be hard-coded here.
         * ====================================================
         */

        source: "KNOWLEDGEBASE"

    },

    submission: {

        bundleRequired: true,

        printable: true,

        archiveRequired: true

    }

};

export default appealsWorkflow;
