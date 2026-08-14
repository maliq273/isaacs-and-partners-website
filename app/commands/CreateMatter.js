/**
 * CreateMatter Command
 *
 * Represents the intention to create a new matter.
 */

export default class CreateMatter {
    constructor({
        clientId,
        matterType,
        department,
        title,
        description = null,
        priority = "normal",
        source = null,
        createdBy,
        metadata = {},
    } = {}) {
        if (!clientId) {
            throw new Error("clientId is required");
        }

        if (!matterType) {
            throw new Error("matterType is required");
        }

        if (!department) {
            throw new Error("department is required");
        }

        if (!title) {
            throw new Error("title is required");
        }

        if (!createdBy) {
            throw new Error("createdBy is required");
        }

        this.name = "CreateMatter";
        this.clientId = clientId;
        this.matterType = matterType;
        this.department = department;
        this.title = title;
        this.description = description;
        this.priority = priority;
        this.source = source;
        this.createdBy = createdBy;
        this.metadata = metadata;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            name: this.name,
            clientId: this.clientId,
            matterType: this.matterType,
            department: this.department,
            title: this.title,
            description: this.description,
            priority: this.priority,
            source: this.source,
            createdBy: this.createdBy,
            metadata: this.metadata,
            timestamp: this.timestamp,
        };
    }
}
