/**
 * Isaacs & Partners
 * Knowledge Importer
 *
 * Imports structured legal/operational knowledge into the
 * knowledgebase pipeline.
 *
 * Important:
 * Imported material is source material. It must not silently
 * become verified law. The knowledgebase engine is responsible
 * for validation, source metadata and version handling.
 */

export class KnowledgeImporter {
    constructor({
        knowledgeEngine = null,
        knowledgeLoader = null,
        logger = console
    } = {}) {
        this.knowledgeEngine =
            knowledgeEngine;

        this.knowledgeLoader =
            knowledgeLoader;

        this.logger = logger;
        this.name = "KnowledgeImporter";
    }

    async import(source, options = {}) {
        const records =
            await this.readSource(
                source
            );

        const entries =
            Array.isArray(records)
                ? records
                : [records];

        const results = {
            imported: [],
            rejected: [],
            errors: []
        };

        for (
            let index = 0;
            index < entries.length;
            index++
        ) {
            const entry =
                entries[index];

            try {
                const normalised =
                    this.normalise(
                        entry,
                        options
                    );

                this.validate(
                    normalised
                );

                if (
                    options.dryRun
                ) {
                    results.imported.push(
                        normalised
                    );

                    continue;
                }

                const saved =
                    await this.persist(
                        normalised
                    );

                results.imported.push(
                    saved
                );
            } catch (error) {
                results.errors.push({
                    index,
                    message:
                        error?.message ||
                        "Knowledge import failed",
                    entry
                });

                results.rejected.push(
                    entry
                );

                if (
                    options.failFast
                ) {
                    throw error;
                }
            }
        }

        return results;
    }

    async readSource(source) {
        if (
            typeof source ===
            "string"
        ) {
            try {
                return JSON.parse(
                    source
                );
            } catch {
                throw new Error(
                    "Knowledge source string is not valid JSON"
                );
            }
        }

        if (
            source &&
            typeof source.text ===
                "function"
        ) {
            const text =
                await source.text();

            return JSON.parse(text);
        }

        return source;
    }

    normalise(entry = {}, options = {}) {
        return {
            id:
                entry.id ||
                null,

            domain:
                entry.domain ||
                options.domain ||
                null,

            title:
                entry.title ||
                entry.name ||
                null,

            type:
                entry.type ||
                "source",

            jurisdiction:
                entry.jurisdiction ||
                "South Africa",

            content:
                entry.content ||
                entry.text ||
                "",

            source: {
                name:
                    entry.source?.name ||
                    entry.sourceName ||
                    null,

                url:
                    entry.source?.url ||
                    entry.sourceUrl ||
                    null,

                citation:
                    entry.source?.citation ||
                    entry.citation ||
                    null,

                publishedDate:
                    entry.source
                        ?.publishedDate ||
                    null,

                accessedDate:
                    entry.source
                        ?.accessedDate ||
                    new Date()
                        .toISOString()
                        .slice(
                            0,
                            10
                        )
            },

            version:
                entry.version ||
                null,

            effectiveFrom:
                entry.effectiveFrom ||
                null,

            effectiveTo:
                entry.effectiveTo ||
                null,

            status:
                entry.status ||
                "unverified",

            metadata: {
                importedAt:
                    new Date().toISOString(),

                importedBy:
                    options.importedBy ||
                    null
            }
        };
    }

    validate(entry) {
        if (!entry.title) {
            throw new Error(
                "Knowledge entry requires a title"
            );
        }

        if (!entry.domain) {
            throw new Error(
                "Knowledge entry requires a knowledge domain"
            );
        }

        if (!entry.content) {
            throw new Error(
                "Knowledge entry requires content"
            );
        }

        if (
            entry.status ===
            "verified" &&
            !entry.source.name &&
            !entry.source.citation
        ) {
            throw new Error(
                "Verified knowledge requires source identification"
            );
        }
    }

    async persist(entry) {
        if (
            this.knowledgeEngine &&
            typeof this.knowledgeEngine.import ===
                "function"
        ) {
            return this.knowledgeEngine.import(
                entry
            );
        }

        if (
            this.knowledgeLoader &&
            typeof this.knowledgeLoader.import ===
                "function"
        ) {
            return this.knowledgeLoader.import(
                entry
            );
        }

        throw new Error(
            "KnowledgeImporter requires KnowledgeEngine or KnowledgeLoader"
        );
    }
}

export default KnowledgeImporter;
