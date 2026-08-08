/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * HR WORKFLOW
 * ============================================================
 *
 * LOCATION
 * app/workflows/hr.js
 *
 * ============================================================
 */

const hrWorkflow = {

    id: "WORKFLOW-HR",

    name: "Human Resources Matter Workflow",

    category: "HR",

    version: "1.0.0",

    active: true,

    /*
     * ========================================================
     * FUTURE INSERT
     * HR MATTER TYPES
     *
     * Contracts
     * Disciplinary matters
     * Misconduct
     * Grievances
     * Policies
     * Employment disputes
     * Terminations
     * Performance management
     * ========================================================
     */

    triggers: [

        "HR_MATTER_CREATED",

        "EMPLOYEE_REFERRAL",

        "EMPLOYER_REFERRAL",

        "COMPLAINT_RECEIVED",

        "DISCIPLINARY_MATTER_CREATED"

    ],

    stages: [

        {
            id: "INTAKE",

            name: "HR Intake",

            order: 1,

            actions: [
                "CREATE_MATTER",
                "CAPTURE_PARTIES",
                "CAPTURE_EMPLOYMENT_DETAILS",
                "IDENTIFY_ISSUE"
            ]
        },

        {
            id: "FACT_FINDING",

            name: "Fact Finding",

            order: 2,

            actions: [
                "COLLECT_STATEMENTS",
                "COLLECT_DOCUMENTS",
                "BUILD_CHRONOLOGY",
                "IDENTIFY_DISPUTED_FACTS"
            ]
        },

        {
            id: "ASSESSMENT",

            name: "HR Assessment",

            order: 3,

            actions: [
                "ASSESS_POLICY",
                "ASSESS_EMPLOYMENT_CONTRACT",
                "ASSESS_COMPLIANCE",
                "IDENTIFY_RISKS"
            ]
        },

        {
            id: "RECOMMENDATION",

            name: "Recommendation",

            order: 4,

            actions: [
                "GENERATE_RECOMMENDATION",
                "GENERATE_ACTION_PLAN",
                "CLIENT_REVIEW"
            ]
        },

        {
            id: "IMPLEMENTATION",

            name: "Implementation",

            order: 5,

            actions: [
                "PREPARE_DOCUMENTS",
                "ISSUE_NOTICES",
                "IMPLEMENT_ACTION",
                "CAPTURE_ACKNOWLEDGEMENT"
            ]
        },

        {
            id: "FOLLOW_UP",

            name: "Follow Up",

            order: 6,

            actions: [
                "MONITOR_OUTCOME",
                "CAPTURE_RESPONSES",
                "UPDATE_CLIENT"
            ]
        },

        {
            id: "CLOSURE",

            name: "Matter Closure",

            order: 7,

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
            to: "ASSESSMENT",
            condition: "FACTS_COMPLETE"
        },

        {
            from: "ASSESSMENT",
            to: "RECOMMENDATION",
            condition: "ASSESSMENT_COMPLETE"
        },

        {
            from: "RECOMMENDATION",
            to: "IMPLEMENTATION",
            condition: "RECOMMENDATION_APPROVED"
        },

        {
            from: "IMPLEMENTATION",
            to: "FOLLOW_UP",
            condition: "IMPLEMENTATION_COMPLETE"
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
     * HR / LABOUR KNOWLEDGE ROUTING
     *
     * This must eventually resolve through the
     * KnowledgeService rather than duplicate legislation here.
     * ========================================================
     */

    knowledgeDomains: [

        "HR",

        "LABOUR",

        "EMPLOYMENT_CONTRACTS"

    ]

};

export default hrWorkflow;
