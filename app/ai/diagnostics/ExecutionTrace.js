export default class ExecutionTrace {
    constructor() {
        this.entries = [];
    }

    start(name) {
        const entry = {
            name,
            startedAt: performance.now(),
            completedAt: null,
            duration: null,
            status: "RUNNING"
        };

        this.entries.push(entry);

        return entry;
    }

    complete(
        entry,
        status = "COMPLETED"
    ) {
        entry.completedAt =
            performance.now();

        entry.duration =
            entry.completedAt -
            entry.startedAt;

        entry.status = status;

        return entry;
    }

    getEntries() {
        return this.entries.map(
            entry => ({ ...entry })
        );
    }

    clear() {
        this.entries = [];
    }
}
