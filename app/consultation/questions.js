/**
 * Isaacs and Partners
 * Consultation Question Bank
 *
 * Central question definitions for the consultation wizard.
 *
 * The wizard must use these definitions rather than hard-coding
 * questions into individual UI steps.
 */

export const QUESTION_TYPES = Object.freeze({
    TEXT: "text",
    TEXTAREA: "textarea",
    EMAIL: "email",
    TEL: "tel",
    SELECT: "select",
    MULTISELECT: "multiselect",
    RADIO: "radio",
    CHECKBOX: "checkbox",
    DATE: "date",
    NUMBER: "number",
});

export const CONSULTATION_CATEGORIES = Object.freeze({
    IMMIGRATION: "immigration",
    HR: "hr",
    BUSINESS: "business",
    LEGAL: "legal",
});

const required = (message) => ({
    required: true,
    message,
});

export const questions = Object.freeze([
    {
        id: "client.fullName",
        category: "client",
        type: QUESTION_TYPES.TEXT,
        label: "Full name",
        description:
            "Enter the client's full legal name.",
        placeholder: "Full legal name",
        validation: required(
            "Full name is required."
        ),
        order: 10,
    },

    {
        id: "client.email",
        category: "client",
        type: QUESTION_TYPES.EMAIL,
        label: "Email address",
        placeholder: "name@example.com",
        validation: {
            required: true,
            message: "A valid email address is required.",
            pattern:
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        },
        order: 20,
    },

    {
        id: "client.phone",
        category: "client",
        type: QUESTION_TYPES.TEL,
        label: "Telephone / WhatsApp number",
        placeholder: "+27...",
        validation: required(
            "Telephone or WhatsApp number is required."
        ),
        order: 30,
    },

    {
        id: "client.country",
        category: "client",
        type: QUESTION_TYPES.TEXT,
        label: "Current country of residence",
        placeholder: "Country",
        validation: required(
            "Current country of residence is required."
        ),
        order: 40,
    },

    {
        id: "client.nationality",
        category: "client",
        type: QUESTION_TYPES.TEXT,
        label: "Nationality",
        placeholder: "Nationality",
        validation: required(
            "Nationality is required."
        ),
        order: 50,
    },

    {
        id: "matter.category",
        category: "matter",
        type: QUESTION_TYPES.SELECT,
        label: "What do you require assistance with?",
        validation: required(
            "Please select the type of assistance required."
        ),
        options: [
            {
                value: CONSULTATION_CATEGORIES.IMMIGRATION,
                label: "Immigration Services",
            },
            {
                value: CONSULTATION_CATEGORIES.HR,
                label: "HR & Industrial Relations",
            },
            {
                value: CONSULTATION_CATEGORIES.BUSINESS,
                label: "Business Compliance",
            },
            {
                value: CONSULTATION_CATEGORIES.LEGAL,
                label: "Legal Services",
            },
        ],
        order: 60,
    },

    {
        id: "matter.description",
        category: "matter",
        type: QUESTION_TYPES.TEXTAREA,
        label: "Briefly explain your matter",
        description:
            "Provide the relevant facts, dates and circumstances. Do not omit important information.",
        placeholder:
            "Explain what happened and what assistance you require...",
        validation: {
            required: true,
            message:
                "A description of the matter is required.",
            minLength: 20,
        },
        order: 70,
    },

    {
        id: "matter.urgency",
        category: "matter",
        type: QUESTION_TYPES.SELECT,
        label: "How urgent is the matter?",
        validation: required(
            "Please select the urgency."
        ),
        options: [
            {
                value: "routine",
                label: "Routine",
            },
            {
                value: "important",
                label: "Important",
            },
            {
                value: "urgent",
                label: "Urgent",
            },
            {
                value: "critical",
                label: "Critical / immediate deadline",
            },
        ],
        order: 80,
    },

    {
        id: "matter.deadline",
        category: "matter",
        type: QUESTION_TYPES.DATE,
        label: "Is there a known deadline?",
        description:
            "Select the deadline if a court, DHA, VFS, CCMA, employer or other authority has provided one.",
        order: 90,
    },

    {
        id: "matter.previousAdvice",
        category: "matter",
        type: QUESTION_TYPES.RADIO,
        label:
            "Have you previously received advice or assistance regarding this matter?",
        options: [
            {
                value: "yes",
                label: "Yes",
            },
            {
                value: "no",
                label: "No",
            },
        ],
        validation: required(
            "Please indicate whether previous advice was received."
        ),
        order: 100,
    },

    {
        id: "matter.previousRepresentation",
        category: "matter",
        type: QUESTION_TYPES.RADIO,
        label:
            "Is another legal or professional representative currently involved?",
        options: [
            {
                value: "yes",
                label: "Yes",
            },
            {
                value: "no",
                label: "No",
            },
        ],
        validation: required(
            "Please indicate whether another representative is involved."
        ),
        order: 110,
    },

    {
        id: "consent.accuracy",
        category: "consent",
        type: QUESTION_TYPES.CHECKBOX,
        label:
            "I confirm that the information supplied is true and complete to the best of my knowledge.",
        validation: {
            required: true,
            message:
                "You must confirm the accuracy of the information.",
        },
        order: 900,
    },

    {
        id: "consent.privacy",
        category: "consent",
        type: QUESTION_TYPES.CHECKBOX,
        label:
            "I consent to Isaacs and Partners processing the information supplied for the purpose of assessing and administering my enquiry.",
        validation: {
            required: true,
            message:
                "Privacy consent is required before submission.",
        },
        order: 910,
    },
]);

export function getQuestions() {
    return [...questions].sort(
        (a, b) => a.order - b.order
    );
}

export function getQuestionById(id) {
    return (
        questions.find(
            (question) => question.id === id
        ) || null
    );
}

export function getQuestionsByCategory(
    category
) {
    return getQuestions().filter(
        (question) =>
            question.category === category
    );
}

export function getQuestionsForMatterCategory(
    category
) {
    return getQuestions().filter(
        (question) => {
            if (!question.matterCategories) {
                return true;
            }

            return question.matterCategories.includes(
                category
            );
        }
    );
}

export default questions;
