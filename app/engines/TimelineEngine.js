/**
 * TimelineEngine
 * ------------------------------------------------------------
 * Maintains chronological matter/client activity.
 */

export class TimelineEngine {
    constructor({
        matterRepository = null,
        eventDispatcher = null,
        logger = console
    } = {}) {
        this.matterRepository =
            matterRepository;
        this.eventDispatcher =
            eventDispatcher;
        this.logger = logger;
    }

    async record(
        entry,
        options = {}
    ) {
        if (!entry) {
            throw new Error(
                "Timeline entry is required"
            );
        }

        const timelineEntry = {
            id:
                entry.id ||
                this.createId(),

            type:
                entry.type ||
                "system",

            title:
                entry.title ||
                null,

            description:
                entry.description ||
                null,

            matterId:
                entry.matterId ||
                entry.matter?.id ||
                null,

            clientId:
                entry.clientId ||
                entry.client?.id ||
                null,

            actorId:
                entry.actorId ||
                options.actorId ||
                null,

            createdAt:
                entry.createdAt ||
                new Date().toISOString(),

            metadata:
                entry.metadata || {}
        };

        if (
            this.matterRepository
                ?.addTimelineEntry
        ) {
            await this.matterRepository.addTimelineEntry(
                timelineEntry.matterId,
                timelineEntry
            );
        }

        await this.emit(
            "domain.timeline.created",
            timelineEntry
        );

        return timelineEntry;
    }

    async get(
        matterId,
        options = {}
    ) {
        if (
            !matterId
        ) {
            throw new Error(
                "Matter ID is required"
            );
        }

        if (
            this.matterRepository
                ?.getTimeline
        ) {
            return this.matterRepository.getTimeline(
                matterId,
                options
            );
        }

        return [];
    }

    async clear(
        matterId
    ) {
        if (
            this.matterRepository
                ?.clearTimeline
        ) {
            return this.matterRepository.clearTimeline(
                matterId
            );
        }

        return false;
    }

    createId() {
        if (
            typeof crypto !==
                "undefined" &&
            crypto.randomUUID
        ) {
            return crypto.randomUUID();
        }

        return `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`;
    }

    async emit(
        event,
        payload
    ) {
        if (
            this.eventDispatcher?.emit
        ) {
            return this.eventDispatcher.emit(
                event,
                payload
            );
        }

        return null;
    }
}

export default TimelineEngine;
