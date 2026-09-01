-- PR37: Secure client document ingestion queue.
-- The private Storage object remains the source file. This table is only
-- orchestration state for the trusted ingestion worker.

CREATE TABLE IF NOT EXISTS public.client_document_ingestion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL UNIQUE REFERENCES public.client_documents(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'QUEUED'
        CHECK (status IN ('QUEUED','PROCESSING','COMPLETED','FAILED','CANCELLED')),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_error TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_document_ingestion_jobs_status_idx
    ON public.client_document_ingestion_jobs(status, available_at, created_at);

CREATE INDEX IF NOT EXISTS client_document_ingestion_jobs_document_idx
    ON public.client_document_ingestion_jobs(document_id);

ALTER TABLE public.client_document_ingestion_jobs ENABLE ROW LEVEL SECURITY;

-- Queue rows are worker-control records. Normal authenticated users must not
-- be able to read or mutate the queue directly.
DROP POLICY IF EXISTS client_document_ingestion_jobs_admin_select
    ON public.client_document_ingestion_jobs;
DROP POLICY IF EXISTS client_document_ingestion_jobs_admin_update
    ON public.client_document_ingestion_jobs;

CREATE POLICY client_document_ingestion_jobs_admin_select
ON public.client_document_ingestion_jobs
FOR SELECT TO authenticated
USING (is_super_admin());

CREATE POLICY client_document_ingestion_jobs_admin_update
ON public.client_document_ingestion_jobs
FOR UPDATE TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE OR REPLACE FUNCTION public.queue_client_document_ingestion(p_document_id UUID)
RETURNS public.client_document_ingestion_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    d public.client_documents%ROWTYPE;
    queued public.client_document_ingestion_jobs%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO d
    FROM public.client_documents
    WHERE id = p_document_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Document not found.' USING ERRCODE = 'P0002';
    END IF;

    IF NOT (
        d.client_id = auth.uid()
        OR public.is_super_admin()
        OR (d.matter_id IS NOT NULL AND public.is_active_staff_assigned_to_matter(d.matter_id))
    ) THEN
        RAISE EXCEPTION 'Not authorised to queue this document.' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.client_document_ingestion_jobs (document_id, status, attempts, available_at)
    VALUES (d.id, 'QUEUED', 0, now())
    ON CONFLICT (document_id) DO UPDATE
    SET status = CASE
            WHEN public.client_document_ingestion_jobs.status IN ('COMPLETED','CANCELLED')
                THEN 'QUEUED'
            ELSE public.client_document_ingestion_jobs.status
        END,
        available_at = CASE
            WHEN public.client_document_ingestion_jobs.status IN ('COMPLETED','CANCELLED')
                THEN now()
            ELSE public.client_document_ingestion_jobs.available_at
        END,
        last_error = CASE
            WHEN public.client_document_ingestion_jobs.status IN ('COMPLETED','CANCELLED')
                THEN NULL
            ELSE public.client_document_ingestion_jobs.last_error
        END,
        updated_at = now()
    RETURNING * INTO queued;

    UPDATE public.client_documents
    SET ingestion_status = 'PENDING',
        status = CASE WHEN status = 'FAILED' THEN 'UPLOADED' ELSE status END,
        updated_at = now()
    WHERE id = d.id;

    RETURN queued;
END;
$$;

REVOKE ALL ON FUNCTION public.queue_client_document_ingestion(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.queue_client_document_ingestion(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.queue_client_document_ingestion(UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.set_client_document_ingestion_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS client_document_ingestion_jobs_updated_at
    ON public.client_document_ingestion_jobs;

CREATE TRIGGER client_document_ingestion_jobs_updated_at
BEFORE UPDATE ON public.client_document_ingestion_jobs
FOR EACH ROW
EXECUTE FUNCTION public.set_client_document_ingestion_updated_at();

COMMENT ON TABLE public.client_document_ingestion_jobs IS
    'Trusted ingestion worker queue for confidential client documents; source files remain in private Supabase Storage.';
COMMENT ON FUNCTION public.queue_client_document_ingestion(UUID) IS
    'Authorised boundary for placing a client document into the private ingestion queue.';
