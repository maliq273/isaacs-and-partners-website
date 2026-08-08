/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * KnowledgeRepository
 * ============================================================
 */

import BaseRepository
    from "./BaseRepository.js";

export default class KnowledgeRepository
    extends BaseRepository {

    constructor(options = {}) {

        super({

            ...options,

            entityName: "Knowledge",

            collection:
                options.collection ??
                "knowledge"

        });

        // ====================================================
        // FUTURE INSERT
        //
        // Immigration knowledge
        // Visa requirements
        // DHA rules
        // VFS requirements
        // CCMA rules
        // HR rules
        // Legal knowledge
        // Knowledge versioning
        // Effective dates
        //
        // ====================================================
    }


    async findByType(
        type
    ) {

        return this.findWhere({
            type
        });

    }


    async findByCategory(
        category
    ) {

        return this.findWhere({
            category
        });

    }


    async findByCountry(
        country
    ) {

        return this.findWhere({
            country
        });

    }


    async findActive() {

        const records =
            await this.findAll();

        return records.filter(
            record =>
                record.active !== false
        );

    }


    async search(
        query
    ) {

        const text =
            String(query ?? "")
                .trim()
                .toLowerCase();

        if (!text) {

            return this.findActive();

        }

        const records =
            await this.findActive();

        return records.filter(
            record => {

                const searchable = [

                    record.title,

                    record.name,

                    record.description,

                    record.content,

                    record.type,

                    record.category,

                    record.country,

                    record.keywords

                ]
                    .filter(Boolean)
                    .flat()
                    .join(" ")
                    .toLowerCase();

                return searchable.includes(
                    text
                );

            }
        );

    }


    async findEffectiveOn(
        date = new Date()
    ) {

        const target =
            new Date(date)
                .getTime();

        const records =
            await this.findActive();

        return records.filter(
            record => {

                const effectiveFrom =
                    record.effectiveFrom
                        ? new Date(
                            record.effectiveFrom
                        ).getTime()
                        : -Infinity;

                const effectiveUntil =
                    record.effectiveUntil
                        ? new Date(
                            record.effectiveUntil
                        ).getTime()
                        : Infinity;

                return (
                    target >= effectiveFrom &&
                    target <= effectiveUntil
                );

            }
        );

    }

}
