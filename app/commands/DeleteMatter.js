/**
 * DeleteMatter Command
 *
 * Requests deletion/archival of a matter.
 *
 * Destructive operations should still be enforced by the
 * MatterPolicy, SecurityPolicy and repository layer.
 */

export default class DeleteMatter {
    constructor({
        matterId,
        deletedBy,
        reason,
        permanent = false,
        metadata = {},
    } = {}) {
        if (!matterId) {
            throw new Error("matterId is required");
        }

        if (!deletedBy) {
            throw new Error("deletedBy is required");
        }

        if (!reason) {
            throw new Error(
                "A reason is required when deleting a matter"
            );
        }

        this.name = "DeleteMatter";
        this.matterId = matterId;
        this.deletedBy = deletedBy;
        this.reason = reason;
        this.permanent = Boolean(permanent);
        this.metadata = metadata;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            name: this.name,
            matterId: this.matterId,
            deletedBy: this.deletedBy,
            reason: this.reason,
            permanent: this.permanent,
            metadata: this.metadata,
            timestamp: this.timestamp,
        };
    }
}
