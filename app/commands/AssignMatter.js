/**
 * AssignMatter Command
 *
 * Assigns a matter to an authorised staff member or department.
 */

export default class AssignMatter {
    constructor({
        matterId,
        assignedTo,
        assignedBy,
        department = null,
        role = null,
        reason = null,
        metadata = {},
    } = {}) {
        if (!matterId) {
            throw new Error("matterId is required");
        }

        if (!assignedTo) {
            throw new Error("assignedTo is required");
        }

        if (!assignedBy) {
            throw new Error("assignedBy is required");
        }

        this.name = "AssignMatter";
        this.matterId = matterId;
        this.assignedTo = assignedTo;
        this.assignedBy = assignedBy;
        this.department = department;
        this.role = role;
        this.reason = reason;
        this.metadata = metadata;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            name: this.name,
            matterId: this.matterId,
            assignedTo: this.assignedTo,
            assignedBy: this.assignedBy,
            department: this.department,
            role: this.role,
            reason: this.reason,
            metadata: this.metadata,
            timestamp: this.timestamp,
        };
    }
}
