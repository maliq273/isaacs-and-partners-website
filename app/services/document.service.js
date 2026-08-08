/**
 * ============================================================
 * ISAACS & PARTNERS ENTERPRISE PLATFORM
 * document.service.js
 * ============================================================
 *
 * LOCATION
 * app/services/document.service.js
 *
 * PURPOSE
 * Legacy compatibility adapter.
 *
 * MAIN SERVICE
 * DocumentService.js
 * ============================================================
 */

import DocumentService
    from "./DocumentService.js";

const documentService =
    new DocumentService();

export async function createDocument(
    data
) {

    return documentService.createDocument(
        data
    );

}

export async function getDocument(
    id
) {

    return documentService.getDocument(
        id
    );

}

export async function getMatterDocuments(
    matterId
) {

    return documentService.getMatterDocuments(
        matterId
    );

}

export async function uploadDocument(
    data
) {

    return documentService.uploadDocument(
        data
    );

}

export async function analyseDocument(
    document
) {

    return documentService.analyseDocument(
        document
    );

}

export async function deleteDocument(
    id
) {

    return documentService.deleteDocument(
        id
    );

}


/*
 * ============================================================
 * FUTURE INSERT
 *
 * Bundle generation
 * OCR
 * AI matching
 * VFS
 * DHA
 * Printing
 * GitHub archival
 * ============================================================
 */

export default documentService;
