export default class MatterGenerator {
    constructor({
        serviceClassifier,
        departmentClassifier,
        requirementEngine = null
    } = {}) {
        this.serviceClassifier =
            serviceClassifier;

        this.departmentClassifier =
            departmentClassifier;

        this.requirementEngine =
            requirementEngine;
    }

    async generate(input = {}) {
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

        const requirements =
            await this.requirementEngine?.getRequirements?.(
                {
                    ...input,
                    service:
                        service.value,
                    department:
                        department.value
                }
            );

        return {
            clientId:
                input.clientId ||
                null,

            service:
                service.value,

            serviceConfidence:
                service.confidence,

            department:
                department.value,

            requirements:
                requirements || [],

            status: "NEW",

            generatedAt:
                new Date().toISOString()
        };
    }
}
