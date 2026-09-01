-- PR40: Private client dossier storage boundary.
-- Files are always scoped as owner/matter/{staging|verified}/filename.
-- Only Super Admins may create/read/move verified records; clients may only
-- access their own matter staging files and staff may access assigned matters.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('client-dossiers', 'client-dossiers', false, 52428800)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 52428800;

ALTER TABLE public.client_documents
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS client_documents_verified_idx
    ON public.client_documents(verified_at, verified_by);

CREATE OR REPLACE FUNCTION public.client_dossier_path_allowed(
    p_name TEXT,
    p_require_staging BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    parts TEXT[];
    owner_id UUID;
    matter_id UUID;
    stage TEXT;
BEGIN
    IF p_name IS NULL THEN RETURN FALSE; END IF;

    parts := storage.foldername(p_name);
    -- owner / matter / staging|verified / filename
    IF array_length(parts, 1) <> 4 THEN RETURN FALSE; END IF;
    IF parts[1] = '' OR parts[2] = '' OR parts[3] NOT IN ('staging', 'verified') OR parts[4] = '' THEN
        RETURN FALSE;
    END IF;

    BEGIN
        owner_id := parts[1]::uuid;
        matter_id := parts[2]::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
        RETURN FALSE;
    END;

    stage := parts[3];
    IF p_require_staging AND stage <> 'staging' THEN RETURN FALSE; END IF;

    IF is_super_admin() THEN RETURN TRUE; END IF;

    -- Individual owner.
    IF EXISTS (
        SELECT 1 FROM public.matters m
        WHERE m.id = matter_id
          AND m.individual_user_id = auth.uid()
          AND owner_id = m.individual_user_id
    ) THEN
        RETURN stage = 'staging';
    END IF;

    -- Business owner.
    IF EXISTS (
        SELECT 1
        FROM public.matters m
        JOIN public.businesses b ON b.id = m.business_id
        WHERE m.id = matter_id
          AND b.owner_user_id = auth.uid()
          AND owner_id = m.business_id
    ) THEN
        RETURN stage = 'staging';
    END IF;

    -- Staff may work only on actively assigned matters and only in staging.
    IF stage = 'staging' AND public.is_active_staff_assigned_to_matter(matter_id) THEN
        RETURN EXISTS (
            SELECT 1 FROM public.matters m
            WHERE m.id = matter_id
              AND (m.individual_user_id = owner_id OR m.business_id = owner_id)
        );
    END IF;

    RETURN FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.client_dossier_path_allowed(TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.client_dossier_path_allowed(TEXT, BOOLEAN) TO authenticated;

DROP POLICY IF EXISTS client_dossiers_select ON storage.objects;
CREATE POLICY client_dossiers_select
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'client-dossiers'
    AND (
        is_super_admin()
        OR public.client_dossier_path_allowed(name, FALSE)
    )
);

DROP POLICY IF EXISTS client_dossiers_insert ON storage.objects;
CREATE POLICY client_dossiers_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'client-dossiers'
    AND public.client_dossier_path_allowed(name, TRUE)
);

DROP POLICY IF EXISTS client_dossiers_update ON storage.objects;
CREATE POLICY client_dossiers_update
ON storage.objects FOR UPDATE TO authenticated
USING (
    bucket_id = 'client-dossiers'
    AND (is_super_admin() OR public.client_dossier_path_allowed(name, TRUE))
)
WITH CHECK (
    bucket_id = 'client-dossiers'
    AND (is_super_admin() OR public.client_dossier_path_allowed(name, TRUE))
);

DROP POLICY IF EXISTS client_dossiers_delete ON storage.objects;
CREATE POLICY client_dossiers_delete
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'client-dossiers'
    AND is_super_admin()
);

CREATE OR REPLACE FUNCTION public.mark_client_document_verified(p_document_id UUID)
RETURNS public.client_documents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result public.client_documents;
BEGIN
    IF auth.uid() IS NULL OR NOT public.is_super_admin() THEN
        RAISE EXCEPTION 'Super Admin authorisation required.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.client_documents
    SET verified_at = now(),
        verified_by = auth.uid(),
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
            'verification_status', 'VERIFIED',
            'verified_at', now(),
            'verified_by', auth.uid()
        ),
        updated_at = now()
    WHERE id = p_document_id
    RETURNING * INTO result;

    IF result.id IS NULL THEN
        RAISE EXCEPTION 'Document not found.' USING ERRCODE = 'P0002';
    END IF;

    RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_client_document_verified(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_client_document_verified(UUID) TO authenticated;

COMMENT ON TABLE storage.objects IS 'PR40: client-dossiers is private and paths are restricted to owner/matter/staging|verified/filename.';
COMMENT ON FUNCTION public.client_dossier_path_allowed(TEXT, BOOLEAN) IS 'Authorises only canonical client-dossiers paths and prevents arbitrary folder traversal.';
COMMENT ON FUNCTION public.mark_client_document_verified(UUID) IS 'Records Super Admin verification metadata; storage movement is performed through the trusted control plane.';
