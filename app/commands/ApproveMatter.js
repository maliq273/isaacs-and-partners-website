/**
 * ApproveMatter Command
 *
 * Approves a matter after validating that the current user
 * has authority to perform the action.
 */

export default class ApproveMatter {
    constructor({
        matterId,
        approvedBy,
        reason = null,
        metadata = {},
    } = {}) {
        if (!matterId) {
            throw new Error("matterId is required");
        }

        if (!approvedBy) {
            throw new Error("approvedBy is required");
        }

        this.name = "ApproveMatter";
        this.matterId = matterId;
        this.approvedBy = approvedBy;
        this.reason = reason;
        this.metadata = metadata;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            name: this.name,
            matterId: this.matterId,
            approvedBy: this.approvedBy,
            reason: this.reason,
            metadata: this.metadata,
            timestamp: this.timestamp,
        };
    }
}
