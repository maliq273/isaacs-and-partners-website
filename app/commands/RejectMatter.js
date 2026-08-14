/**
 * RejectMatter Command
 *
 * Rejects a matter or matter submission after recording
 * a mandatory reason.
 */

export default class RejectMatter {
    constructor({
        matterId,
        rejectedBy,
        reason,
        rejectionCode = null,
        metadata = {},
    } = {}) {
        if (!matterId) {
            throw new Error("matterId is required");
        }

        if (!rejectedBy) {
            throw new Error("rejectedBy is required");
        }

        if (!reason) {
            throw new Error(
                "A rejection reason is required"
            );
        }

        this.name = "RejectMatter";
        this.matterId = matterId;
        this.rejectedBy = rejectedBy;
        this.reason = reason;
        this.rejectionCode = rejectionCode;
        this.metadata = metadata;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            name: this.name,
            matterId: this.matterId,
            rejectedBy: this.rejectedBy,
            reason: this.reason,
            rejectionCode: this.rejectionCode,
            metadata: this.metadata,
            timestamp: this.timestamp,
        };
    }
}
