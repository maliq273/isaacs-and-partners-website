-- PR36: Private document vault + ingestion boundary
-- Confidential files belong in private Supabase Storage, never GitHub.

CREATE TABLE IF NOT EXISTS public.client_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE,
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

-- SECURITY DEFINER is used only for the assignment lookup because assignments/staff
-- themselves are protected by RLS. The function exposes only a boolean decision.
CREATE OR REPLACE FUNCTION public.is_active_staff_assigned_to_matter(p_matter_id UUID, p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.assignments a
        JOIN public.staff s ON s.id = a.staff_id
        WHERE a.matter_id = p_matter_id
          AND s.user_id = p_user_id
          AND s.is_active = true
          AND a.status = 'ACTIVE'::assignment_status
    );
$$;

REVOKE ALL ON FUNCTION public.is_active_staff_assigned_to_matter(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_staff_assigned_to_matter(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS client_documents_client_select ON public.client_documents;
CREATE POLICY client_documents_client_select ON public.client_documents
FOR SELECT TO authenticated USING (
    client_id = auth.uid()
    OR is_super_admin()
    OR (matter_id IS NOT NULL AND public.is_active_staff_assigned_to_matter(matter_id))
);

DROP POLICY IF EXISTS client_documents_client_insert ON public.client_documents;
CREATE POLICY client_documents_client_insert ON public.client_documents
FOR INSERT TO authenticated WITH CHECK (
    uploaded_by = auth.uid()
    AND (
        client_id = auth.uid()
        OR is_super_admin()
        OR (matter_id IS NOT NULL AND public.is_active_staff_assigned_to_matter(matter_id))
    )
);

DROP POLICY IF EXISTS client_documents_admin_update ON public.client_documents;
CREATE POLICY client_documents_admin_update ON public.client_documents
FOR UPDATE TO authenticated
USING (is_super_admin() OR uploaded_by = auth.uid())
WITH CHECK (is_super_admin() OR uploaded_by = auth.uid());

DROP POLICY IF EXISTS client_documents_admin_delete ON public.client_documents;
CREATE POLICY client_documents_admin_delete ON public.client_documents
FOR DELETE TO authenticated USING (is_super_admin() OR uploaded_by = auth.uid());

-- Always private. Storage object policies below are the actual file-level boundary.
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-documents', 'client-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS client_documents_storage_select ON storage.objects;
CREATE POLICY client_documents_storage_select ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'client-documents'
    AND (
        split_part(name, '/', 1) = auth.uid()::text
        OR is_super_admin()
        OR (
            NULLIF(split_part(name, '/', 2), '') IS NOT NULL
            AND public.is_active_staff_assigned_to_matter(
                NULLIF(split_part(name, '/', 2), '')::uuid
            )
        )
    )
);

DROP POLICY IF EXISTS client_documents_storage_insert ON storage.objects;
CREATE POLICY client_documents_storage_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'client-documents'
    AND (
        split_part(name, '/', 1) = auth.uid()::text
        OR is_super_admin()
        OR (
            NULLIF(split_part(name, '/', 2), '') IS NOT NULL
            AND public.is_active_staff_assigned_to_matter(
                NULLIF(split_part(name, '/', 2), '')::uuid
            )
        )
    )
);

DROP POLICY IF EXISTS client_documents_storage_update ON storage.objects;
CREATE POLICY client_documents_storage_update ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'client-documents'
    AND (split_part(name, '/', 1) = auth.uid()::text OR is_super_admin())
)
WITH CHECK (
    bucket_id = 'client-documents'
    AND (split_part(name, '/', 1) = auth.uid()::text OR is_super_admin())
);

DROP POLICY IF EXISTS client_documents_storage_delete ON storage.objects;
CREATE POLICY client_documents_storage_delete ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'client-documents'
    AND (split_part(name, '/', 1) = auth.uid()::text OR is_super_admin())
);

CREATE OR REPLACE FUNCTION public.client_document_storage_prefix(p_client_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT p_client_id::text || '/';
$$;

REVOKE ALL ON FUNCTION public.client_document_storage_prefix(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.client_document_storage_prefix(UUID) TO authenticated;
