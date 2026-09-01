/**
 * Isaacs & Partners — Private Document Vault
 *
 * Browser-safe orchestration boundary for confidential client files.
 * No service-role, OpenAI or GitHub secret belongs in this module.
 * Confidential files are stored only in the private Supabase bucket.
 *
 * PR37 adds:
 * - browser-side validation before upload
 * - SHA-256 provenance hash
 * - role-aware path handling
 * - atomic cleanup when metadata/queue registration fails
 * - explicit hand-off to the trusted ingestion queue
 */
export default class PrivateDocumentVault {
    constructor({ supabase, logger = console } = {}) {
        if (!supabase) throw new Error('Supabase client is required.');
        this.supabase = supabase;
        this.logger = logger;
        this.bucket = 'client-documents';
        this.maxFileSize = 50 * 1024 * 1024;
        this.allowedMimeTypes = new Set([
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/tiff',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'text/csv'
        ]);
    }

    async registerUpload({ clientId, matterId = null, file, documentType = null, metadata = {} } = {}) {
        if (!clientId) throw new Error('Client ID is required.');
        if (!(file instanceof File)) throw new Error('A valid file is required.');
        this.validateFile(file);

        const { data: userData, error: userError } = await this.supabase.auth.getUser();
        const user = userData?.user;
        if (userError || !user?.id) throw new Error('Authentication required.');

        const { data: profile, error: profileError } = await this.supabase
            .from('profiles')
            .select('id, role')
            .eq('id', user.id)
            .maybeSingle();

        if (profileError) throw profileError;
        if (!profile?.role) throw new Error('Authenticated profile could not be resolved.');

        const isSuperAdmin = profile.role === 'super_admin';
        const isClient = clientId === user.id;
        const isStaff = profile.role === 'staff';

        // Existing Storage RLS requires staff uploads to be scoped to a matter.
        // This prevents a staff member from creating an unscoped client object.
        if (isStaff && !matterId) {
            throw new Error('Staff document uploads must be associated with a matter.');
        }

        if (!isSuperAdmin && !isClient && !isStaff) {
            throw new Error('You are not authorised to upload documents for this client.');
        }

        const safeName = this.sanitiseFilename(file.name);
        const scope = matterId ? `${clientId}/${matterId}` : `${clientId}/general`;
        const path = `${scope}/${crypto.randomUUID()}-${safeName}`;
        const sha256 = await this.sha256(file);
        const mergedMetadata = {
            ...(metadata && typeof metadata === 'object' ? metadata : {}),
            upload_source: 'web',
            sha256_algorithm: 'SHA-256',
            uploader_role: profile.role
        };

        const { error: uploadError } = await this.supabase.storage
            .from(this.bucket)
            .upload(path, file, {
                contentType: file.type || 'application/octet-stream',
                upsert: false,
                cacheControl: '3600'
            });

        if (uploadError) throw uploadError;

        try {
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
                    sha256,
                    document_type: documentType,
                    metadata: mergedMetadata,
                    uploaded_by: user.id,
                    status: 'UPLOADED',
                    ingestion_status: 'PENDING'
                })
                .select()
                .single();

            if (error) throw error;

            const { data: job, error: queueError } = await this.supabase
                .rpc('queue_client_document_ingestion', { p_document_id: data.id });

            if (queueError) throw queueError;

            return { document: data, ingestionJob: job };
        } catch (error) {
            await this.supabase.storage.from(this.bucket).remove([path]);
            throw error;
        }
    }

    validateFile(file) {
        if (file.size <= 0) throw new Error('The selected file is empty.');
        if (file.size > this.maxFileSize) {
            throw new Error('The maximum document size is 50 MB.');
        }

        const mime = (file.type || '').toLowerCase();
        if (mime && !this.allowedMimeTypes.has(mime)) {
            throw new Error(`Unsupported document type: ${mime}`);
        }
    }

    sanitiseFilename(name) {
        const fallback = 'document';
        const cleaned = String(name || fallback)
            .normalize('NFKC')
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/\.{2,}/g, '.')
            .replace(/^\.+/, '')
            .slice(0, 180);
        return cleaned || fallback;
    }

    async sha256(file) {
        if (!globalThis.crypto?.subtle) {
            throw new Error('Secure browser cryptography is unavailable.');
        }

        const buffer = await file.arrayBuffer();
        const digest = await crypto.subtle.digest('SHA-256', buffer);
        return Array.from(new Uint8Array(digest))
            .map(byte => byte.toString(16).padStart(2, '0'))
            .join('');
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
