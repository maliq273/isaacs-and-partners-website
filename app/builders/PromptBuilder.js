/**
 * PromptBuilder
 *
 * Constructs controlled AI prompts.
 *
 * Important:
 * - User input is treated as data, not instructions.
 * - System instructions remain separate.
 * - Knowledge sources and documents are explicitly identified.
 * - AI output expectations are structured.
 */

export default class PromptBuilder {
    constructor({
        system = "",
        task = "",
    } = {}) {
        this.system = system;
        this.task = task;

        this.context = [];
        this.documents = [];
        this.knowledge = [];
        this.instructions = [];
        this.constraints = [];
        this.outputSchema = null;
    }

    setSystem(system) {
        this.system = system;
        return this;
    }

    setTask(task) {
        this.task = task;
        return this;
    }

    addContext(label, value) {
        this.context.push({
            label,
            value,
        });

        return this;
    }

    addDocument(document) {
        this.documents.push(document);
        return this;
    }

    addKnowledge(source) {
        this.knowledge.push(source);
        return this;
    }

    addInstruction(instruction) {
        this.instructions.push(instruction);
        return this;
    }

    addConstraint(constraint) {
        this.constraints.push(constraint);
        return this;
    }

    setOutputSchema(schema) {
        this.outputSchema = schema;
        return this;
    }

    build() {
        if (!this.task) {
            throw new Error(
                "AI task is required"
            );
        }

        return {
            system: this.system,

            task: this.task,

            context: [...this.context],

            documents: [...this.documents],

            knowledge: [...this.knowledge],

            instructions: [...this.instructions],

            constraints: [...this.constraints],

            outputSchema: this.outputSchema,

            createdAt:
                new Date().toISOString(),
        };
    }

    toText() {
        const prompt = this.build();

        const sections = [];

        if (prompt.system) {
            sections.push(
                `SYSTEM:\n${prompt.system}`
            );
        }

        sections.push(
            `TASK:\n${prompt.task}`
        );

        if (prompt.context.length) {
            sections.push(
                "CONTEXT:\n" +
                prompt.context
                    .map(
                        item =>
                            `[${item.label}]\n${item.value}`
                    )
                    .join("\n\n")
            );
        }

        if (prompt.documents.length) {
            sections.push(
                "DOCUMENTS:\n" +
                prompt.documents
                    .map(
                        document =>
                            JSON.stringify(document)
                    )
                    .join("\n")
            );
        }

        if (prompt.knowledge.length) {
            sections.push(
                "KNOWLEDGE SOURCES:\n" +
                prompt.knowledge
                    .map(
                        source =>
                            JSON.stringify(source)
                    )
                    .join("\n")
            );
        }

        if (prompt.instructions.length) {
            sections.push(
                "INSTRUCTIONS:\n" +
                prompt.instructions
                    .map(
                        (instruction, index) =>
                            `${index + 1}. ${instruction}`
                    )
                    .join("\n")
            );
        }

        if (prompt.constraints.length) {
            sections.push(
                "CONSTRAINTS:\n" +
                prompt.constraints
                    .map(
                        (constraint, index) =>
                            `${index + 1}. ${constraint}`
                    )
                    .join("\n")
            );
        }

        if (prompt.outputSchema) {
            sections.push(
                "OUTPUT SCHEMA:\n" +
                JSON.stringify(
                    prompt.outputSchema,
                    null,
                    2
                )
            );
        }

        return sections.join("\n\n");
    }
}
