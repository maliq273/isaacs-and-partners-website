export default class AIRouter {
    constructor({
        serviceClassifier,
        departmentClassifier,
        skills = []
    } = {}) {
        this.serviceClassifier =
            serviceClassifier;

        this.departmentClassifier =
            departmentClassifier;

        this.skills = skills;
    }

    route(input = {}) {
        const service =
            this.serviceClassifier.classify(
                input
            );

        const department =
            this.departmentClassifier.classify(
                {
                    ...input,
                    service:
                        service.value
                }
            );

        const skill =
            this.skills.find(
                candidate =>
                    candidate.supports(
                        service.value
                    )
            );

        return {
            service,
            department,
            skill:
                skill?.name || null
        };
    }
}
