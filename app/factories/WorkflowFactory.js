/**
 * WorkflowFactory
 * ------------------------------------------------------------
 * Creates workflow definitions and workflow handlers.
 *
 * Current workflow domains:
 * - immigration
 * - legal
 * - labour/HR
 * - business
 * - appeals
 *
 * The actual workflow definitions remain in:
 *
 * app/workflows/
 *
 * This factory only controls construction and registration.
 */

export class WorkflowFactory {
    constructor({
        workflows = {},
        dependencies = {},
        validator = null,
        logger = console
    } = {}) {
        this.workflows = {
            ...workflows
        };

        this.dependencies =
            dependencies;

        this.validator = validator;
        this.logger = logger;
    }

    register(
        name,
        Workflow
    ) {
        if (
            !name ||
            typeof Workflow !==
                "function"
        ) {
            throw new TypeError(
                "Workflow name and constructor are required"
            );
        }

        this.workflows[name] =
            Workflow;

        return this;
    }

    create(name, options = {}) {
        const Workflow =
            this.workflows[name];

        if (!Workflow) {
            throw new Error(
                `Workflow is not registered: ${name}`
            );
        }

        const workflow =
            new Workflow({
                ...this.dependencies,
                ...options
            });

        if (
            this.validator &&
            typeof this.validator.validate ===
                "function"
        ) {
            this.validator.validate(
                workflow
            );
        }

        return workflow;
    }

    createForMatter(
        matter,
        options = {}
    ) {
        const type =
            matter?.type ||
            matter?.matterType;

        if (!type) {
            throw new Error(
                "Matter type is required to create a workflow"
            );
        }

        const workflowName =
            this.resolveWorkflow(
                type
            );

        return this.create(
            workflowName,
            {
                ...options,
                matter
            }
        );
    }

    resolveWorkflow(type) {
        const value =
            String(type)
                .trim()
                .toLowerCase();

        const mappings = {
            immigration:
                "immigration",

            visa:
                "immigration",

            refugee:
                "immigration",

            appeal:
                "appeals",

            appeals:
                "appeals",

            labour:
                "hr",

            labor:
                "hr",

            hr:
                "hr",

            employment:
                "hr",

            business:
                "business",

            company:
                "business",

            legal:
                "legal",

            litigation:
                "legal"
        };

        const workflow =
            mappings[value];

        if (!workflow) {
            throw new Error(
                `No workflow registered for matter type: ${type}`
            );
        }

        return workflow;
    }

    has(name) {
        return Boolean(
            this.workflows[name]
        );
    }

    list() {
        return Object.keys(
            this.workflows
        );
    }
}

export default WorkflowFactory;
