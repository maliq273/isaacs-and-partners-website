/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Upload Checklist
 * ============================================================
 *
 * LOCATION
 * app/uploads/checklist.js
 *
 * PURPOSE
 * Controls the document checklist shown during uploads.
 *
 * This module does not decide legal requirements itself.
 * Requirements should ultimately come from the KnowledgeBase.
 * ============================================================
 */

import UploadValidator from "../validators/UploadValidator.js";

const UploadChecklist = {

    version: "1.0.0",

    /**
     * ========================================================
     * CREATE CHECKLIST
     * ========================================================
     */

    create({
        matter = null,
        requiredDocuments = [],
        existingDocuments = []
    } = {}) {

        const uploadedTypes =
            new Set(
                existingDocuments
                    .map(document =>
                        document.type ||
                        document.documentType
                    )
                    .filter(Boolean)
            );

        const items =
            requiredDocuments.map(
                requirement => {

                    const type =
                        typeof requirement === "string"
                            ? requirement
                            : requirement.type ||
                              requirement.documentType;

                    const name =
                        typeof requirement === "string"
                            ? requirement
                            : requirement.name ||
                              requirement.title ||
                              type;

                    return {

                        id:
                            requirement.id ||
                            type,

                        type,

                        name,

                        required:
                            requirement.required !== false,

                        status:
                            uploadedTypes.has(type)
                                ? "COMPLETE"
                                : "OUTSTANDING",

                        matterId:
                            matter?.id || null,

                        /*
                         * ====================================
                         * FUTURE INSERT
                         *
                         * Expiry dates
                         * Certified copies
                         * Translation requirements
                         * Original requirements
                         * Authority-specific requirements
                         * ====================================
                         */

                    };

                }
            );

        return {

            matterId:
                matter?.id || null,

            items,

            total:
                items.length,

            completed:
                items.filter(
                    item =>
                        item.status === "COMPLETE"
                ).length,

            outstanding:
                items.filter(
                    item =>
                        item.status === "OUTSTANDING"
                ).length

        };

    },

    /**
     * ========================================================
     * CHECK FILE AGAINST ITEM
     * ========================================================
     */

    validateFile(
        file,
        checklistItem
    ) {

        const result =
            UploadValidator.validate(
                file
            );

        if (!result.valid) {

            return result;

        }

        if (
            checklistItem?.type &&
            file?.documentType &&
            file.documentType !==
                checklistItem.type
        ) {

            return {

                valid: false,

                errors: [
                    "Uploaded document does not match the required document type."
                ]

            };

        }

        return {

            valid: true,

            errors: []

        };

    },

    /**
     * ========================================================
     * GET OUTSTANDING
     * ========================================================
     */

    getOutstanding(
        checklist = {}
    ) {

        return (
            checklist.items || []
        ).filter(
            item =>
                item.status === "OUTSTANDING"
        );

    },

    /**
     * ========================================================
     * IS COMPLETE
     * ========================================================
     */

    isComplete(
        checklist = {}
    ) {

        return this.getOutstanding(
            checklist
        ).length === 0;

    }

    /*
     * ========================================================
     * FUTURE INSERT
     *
     * AI DOCUMENT MATCHING
     *
     * The AI document analyser will eventually compare an
     * uploaded file against outstanding checklist items and
     * suggest the most likely matching document.
     *
     * Example:
     *
     * passport_scan.pdf
     *      ↓
     * DocumentAnalysis
     *      ↓
     * "PASSPORT"
     *      ↓
     * Checklist item matched
     *
     * ========================================================
     */

};

export default UploadChecklist;
