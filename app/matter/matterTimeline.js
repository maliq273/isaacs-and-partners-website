/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Matter Timeline
 * ------------------------------------------------------------
 * Central timeline management for a Matter.
 * ============================================================
 */

import TimelineEntry from "../models/TimelineEntry.js";

export default class MatterTimeline {

    add(
        matter,
        title,
        description = "",
        metadata = {}
    ) {

        if (!matter) {

            throw new Error(
                "Matter is required."
            );

        }

        if (!title) {

            throw new Error(
                "Timeline title is required."
            );

        }

        const entry =
            new TimelineEntry({

                matterId:
                    matter.id,

                title,

                description,

                metadata

            });

        if (
            !Array.isArray(
                matter.timeline
            )
        ) {

            matter.timeline = [];

        }

        matter.timeline.push(
            entry
        );

        if (
            typeof matter.touch ===
            "function"
        ) {

            matter.touch();

        }

        return entry;

    }


    getAll(
        matter
    ) {

        if (!matter) {

            return [];

        }

        return [
            ...(matter.timeline ?? [])
        ];

    }


    getLatest(
        matter,
        limit = 10
    ) {

        return this.getAll(
            matter
        )
            .slice()
            .reverse()
            .slice(
                0,
                limit
            );

    }


    find(
        matter,
        entryId
    ) {

        return this.getAll(
            matter
        ).find(
            entry =>
                entry.id ===
                entryId
        );

    }


    remove(
        matter,
        entryId
    ) {

        if (!matter) {

            throw new Error(
                "Matter is required."
            );

        }

        matter.timeline =
            (
                matter.timeline ?? []
            ).filter(
                entry =>
                    entry.id !==
                    entryId
            );

        if (
            typeof matter.touch ===
            "function"
        ) {

            matter.touch();

        }

        return matter;

    }


    clear(
        matter
    ) {

        if (!matter) {

            throw new Error(
                "Matter is required."
            );

        }

        matter.timeline = [];

        if (
            typeof matter.touch ===
            "function"
        ) {

            matter.touch();

        }

        return matter;

    }


    // ========================================================
    // FUTURE INSERT
    // --------------------------------------------------------
    // Automated event timeline
    // AI activity
    // Document events
    // Communication events
    // Appointment events
    // Workflow events
    // Audit events
    // ========================================================

}
