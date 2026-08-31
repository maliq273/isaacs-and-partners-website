-- PR36: Private document vault + ingestion boundary
-- Confidential files belong in private Supabase Storage, never GitHub.

CREATE TABLE IF NOT EXISTS public.client_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    matter_id BIGINT REFERENCES public.matters(id) ON DELETE CASCADE,
    storage_bucket TEXT NOT NULL DEFAULT 'client-documents',
    storage_path TEXT NOT NULL UNIQUE,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
    sha256 TEXT,
    document_type TEXT,
    status TEXT NOT NULL DEFAULT 'UPLOADED' CHECK (status IN ('UPLOADED','PROCESSING','READY','FAILED','ARCHIVED')),
    ingestion_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (ingestion_status IN ('PENDING','OCR','CLASSIFYING','EXTRACTING','INDEXING','COMPLETE','FAILED')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_documents_client_idx ON public.client_documents(client_id);
CREATE INDEX IF NOT EXISTS client_documents_matter_idx ON public.client_documents(matter_id);
CREATE INDEX IF NOT EXISTS client_documents_status_idx ON public.client_documents(status, ingestion_status);

ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_documents_client_select ON public.client_documents;
CREATE POLICY client_documents_client_select
ON public.client_documents
FOR SELECT TO authenticated
USING (
    client_id = auth.uid()
    OR is_super_admin()
    OR (
        matter_id IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.matters m
            WHERE m.id = client_documents.matter_id
              AND m.assigned_staff_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS client_documents_client_insert ON public.client_documents;
CREATE POLICY client_documents_client_insert
ON public.client_documents
FOR INSERT TO authenticated
WITH CHECK (
    uploaded_by = auth.uid()
    AND (
        client_id = auth.uid()
        OR is_super_admin()
        OR (
            matter_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.matters m
                WHERE m.id = client_documents.matter_id
                  AND m.assigned_staff_id = auth.uid()
            )
        )
    )
);

DROP POLICY IF EXISTS client_documents_admin_update ON public.client_documents;
CREATE POLICY client_documents_admin_update
ON public.client_documents
FOR UPDATE TO authenticated
USING (is_super_admin() OR uploaded_by = auth.uid())
WITH CHECK (is_super_admin() OR uploaded_by = auth.uid());

DROP POLICY IF EXISTS client_documents_admin_delete ON public.client_documents;
CREATE POLICY client_documents_admin_delete
ON public.client_documents
FOR DELETE TO authenticated
USING (is_super_admin() OR uploaded_by = auth.uid());

CREATE OR REPLACE FUNCTION public.client_document_storage_prefix(p_client_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
    SELECT p_client_id::text || '/';
$$;

REVOKE ALL ON FUNCTION public.client_document_storage_prefix(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.client_document_storage_prefix(UUID) TO authenticated;
