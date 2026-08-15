export default class ConversationMemory {
    constructor({
        maxMessages = 100
    } = {}) {
        this.maxMessages =
            maxMessages;
        this.messages = [];
    }

    add(message) {
        this.messages.push({
            ...message,
            timestamp:
                message.timestamp ||
                new Date().toISOString()
        });

        if (
            this.messages.length >
            this.maxMessages
        ) {
            this.messages =
                this.messages.slice(
                    -this.maxMessages
                );
        }
    }

    all() {
        return [...this.messages];
    }

    clear() {
        this.messages = [];
    }
}
