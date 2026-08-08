/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * ValidationRules
 * ============================================================
 */

export const ValidationRules = Object.freeze({

    REQUIRED: "REQUIRED",

    OPTIONAL: "OPTIONAL",

    EMAIL: "EMAIL",

    PHONE: "PHONE",

    SOUTH_AFRICAN_ID: "SOUTH_AFRICAN_ID",

    PASSPORT: "PASSPORT",

    DATE: "DATE",

    DATETIME: "DATETIME",

    NUMBER: "NUMBER",

    POSITIVE_NUMBER: "POSITIVE_NUMBER",

    CURRENCY: "CURRENCY",

    URL: "URL",

    FILE: "FILE",

    IMAGE: "IMAGE",

    PDF: "PDF",

    DOCUMENT: "DOCUMENT",

    MAX_FILE_SIZE: "MAX_FILE_SIZE",

    MIN_LENGTH: "MIN_LENGTH",

    MAX_LENGTH: "MAX_LENGTH",

    ENUM: "ENUM",

    UNIQUE: "UNIQUE",

    EXISTS: "EXISTS"

    // ========================================================
    // FUTURE INSERT
    // Advanced validation schemas
    // Zod/Joi-compatible mappings
    // AI document validation
    // ========================================================

});

export default ValidationRules;
