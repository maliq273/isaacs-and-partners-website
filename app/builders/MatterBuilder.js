/**
 * MatterBuilder
 *
 * Constructs a Matter aggregate in a predictable manner.
 *
 * Business rules and persistence remain outside the builder.
 */

export default class MatterBuilder {
    constructor() {
        this.matter = {
            id: null,
            matterNumber: null,
            clientId: null,

            title: null,
            description: null,

            department: null,
            serviceCategory: null,
            matterType: null,

            status: "OPEN",
            stage: null,
            priority: "NORMAL",

            source: null,
            visibility: "PRIVATE",

            assignedTo: null,

            tags: [],
            metadata: {},

            tasks: [],
            appointments: [],
            documents: [],
            notes: [],
        };
    }

    setId(id) {
        this.matter.id = id;
        return this;
    }

    setMatterNumber(number) {
        this.matter.matterNumber = number;
        return this;
    }

    setClientId(clientId) {
        this.matter.clientId = clientId;
        return this;
    }

    setTitle(title) {
        this.matter.title = title;
        return this;
    }

    setDescription(description) {
        this.matter.description = description;
        return this;
    }

    setDepartment(department) {
        this.matter.department = department;
        return this;
    }

    setServiceCategory(category) {
        this.matter.serviceCategory = category;
        return this;
    }

    setMatterType(type) {
        this.matter.matterType = type;
        return this;
    }

    setStatus(status) {
        this.matter.status = status;
        return this;
    }

    setStage(stage) {
        this.matter.stage = stage;
        return this;
    }

    setPriority(priority) {
        this.matter.priority = priority;
        return this;
    }

    setSource(source) {
        this.matter.source = source;
        return this;
    }

    setVisibility(visibility) {
        this.matter.visibility = visibility;
        return this;
    }

    assignTo(userId) {
        this.matter.assignedTo = userId;
        return this;
    }

    addTag(tag) {
        if (tag && !this.matter.tags.includes(tag)) {
            this.matter.tags.push(tag);
        }

        return this;
    }

    addTags(tags = []) {
        tags.forEach(tag => this.addTag(tag));
        return this;
    }

    addTask(task) {
        this.matter.tasks.push(task);
        return this;
    }

    addAppointment(appointment) {
        this.matter.appointments.push(appointment);
        return this;
    }

    addDocument(document) {
        this.matter.documents.push(document);
        return this;
    }

    addNote(note) {
        this.matter.notes.push(note);
        return this;
    }

    setMetadata(metadata = {}) {
        this.matter.metadata = {
            ...this.matter.metadata,
            ...metadata,
        };

        return this;
    }

    build() {
        if (!this.matter.clientId) {
            throw new Error(
                "Client ID is required to create a matter"
            );
        }

        if (!this.matter.title) {
            throw new Error(
                "Matter title is required"
            );
        }

        return {
            ...this.matter,

            tags: [...this.matter.tags],
            tasks: [...this.matter.tasks],
            appointments: [...this.matter.appointments],
            documents: [...this.matter.documents],
            notes: [...this.matter.notes],

            createdAt:
                this.matter.createdAt ||
                new Date().toISOString(),

            updatedAt:
                new Date().toISOString(),
        };
    }
}
