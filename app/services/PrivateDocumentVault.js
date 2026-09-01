/** PR40 private client dossier vault. */
export default class PrivateDocumentVault {
    constructor({ supabase, logger = console } = {}) {
        if (!supabase) throw new Error('Supabase client is required.');
        this.supabase = supabase;
        this.logger = logger;
        this.bucket = 'client-dossiers';
        this.maxFileSize = 50 * 1024 * 1024;
        this.allowedMimeTypes = new Set(['application/pdf','image/jpeg','image/png','image/webp','image/tiff','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/plain','text/csv']);
    }

    async registerUpload({ clientId, matterId, file, documentType = null, metadata = {} } = {}) {
        if (!clientId || !matterId) throw new Error('Client ID and Matter ID are required.');
        if (!(file instanceof File)) throw new Error('A valid file is required.');
        this.validateFile(file);
        const { data: userData, error: userError } = await this.supabase.auth.getUser();
        const user = userData?.user;
        if (userError || !user?.id) throw new Error('Authentication required.');
        const { data: profile, error: profileError } = await this.supabase.from('profiles').select('id, role').eq('id', user.id).maybeSingle();
        if (profileError) throw profileError;
        if (!profile?.role) throw new Error('Authenticated profile could not be resolved.');
        const role = String(profile.role).toLowerCase();
        const admin = role === 'super_admin';
        const client = clientId === user.id;
        if (!admin && !client && role !== 'staff') throw new Error('Not authorised to upload this document.');
        const { data: matter, error: matterError } = await this.supabase.from('matters').select('id, individual_user_id, business_id').eq('id', matterId).maybeSingle();
        if (matterError) throw matterError;
        if (!matter) throw new Error('Matter not found.');
        const ownerId = matter.business_id || matter.individual_user_id;
        if (!ownerId) throw new Error('Matter has no dossier owner.');
        const safeName = this.sanitiseFilename(file.name);
        const path = `${ownerId}/${matterId}/staging/${crypto.randomUUID()}-${safeName}`;
        const sha256 = await this.sha256(file);
        const mergedMetadata = { ...(metadata && typeof metadata === 'object' ? metadata : {}), upload_source: 'web', storage_stage: 'staging', sha256_algorithm: 'SHA-256', uploader_role: profile.role };
        const { error: uploadError } = await this.supabase.storage.from(this.bucket).upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false, cacheControl: '3600' });
        if (uploadError) throw uploadError;
        let document = null;
        try {
            const { data, error } = await this.supabase.from('client_documents').insert({ client_id: clientId, matter_id: matterId, storage_bucket: this.bucket, storage_path: path, original_name: file.name, mime_type: file.type || 'application/octet-stream', size_bytes: file.size, sha256, document_type: documentType, metadata: mergedMetadata, uploaded_by: user.id, status: 'UPLOADED', ingestion_status: 'PENDING' }).select().single();
            if (error) throw error;
            document = data;
            const { data: job, error: queueError } = await this.supabase.rpc('queue_client_document_ingestion', { p_document_id: document.id });
            if (queueError) throw queueError;
            return { document, ingestionJob: job };
        } catch (error) {
            if (document?.id) await this.supabase.from('client_documents').delete().eq('id', document.id);
            await this.supabase.storage.from(this.bucket).remove([path]);
            throw error;
        }
    }

    async verifyAndMove(document) {
        if (!document?.id || !document?.storage_path || !document.storage_path.includes('/staging/')) throw new Error('A staging document is required.');
        const verifiedPath = document.storage_path.replace('/staging/', '/verified/');
        const { data: userData, error: userError } = await this.supabase.auth.getUser();
        if (userError || !userData?.user?.id) throw new Error('Authentication required.');
        const { error: moveError } = await this.supabase.storage.from(this.bucket).move(document.storage_path, verifiedPath);
        if (moveError) throw moveError;
        try {
            const { data, error } = await this.supabase.from('client_documents').update({ storage_path: verifiedPath, metadata: { ...(document.metadata || {}), storage_stage: 'verified' } }).eq('id', document.id).select().single();
            if (error) throw error;
            const { data: verified, error: verifyError } = await this.supabase.rpc('mark_client_document_verified', { p_document_id: document.id });
            if (verifyError) throw verifyError;
            return verified || data;
        } catch (error) {
            await this.supabase.storage.from(this.bucket).move(verifiedPath, document.storage_path);
            throw error;
        }
    }

    async createSignedUrl(document, expiresIn = 300) {
        if (!document?.storage_path) throw new Error('Document storage path is required.');
        const ttl = Math.min(Math.max(Number(expiresIn) || 300, 60), 300);
        const { data, error } = await this.supabase.storage.from(document.storage_bucket || this.bucket).createSignedUrl(document.storage_path, ttl);
        if (error) throw error;
        return data?.signedUrl || null;
    }

    async listForMatter(matterId) {
        if (!matterId) throw new Error('Matter ID is required.');
        const { data, error } = await this.supabase.from('client_documents').select('*').eq('matter_id', matterId).order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    validateFile(file) {
        if (file.size <= 0) throw new Error('The selected file is empty.');
        if (file.size > this.maxFileSize) throw new Error('The maximum document size is 50 MB.');
        const mime = (file.type || '').toLowerCase();
        if (mime && !this.allowedMimeTypes.has(mime)) throw new Error(`Unsupported document type: ${mime}`);
    }

    sanitiseFilename(name) {
        const cleaned = String(name || 'document').normalize('NFKC').replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.{2,}/g, '.').replace(/^\.+/, '').slice(0, 180);
        return cleaned || 'document';
    }

    async sha256(file) {
        if (!globalThis.crypto?.subtle) throw new Error('Secure browser cryptography is unavailable.');
        const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
        return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
    }

    async remove(document) {
        if (!document?.id || !document?.storage_path) throw new Error('Document record is required.');
        const { error: storageError } = await this.supabase.storage.from(document.storage_bucket || this.bucket).remove([document.storage_path]);
        if (storageError) throw storageError;
        const { error } = await this.supabase.from('client_documents').delete().eq('id', document.id);
        if (error) throw error;
        return true;
    }
}
