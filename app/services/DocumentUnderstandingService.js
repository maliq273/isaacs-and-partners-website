/**
 * PR39 — browser-safe document understanding/clarification service.
 *
 * Reads only RLS-authorised records. AI provider credentials and privileged
 * worker operations never belong in browser code.
 */
export default class DocumentUnderstandingService {
    constructor({ supabase } = {}) {
        if (!supabase) throw new Error('Supabase client is required.');
        this.supabase = supabase;
    }

    async getUnderstanding(documentId) {
        if (!documentId) throw new Error('Document ID is required.');
        const { data, error } = await this.supabase
            .from('client_document_understandings')
            .select('*')
            .eq('document_id', documentId)
            .maybeSingle();
        if (error) throw error;
        return data || null;
    }

    async getSegments(documentId) {
        if (!documentId) throw new Error('Document ID is required.');
        const { data, error } = await this.supabase
            .from('client_document_understanding_segments')
            .select('*')
            .eq('document_id', documentId)
            .order('page_number', { ascending: true })
            .order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
    }

    async listOpenClarifications(documentId = null) {
        let query = this.supabase
            .from('client_document_clarifications')
            .select('*')
            .eq('status', 'OPEN')
            .order('created_at', { ascending: true });

        if (documentId) query = query.eq('document_id', documentId);
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async answerClarification(clarificationId, answer) {
        if (!clarificationId) throw new Error('Clarification ID is required.');
        if (!String(answer || '').trim()) throw new Error('A clarification answer is required.');

        const { data, error } = await this.supabase.rpc('submit_document_clarification', {
            p_clarification_id: clarificationId,
            p_answer: String(answer).trim()
        });
        if (error) throw error;
        return data;
    }
}
