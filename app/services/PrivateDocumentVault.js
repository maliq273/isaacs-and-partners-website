/**
 * Isaacs & Partners — Private Document Vault
 *
 * Browser-safe orchestration boundary for confidential client files.
 * No service-role, OpenAI or GitHub secret belongs in this module.
 * Confidential files are stored only in the private Supabase bucket.
 */
export default class PrivateDocumentVault {
    constructor({ supabase, logger = console } = {}) {
        if (!supabase) throw new Error('Supabase client is required.');
        this.supabase = supabase;
        this.logger = logger;
        this.bucket = 'client-documents';
    }

    async registerUpload({ clientId, matterId = null, file, documentType = null, metadata = {} } = {}) {
        if (!clientId) throw new Error('Client ID is required.');
        if (!(file instanceof File)) throw new Error('A valid file is required.');

        const { data: userData, error: userError } = await this.supabase.auth.getUser();
        if (userError || !userData?.user?.id) throw new Error('Authentication required.');

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const scope = matterId ? `${clientId}/${matterId}` : `${clientId}/general`;
        const path = `${scope}/${crypto.randomUUID()}-${safeName}`;

        const { error: uploadError } = await this.supabase.storage
            .from(this.bucket)
            .upload(path, file, {
                contentType: file.type || 'application/octet-stream',
                upsert: false,
                cacheControl: '3600'
            });

        if (uploadError) throw uploadError;

        const { data, error } = await this.supabase
            .from('client_documents')
            .insert({
                client_id: clientId,
                matter_id: matterId,
                storage_bucket: this.bucket,
                storage_path: path,
                original_name: file.name,
                mime_type: file.type || 'application/octet-stream',
                size_bytes: file.size,
                document_type: documentType,
                metadata,
                uploaded_by: userData.user.id
            })
            .select()
            .single();

        if (error) {
            await this.supabase.storage.from(this.bucket).remove([path]);
            throw error;
        }

        return data;
    }

    async listForMatter(matterId) {
        if (!matterId) throw new Error('Matter ID is required.');
        const { data, error } = await this.supabase
            .from('client_documents')
            .select('*')
            .eq('matter_id', matterId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async createSignedUrl(document, expiresIn = 300) {
        if (!document?.storage_path) throw new Error('Document storage path is required.');
        const ttl = Math.min(Math.max(Number(expiresIn) || 300, 60), 900);
        const { data, error } = await this.supabase.storage
            .from(document.storage_bucket || this.bucket)
            .createSignedUrl(document.storage_path, ttl);
        if (error) throw error;
        return data?.signedUrl || null;
    }

    async remove(document) {
        if (!document?.id || !document?.storage_path) throw new Error('Document record is required.');
        const { error: storageError } = await this.supabase.storage
            .from(document.storage_bucket || this.bucket)
            .remove([document.storage_path]);
        if (storageError) throw storageError;

        const { error } = await this.supabase
            .from('client_documents')
            .delete()
            .eq('id', document.id);
        if (error) throw error;
        return true;
    }
}
