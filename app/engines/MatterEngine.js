/**
 * MatterEngine
 * ------------------------------------------------------------
 * Coordinates Matter aggregate operations.
 */

export class MatterEngine {
    constructor({
        matterService = null,
        matterRepository = null,
        workflowEngine = null,
        documentEngine = null,
        timelineEngine = null,
        complianceEngine = null,
        logger = console
    } = {}) {
        this.matterService =
            matterService;
        this.matterRepository =
            matterRepository;
        this.workflowEngine =
            workflowEngine;
        this.documentEngine =
            documentEngine;
        this.timelineEngine =
            timelineEngine;
        this.complianceEngine =
            complianceEngine;
        this.logger = logger;
    }

    async create(
        data,
        options = {}
    ) {
        if (
            this.matterService?.create
        ) {
            return this.matterService.create(
                data,
                options
            );
        }

        if (
            this.matterRepository?.create
        ) {
            return this.matterRepository.create(
                data
            );
        }

        throw new Error(
            "Matter service or repository is required"
        );
    }

    async get(
        id,
        options = {}
    ) {
        if (!id) {
            throw new Error(
                "Matter ID is required"
            );
        }

        if (
            this.matterService?.get
        ) {
            return this.matterService.get(
                id,
                options
            );
        }

        if (
            this.matterRepository?.findById
        ) {
            return this.matterRepository.findById(
                id
            );
        }

        throw new Error(
            "Matter service or repository is required"
        );
    }

    async getContext(
        matter,
        options = {}
    ) {
        return {
            matter,
            documents:
                this.documentEngine
                    ? await this.documentEngine.getMatterDocuments(
                          matter,
                          options
                      )
                    : matter.documents ||
                      [],
            timeline:
                this.timelineEngine
                    ?.get
                    ? await this.timelineEngine.get(
                          matter.id,
                          options
                      )
                    : matter.timeline ||
                      [],
            compliance:
                this.complianceEngine
                    ?.assess
                    ? await this.complianceEngine.assess(
                          matter,
                          options
                      )
                    : null
        };
    }

    async transition(
        matter,
        status,
        options = {}
    ) {
        if (
            this.matterService
                ?.changeStatus
        ) {
            return this.matterService.changeStatus(
                matter.id,
                status,
                options
            );
        }

        if (
            this.matterService
                ?.updateStatus
        ) {
            return this.matterService.updateStatus(
                matter.id,
                status,
                options
            );
        }

        if (
            this.matterRepository?.update
        ) {
            return this.matterRepository.update(
                matter.id,
                {
                    status
                }
            );
        }

        throw new Error(
            "Matter status transition is unavailable"
        );
    }

    async startWorkflow(
        matter,
        options = {}
    ) {
        if (
            !this.workflowEngine
        ) {
            throw new Error(
                "WorkflowEngine is required"
            );
        }

        return this.workflowEngine.start(
            matter,
            options
        );
    }
}

export default MatterEngine;
