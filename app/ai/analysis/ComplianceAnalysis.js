export default class ComplianceAnalysis {
    async analyze(input = {}) {
        const failures = [];

        for (
            const requirement of
                input.requirements || []
        ) {
            if (
                requirement.required &&
                !requirement.satisfied
            ) {
                failures.push(
                    requirement
                );
            }
        }

        return {
            type: "COMPLIANCE",
            compliant:
                failures.length === 0,
            failures
        };
    }
}
