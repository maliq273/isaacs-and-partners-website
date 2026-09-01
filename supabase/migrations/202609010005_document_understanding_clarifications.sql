-- PR39: Intelligent document understanding + human clarification boundary.
-- This migration stores analysis state, page/section evidence and explicit
-- clarification requests without exposing privileged AI credentials.

CREATE TABLE IF NOT EXISTS public.client_document_understandings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL UNIQUE REFERENCES public.client_documents(id) ON DELETE CASCADE,
    source_sha256 TEXT,
    state TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (state IN ('PENDING','READING','NEEDS_CLARIFICATION','VALIDATED','FAILED')),
    overall_confidence NUMERIC(5,4)
        CHECK (overall_confidence IS NULL OR (overall_confidence >= 0 AND overall_confidence <= 1)),
    extracted_text TEXT,
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
    model_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_document_understanding_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    understanding_id UUID NOT NULL REFERENCES public.client_document_understandings(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.client_documents(id) ON DELETE CASCADE,
    page_number INTEGER CHECK (page_number IS NULL OR page_number > 0),
    section_label TEXT,
    source_text TEXT,
    normalized_text TEXT,
    confidence NUMERIC(5,4)
        CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
    status TEXT NOT NULL DEFAULT 'CLEAR'
        CHECK (status IN ('CLEAR','UNCERTAIN','CONFIRMED')),
    bounding_box JSONB,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_document_clarifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.client_documents(id) ON DELETE CASCADE,
    understanding_id UUID REFERENCES public.client_document_understandings(id) ON DELETE CASCADE,
    segment_id UUID REFERENCES public.client_document_understanding_segments(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN','ANSWERED','DISMISSED')),
    prompt TEXT NOT NULL,
    detected_text TEXT,
    requested_value_type TEXT,
    answer TEXT,
    answered_by UUID REFERENCES public.profiles(id),
    answered_at TIMESTAMPTZ,
    resolution_notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_document_understandings_document_idx
    ON public.client_document_understandings(document_id);
CREATE INDEX IF NOT EXISTS client_document_segments_document_idx
    ON public.client_document_understanding_segments(document_id, page_number);
CREATE INDEX IF NOT EXISTS client_document_clarifications_document_idx
    ON public.client_document_clarifications(document_id, status, created_at);

ALTER TABLE public.client_document_understandings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_document_understanding_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_document_clarifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_document_understandings_select ON public.client_document_understandings;
CREATE POLICY client_document_understandings_select
ON public.client_document_understandings
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.client_documents d
        WHERE d.id = client_document_understandings.document_id
          AND (
              d.client_id = auth.uid()
              OR public.is_super_admin()
              OR (d.matter_id IS NOT NULL AND public.is_active_staff_assigned_to_matter(d.matter_id))
          )
    )
);

DROP POLICY IF EXISTS client_document_segments_select ON public.client_document_understanding_segments;
CREATE POLICY client_document_segments_select
ON public.client_document_understanding_segments
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.client_documents d
        WHERE d.id = client_document_understanding_segments.document_id
          AND (
              d.client_id = auth.uid()
              OR public.is_super_admin()
              OR (d.matter_id IS NOT NULL AND public.is_active_staff_assigned_to_matter(d.matter_id))
          )
    )
);

DROP POLICY IF EXISTS client_document_clarifications_select ON public.client_document_clarifications;
CREATE POLICY client_document_clarifications_select
ON public.client_document_clarifications
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.client_documents d
        WHERE d.id = client_document_clarifications.document_id
          AND (
              d.client_id = auth.uid()
              OR public.is_super_admin()
              OR (d.matter_id IS NOT NULL AND public.is_active_staff_assigned_to_matter(d.matter_id))
          )
    )
);

-- Clarification requests are created by the trusted worker only. Users resolve
-- them through the SECURITY DEFINER function below after access is checked.
REVOKE ALL ON FUNCTION public.submit_document_clarification(UUID, TEXT) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.submit_document_clarification(
    p_clarification_id UUID,
    p_answer TEXT
)
RETURNS public.client_document_clarifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    c public.client_document_clarifications%ROWTYPE;
    d public.client_documents%ROWTYPE;
    result_row public.client_document_clarifications%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
    END IF;

    IF NULLIF(btrim(COALESCE(p_answer, '')), '') IS NULL THEN
        RAISE EXCEPTION 'A clarification answer is required.' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO c
    FROM public.client_document_clarifications
    WHERE id = p_clarification_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Clarification request not found.' USING ERRCODE = 'P0002';
    END IF;

    SELECT * INTO d
    FROM public.client_documents
    WHERE id = c.document_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Document not found.' USING ERRCODE = 'P0002';
    END IF;

    IF NOT (
        d.client_id = auth.uid()
        OR public.is_super_admin()
        OR (d.matter_id IS NOT NULL AND public.is_active_staff_assigned_to_matter(d.matter_id))
    ) THEN
        RAISE EXCEPTION 'Not authorised to resolve this clarification.' USING ERRCODE = '42501';
    END IF;

    IF c.status <> 'OPEN' THEN
        RAISE EXCEPTION 'Clarification request is no longer open.' USING ERRCODE = '55000';
    END IF;

    UPDATE public.client_document_clarifications
    SET status = 'ANSWERED',
        answer = btrim(p_answer),
        answered_by = auth.uid(),
        answered_at = now(),
        updated_at = now()
    WHERE id = c.id
    RETURNING * INTO result_row;

    UPDATE public.client_document_understandings
    SET state = 'READING',
        updated_at = now()
    WHERE id = c.understanding_id;

    UPDATE public.client_documents
    SET ingestion_status = 'OCR',
        status = CASE WHEN status = 'FAILED' THEN 'UPLOADED' ELSE status END,
        updated_at = now()
    WHERE id = c.document_id;

    RETURN result_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_document_clarification(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_document_understanding_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS client_document_understandings_updated_at
    ON public.client_document_understandings;
CREATE TRIGGER client_document_understandings_updated_at
BEFORE UPDATE ON public.client_document_understandings
FOR EACH ROW EXECUTE FUNCTION public.set_document_understanding_updated_at();

DROP TRIGGER IF EXISTS client_document_clarifications_updated_at
    ON public.client_document_clarifications;
CREATE TRIGGER client_document_clarifications_updated_at
BEFORE UPDATE ON public.client_document_clarifications
FOR EACH ROW EXECUTE FUNCTION public.set_document_understanding_updated_at();

COMMENT ON TABLE public.client_document_understandings IS
    'Trusted AI/document analysis state. Original confidential files remain in private Storage.';
COMMENT ON TABLE public.client_document_understanding_segments IS
    'Page/section evidence used to preserve document context and locate uncertain text.';
COMMENT ON TABLE public.client_document_clarifications IS
    'Explicit human clarification requests for document text the AI/OCR cannot confidently resolve.';
COMMENT ON FUNCTION public.submit_document_clarification(UUID, TEXT) IS
    'Authorised human answer boundary; answered values are retained as provenance and trigger document reprocessing.';
