export default class KnowledgeMemory {
    constructor() {
        this.entries = new Map();
    }

    remember(
        key,
        value,
        metadata = {}
    ) {
        this.entries.set(key, {
            value,
            metadata,
            timestamp:
                new Date().toISOString()
        });
    }

    recall(key) {
        return this.entries.get(key);
    }

    forget(key) {
        this.entries.delete(key);
    }

    clear() {
        this.entries.clear();
    }
}
