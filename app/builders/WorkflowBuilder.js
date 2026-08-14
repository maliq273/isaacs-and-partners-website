/**
 * WorkflowBuilder
 *
 * Constructs executable workflow definitions.
 *
 * The WorkflowEngine is responsible for execution.
 * The builder only defines structure.
 */

export default class WorkflowBuilder {
    constructor({
        id = null,
        name = null,
        type = null,
    } = {}) {
        this.workflow = {
            id,
            name,
            type,

            version: 1,

            description: null,

            trigger: null,

            steps: [],

            conditions: [],

            metadata: {},

            enabled: true,
        };
    }

    setId(id) {
        this.workflow.id = id;
        return this;
    }

    setName(name) {
        this.workflow.name = name;
        return this;
    }

    setType(type) {
        this.workflow.type = type;
        return this;
    }

    setVersion(version) {
        this.workflow.version = version;
        return this;
    }

    setDescription(description) {
        this.workflow.description = description;
        return this;
    }

    setTrigger(trigger) {
        this.workflow.trigger = trigger;
        return this;
    }

    addStep(step) {
        if (!step) {
            throw new Error("Workflow step is required");
        }

        this.workflow.steps.push({
            order:
                step.order ??
                this.workflow.steps.length + 1,

            ...step,
        });

        return this;
    }

    addCondition(condition) {
        if (!condition) {
            throw new Error(
                "Workflow condition is required"
            );
        }

        this.workflow.conditions.push(condition);

        return this;
    }

    setMetadata(metadata = {}) {
        this.workflow.metadata = {
            ...this.workflow.metadata,
            ...metadata,
        };

        return this;
    }

    enable() {
        this.workflow.enabled = true;
        return this;
    }

    disable() {
        this.workflow.enabled = false;
        return this;
    }

    build() {
        if (!this.workflow.name) {
            throw new Error(
                "Workflow name is required"
            );
        }

        if (!this.workflow.type) {
            throw new Error(
                "Workflow type is required"
            );
        }

        return {
            ...this.workflow,

            steps: [...this.workflow.steps],
            conditions: [...this.workflow.conditions],

            createdAt:
                this.workflow.createdAt ||
                new Date().toISOString(),

            updatedAt:
                new Date().toISOString(),
        };
    }
}
