/**
 * Isaacs and Partners
 * Consultation Steps
 */

export const CONSULTATION_STEPS =
    Object.freeze([
        {
            id: "questions",
            number: 1,
            title: "Consultation Questions",
            description:
                "Provide the information required for the preliminary assessment.",
        },

        {
            id: "review",
            number: 2,
            title: "Review Information",
            description:
                "Check the information before continuing.",
        },

        {
            id: "assessment",
            number: 3,
            title: "Preliminary Assessment",
            description:
                "Your information is assessed against the applicable service requirements.",
        },

        {
            id: "summary",
            number: 4,
            title: "Consultation Summary",
            description:
                "Review the preliminary outcome and identified next steps.",
        },

        {
            id: "complete",
            number: 5,
            title: "Consultation Complete",
            description:
                "Your consultation has been recorded.",
        },
    ]);

export function getStep(
    stepId
) {
    return (
        CONSULTATION_STEPS.find(
            (step) => step.id === stepId
        ) || null
    );
}

export function getStepByNumber(
    number
) {
    return (
        CONSULTATION_STEPS.find(
            (step) =>
                step.number === number
        ) || null
    );
}

export function getNextStep(
    currentStepId
) {
    const current =
        getStep(currentStepId);

    if (!current) {
        return null;
    }

    return getStepByNumber(
        current.number + 1
    );
}

export function getPreviousStep(
    currentStepId
) {
    const current =
        getStep(currentStepId);

    if (!current) {
        return null;
    }

    return getStepByNumber(
        current.number - 1
    );
}

export default CONSULTATION_STEPS;
