/**
 * UpdateMatter Command
 *
 * Represents a controlled update to an existing matter.
 */

export default class UpdateMatter {
    constructor({
        matterId,
        updatedBy,
        changes = {},
        reason = null,
        expectedVersion = null,
        metadata = {},
    } = {}) {
        if (!matterId) {
            throw new Error("matterId is required");
        }

        if (!updatedBy) {
            throw new Error("updatedBy is required");
        }

        if (
            !changes ||
            typeof changes !== "object" ||
            Array.isArray(changes) ||
            Object.keys(changes).length === 0
        ) {
            throw new Error(
                "At least one matter change is required"
            );
        }

        this.name = "UpdateMatter";
        this.matterId = matterId;
        this.updatedBy = updatedBy;
        this.changes = {
            ...changes,
        };
        this.reason = reason;
        this.expectedVersion = expectedVersion;
        this.metadata = metadata;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            name: this.name,
            matterId: this.matterId,
            updatedBy: this.updatedBy,
            changes: {
                ...this.changes,
            },
            reason: this.reason,
            expectedVersion: this.expectedVersion,
            metadata: this.metadata,
            timestamp: this.timestamp,
        };
    }
}
