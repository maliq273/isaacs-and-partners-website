export default class DecisionHistory {
    constructor() {
        this.entries = [];
    }

    add(decision) {
        const entry = {
            ...decision,
            timestamp:
                new Date().toISOString()
        };

        this.entries.push(entry);

        return entry;
    }

    all() {
        return [...this.entries];
    }

    latest() {
        return (
            this.entries[
                this.entries.length - 1
            ] || null
        );
    }
}
