/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * Upload Preview
 * ============================================================
 *
 * LOCATION
 * app/uploads/preview.js
 *
 * PURPOSE
 * Generates safe browser previews for uploaded files.
 * ============================================================
 */

const UploadPreview = {

    /**
     * ========================================================
     * GET FILE TYPE
     * ========================================================
     */

    getType(file) {

        if (!file) {
            return "unknown";
        }

        const mime =
            file.type ||
            "";

        if (
            mime ===
            "application/pdf"
        ) {
            return "pdf";
        }

        if (
            mime.startsWith(
                "image/"
            )
        ) {
            return "image";
        }

        if (
            mime.includes(
                "word"
            ) ||
            mime.includes(
                "document"
            )
        ) {
            return "document";
        }

        return "unknown";

    },

    /**
     * ========================================================
     * CREATE PREVIEW
     * ========================================================
     */

    create(file) {

        if (!file) {
            throw new Error(
                "File is required for preview."
            );
        }

        const type =
            this.getType(
                file
            );

        let url = null;

        if (
            typeof URL !==
            "undefined"
        ) {

            url =
                URL.createObjectURL(
                    file
                );

        }

        return {

            type,

            name:
                file.name ||
                "Unnamed file",

            size:
                file.size ||
                0,

            mime:
                file.type ||
                "",

            url

        };

    },

    /**
     * ========================================================
     * RELEASE PREVIEW
     * ========================================================
     */

    release(
        preview
    ) {

        if (
            preview?.url &&
            typeof URL !==
                "undefined"
        ) {

            URL.revokeObjectURL(
                preview.url
            );

        }

    },

    /**
     * ========================================================
     * FORMAT FILE SIZE
     * ========================================================
     */

    formatSize(
        bytes = 0
    ) {

        if (
            bytes === 0
        ) {
            return "0 Bytes";
        }

        const units = [
            "Bytes",
            "KB",
            "MB",
            "GB"
        ];

        const index =
            Math.floor(
                Math.log(bytes) /
                Math.log(1024)
            );

        return (
            parseFloat(
                (
                    bytes /
                    Math.pow(
                        1024,
                        index
                    )
                ).toFixed(2)
            ) +
            " " +
            units[index]
        );

    }

    /*
     * ========================================================
     * FUTURE INSERT
     *
     * PDF page preview
     * Image thumbnails
     * OCR preview
     * AI classification preview
     * Document comparison
     * Sensitive-data masking
     * ========================================================
     */

};

export default UploadPreview;
