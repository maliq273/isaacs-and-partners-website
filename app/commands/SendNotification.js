/**
 * SendNotification Command
 *
 * Requests a notification through the notification service.
 */

export default class SendNotification {
    constructor({
        recipientId = null,
        recipient,
        channel = "system",
        type = "general",
        subject = null,
        message,
        matterId = null,
        priority = "normal",
        scheduledFor = null,
        metadata = {},
    } = {}) {
        if (!recipient && !recipientId) {
            throw new Error(
                "recipient or recipientId is required"
            );
        }

        if (!message) {
            throw new Error("message is required");
        }

        this.name = "SendNotification";
        this.recipientId = recipientId;
        this.recipient = recipient;
        this.channel = channel;
        this.type = type;
        this.subject = subject;
        this.message = message;
        this.matterId = matterId;
        this.priority = priority;
        this.scheduledFor = scheduledFor;
        this.metadata = metadata;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            name: this.name,
            recipientId: this.recipientId,
            recipient: this.recipient,
            channel: this.channel,
            type: this.type,
            subject: this.subject,
            message: this.message,
            matterId: this.matterId,
            priority: this.priority,
            scheduledFor: this.scheduledFor,
            metadata: this.metadata,
            timestamp: this.timestamp,
        };
    }
}
