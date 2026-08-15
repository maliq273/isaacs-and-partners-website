export default class ExecutionContext {
    constructor({
        id = crypto.randomUUID(),
        matter = null,
        client = null,
        documents = [],
        input = null,
        metadata = {},
        user = null
    } = {}) {
        this.id = id;
        this.matter = matter;
        this.client = client;
        this.documents = documents;
        this.input = input;
        this.metadata = { ...metadata };
        this.user = user;

        this.results = {};
        this.errors = [];
        this.warnings = [];
        this.startedAt = new Date().toISOString();
        this.completedAt = null;
    }

    setResult(name, value) {
        this.results[name] = value;
        return value;
    }

    getResult(name) {
        return this.results[name];
    }

    addError(error) {
        this.errors.push({
            message:
                error?.message ||
                String(error),
            timestamp:
                new Date().toISOString()
        });
    }

    addWarning(message) {
        this.warnings.push({
            message,
            timestamp:
                new Date().toISOString()
        });
    }

    complete() {
        this.completedAt =
            new Date().toISOString();

        return this;
    }

    hasErrors() {
        return this.errors.length > 0;
    }

    toJSON() {
        return {
            id: this.id,
            matter: this.matter,
            client: this.client,
            documents: this.documents,
            input: this.input,
            metadata: this.metadata,
            results: this.results,
            errors: this.errors,
            warnings: this.warnings,
            startedAt: this.startedAt,
            completedAt: this.completedAt
        };
    }
}
