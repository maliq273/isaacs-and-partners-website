/**
 * PR39 — provider-neutral document understanding decision engine.
 *
 * This module does not call an AI provider. A trusted worker supplies OCR/vision
 * observations and this engine turns them into a deterministic understanding
 * contract. It refuses to silently invent unreadable text.
 */
export default class DocumentUnderstandingEngine {
    constructor({ clarificationThreshold = 0.85 } = {}) {
        this.clarificationThreshold = Math.min(Math.max(Number(clarificationThreshold) || 0.85, 0), 1);
    }

    analyse({ documentId, sourceSha256 = null, pages = [], fullText = '' } = {}) {
        if (!documentId) throw new Error('Document ID is required.');
        const segments = pages.flatMap(page => this.#normalisePage(page));
        const uncertain = segments.filter(segment => segment.status === 'UNCERTAIN');
        const confidences = segments.map(segment => segment.confidence).filter(value => Number.isFinite(value));
        const overallConfidence = confidences.length
            ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
            : null;

        const state = uncertain.length > 0
            ? 'NEEDS_CLARIFICATION'
            : (overallConfidence === null || overallConfidence >= this.clarificationThreshold ? 'VALIDATED' : 'NEEDS_CLARIFICATION');

        return {
            documentId,
            sourceSha256,
            state,
            overallConfidence,
            extractedText: String(fullText || ''),
            segments,
            clarifications: uncertain.map(segment => this.#clarificationFor(segment)),
            warnings: uncertain.length ? ['One or more document sections could not be read with sufficient confidence.'] : []
        };
    }

    #normalisePage(page = {}) {
        const pageNumber = Number(page.pageNumber || page.page || 0) || null;
        const rawSegments = Array.isArray(page.segments) && page.segments.length
            ? page.segments
            : [{ text: page.text || '', confidence: page.confidence, sectionLabel: page.sectionLabel }];

        return rawSegments.map(segment => {
            const text = String(segment.text || '');
            const confidence = this.#confidence(segment.confidence);
            const explicitUncertainty = segment.status === 'UNCERTAIN' || segment.uncertain === true;
            const unreadable = !text.trim() || /[�□]{1,}/u.test(text) || /\?{2,}/u.test(text);
            const status = explicitUncertainty || unreadable || (confidence !== null && confidence < this.clarificationThreshold)
                ? 'UNCERTAIN'
                : 'CLEAR';

            return {
                pageNumber,
                sectionLabel: segment.sectionLabel || null,
                sourceText: text,
                normalizedText: String(segment.normalizedText || text).trim(),
                confidence,
                status,
                boundingBox: segment.boundingBox || null,
                metadata: segment.metadata && typeof segment.metadata === 'object' ? segment.metadata : {}
            };
        });
    }

    #confidence(value) {
        if (value === null || value === undefined || value === '') return null;
        const number = Number(value);
        if (!Number.isFinite(number)) return null;
        return Math.min(Math.max(number, 0), 1);
    }

    #clarificationFor(segment) {
        const location = segment.pageNumber ? ` on page ${segment.pageNumber}` : '';
        const section = segment.sectionLabel ? ` in the “${segment.sectionLabel}” section` : '';
        const detected = segment.sourceText ? ` Detected text: “${segment.sourceText}”.` : '';
        return {
            pageNumber: segment.pageNumber,
            sectionLabel: segment.sectionLabel,
            detectedText: segment.sourceText || null,
            requestedValueType: segment.metadata?.valueType || null,
            prompt: `Please confirm what this document section says${section}${location}.${detected} Enter the text exactly as it appears on the original document.`
        };
    }
}
