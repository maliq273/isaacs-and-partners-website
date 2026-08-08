/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * LEGAL WORKFLOW
 * ============================================================
 *
 * LOCATION
 * app/workflows/legal.js
 *
 * ============================================================
 */

const legalWorkflow = {

    id: "WORKFLOW-LEGAL",

    name: "Legal Matter Workflow",

    category: "LEGAL",

    version: "1.0.0",

    active: true,

    /*
     * ========================================================
     * FUTURE INSERT
     * LEGAL MATTER TYPES
     *
     * Contract drafting
     * Contract review
     * Legal opinions
     * Litigation support
     * Notices
     * Agreements
     * Legal correspondence
     * ========================================================
     */

    triggers: [

        "LEGAL_MATTER_CREATED",

        "LEGAL_CONSULTATION_COMPLETED",

        "DOCUMENT_RECEIVED",

        "LEGAL_REQUEST_RECEIVED"

    ],

    stages: [

        {
            id: "INTAKE",

            name: "Legal Intake",

            order: 1,

            actions: [
                "CREATE_MATTER",
                "CAPTURE_CLIENT",
                "CAPTURE_PARTIES",
                "IDENTIFY_LEGAL_ISSUE"
            ]
        },

        {
            id: "FACT_FINDING",

            name: "Fact Finding",

            order: 2,

            actions: [
                "COLLECT_FACTS",
                "COLLECT_DOCUMENTS",
                "BUILD_CHRONOLOGY",
                "IDENTIFY_ISSUES"
            ]
        },

        {
            id: "LEGAL_ANALYSIS",

            name: "Legal Analysis",

            order: 3,

            actions: [
                "ANALYSE_DOCUMENTS",
                "IDENTIFY_LEGAL_ISSUES",
                "CHECK_KNOWLEDGEBASE",
                "ASSESS_RISK",
                "GENERATE_OPTIONS"
            ]
        },

        {
            id: "DRAFTING",

            name: "Legal Drafting",

            order: 4,

            actions: [
                "GENERATE_DRAFT",
                "RUN_DOCUMENT_REVIEW",
                "ATTORNEY_REVIEW",
                "CLIENT_REVIEW"
            ]
        },

        {
            id: "QUALITY_CONTROL",

            name: "Quality Control",

            order: 5,

            actions: [
                "COMPLETENESS_CHECK",
                "COMPLIANCE_CHECK",
                "LEGAL_REVIEW",
                "FINAL_APPROVAL"
            ]
        },

        {
            id: "DELIVERY",

            name: "Document Delivery",

            order: 6,

            actions: [
                "GENERATE_FINAL_DOCUMENT",
                "GENERATE_PDF",
                "DELIVER_TO_CLIENT",
                "ARCHIVE_DOCUMENT"
            ]
        },

        {
            id: "FOLLOW_UP",

            name: "Follow Up",

            order: 7,

            actions: [
                "CAPTURE_RESPONSE",
                "MONITOR_DEADLINES",
                "UPDATE_CLIENT"
            ]
        },

        {
            id: "CLOSURE",

            name: "Legal Matter Closure",

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

            "COMPLIANCE",

            "RISK",

            "RECOMMENDATION",

            "SUMMARY"

        ]

    },

    transitions: [

        {
            from: "INTAKE",
            to: "FACT_FINDING",
            condition: "INTAKE_COMPLETE"
        },

        {
            from: "FACT_FINDING",
            to: "LEGAL_ANALYSIS",
            condition: "FACTS_COMPLETE"
        },

        {
            from: "LEGAL_ANALYSIS",
            to: "DRAFTING",
            condition: "ANALYSIS_COMPLETE"
        },

        {
            from: "DRAFTING",
            to: "QUALITY_CONTROL",
            condition: "DRAFT_COMPLETE"
        },

        {
            from: "QUALITY_CONTROL",
            to: "DELIVERY",
            condition: "QUALITY_CONTROL_PASSED"
        },

        {
            from: "DELIVERY",
            to: "FOLLOW_UP",
            condition: "DELIVERY_COMPLETE"
        },

        {
            from: "FOLLOW_UP",
            to: "CLOSURE",
            condition: "OUTCOME_CAPTURED"
        }

    ],

    /*
     * ========================================================
     * FUTURE INSERT
     *
     * Legal authority/source hierarchy
     *
     * Acts
     * Regulations
     * Case law
     * Contracts
     * Policies
     * Internal knowledge
     *
     * The final implementation must distinguish:
     * authoritative source
     * internal source
     * AI inference
     * ========================================================
     */

    knowledgeDomains: [

        "LEGAL",

        "CONTRACTS",

        "LABOUR",

        "IMMIGRATION"

    ]

};

export default legalWorkflow;
