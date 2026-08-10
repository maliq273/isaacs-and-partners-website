/**
 * KnowledgeValidator
 * ------------------------------------------------------------
 * Validates the structural integrity of knowledge-base records.
 *
 * It checks:
 * - required domain metadata
 * - source metadata
 * - authority classification
 * - versioning
 * - dates
 * - duplicate IDs
 * - South African jurisdiction metadata
 *
 * It does NOT determine whether a legal proposition is correct.
 */

export class KnowledgeValidator {
    constructor(options = {}) {
        this.strict = options.strict !== false;
        this.logger = options.logger || console;
    }

    validateDomain(domain) {
        const errors = [];
        const warnings = [];

        if (!domain || typeof domain !== "object") {
            return {
                valid: false,
                errors: ["Knowledge domain must be an object"],
                warnings: []
            };
        }

        if (!domain.id) {
            errors.push("Missing domain id");
        }

        if (!domain.name) {
            errors.push("Missing domain name");
        }

        if (
            domain.jurisdiction &&
            domain.jurisdiction !== "South Africa"
        ) {
            errors.push(
                "Knowledge domain jurisdiction must be South Africa"
            );
        }

        if (!domain.version) {
            warnings.push(
                "Knowledge domain has no version"
            );
        }

        if (!domain.sourceMetadata) {
            warnings.push(
                "Knowledge domain has no sourceMetadata object"
            );
        }

        const collections = [
            "legislation",
            "regulations",
            "caseLaw",
            "articles",
            "handbooks",
            "internalCaseStudies",
            "procedures",
            "codesOfGoodPractice",
            "professionalRules"
        ];

        const seenIds = new Set();

        for (const collection of collections) {
            if (
                domain[collection] !== undefined &&
                !Array.isArray(domain[collection])
            ) {
                errors.push(
                    `${collection} must be an array`
                );

                continue;
            }

            const records =
                domain[collection] || [];

            records.forEach((record, index) => {
                const result =
                    this.validateSource(
                        record,
                        collection,
                        index
                    );

                errors.push(
                    ...result.errors
                );

                warnings.push(
                    ...result.warnings
                );

                if (record?.id) {
                    if (seenIds.has(record.id)) {
                        errors.push(
                            `Duplicate source id: ${record.id}`
                        );
                    }

                    seenIds.add(record.id);
                }
            });
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            domainId: domain.id
        };
    }

    validateSource(
        source,
        collection,
        index
    ) {
        const errors = [];
        const warnings = [];

        const location =
            `${collection}[${index}]`;

        if (
            !source ||
            typeof source !== "object"
        ) {
            return {
                errors: [
                    `${location} must be an object`
                ],
                warnings
            };
        }

        if (!source.id) {
            warnings.push(
                `${location} has no id`
            );
        }

        if (
            !source.title &&
            !source.name
        ) {
            warnings.push(
                `${location} has no title or name`
            );
        }

        if (!source.authority) {
            warnings.push(
                `${location} has no authority classification`
            );
        }

        if (
            source.effectiveFrom &&
            !this.isValidDate(
                source.effectiveFrom
            )
        ) {
            errors.push(
                `${location} has invalid effectiveFrom`
            );
        }

        if (
            source.effectiveTo &&
            !this.isValidDate(
                source.effectiveTo
            )
        ) {
            errors.push(
                `${location} has invalid effectiveTo`
            );
        }

        if (
            source.effectiveFrom &&
            source.effectiveTo &&
            new Date(source.effectiveFrom) >
                new Date(source.effectiveTo)
        ) {
            errors.push(
                `${location} effectiveFrom occurs after effectiveTo`
            );
        }

        if (
            collection === "legislation" &&
            !source.citation
        ) {
            warnings.push(
                `${location} legislation record has no citation`
            );
        }

        if (
            collection === "caseLaw" &&
            !source.citation &&
            !source.caseCitation
        ) {
            warnings.push(
                `${location} case-law record has no citation`
            );
        }

        if (
            collection === "internalCaseStudies" &&
            source.authority !==
                "INTERNAL_CASE_STUDY"
        ) {
            warnings.push(
                `${location} internal case study should be marked INTERNAL_CASE_STUDY`
            );
        }

        if (
            !source.sourceMetadata &&
            !source.source
        ) {
            warnings.push(
                `${location} has no source metadata`
            );
        }

        return {
            errors,
            warnings
        };
    }

    validateAll(domains = []) {
        const results = domains.map(
            (domain) =>
                this.validateDomain(domain)
        );

        return {
            valid: results.every(
                (result) => result.valid
            ),
            results,
            errors: results.flatMap(
                (result) => result.errors
            ),
            warnings: results.flatMap(
                (result) => result.warnings
            )
        };
    }

    assertValid(domain) {
        const result =
            this.validateDomain(domain);

        if (!result.valid) {
            throw new Error(
                `Invalid knowledge domain: ${result.errors.join(
                    "; "
                )}`
            );
        }

        return true;
    }

    isValidDate(value) {
        const date = new Date(value);

        return !Number.isNaN(
            date.getTime()
        );
    }
}

export default KnowledgeValidator;
