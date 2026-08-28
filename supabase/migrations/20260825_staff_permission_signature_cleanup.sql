-- Isaacs & Partners
-- Migration compatibility repair for legacy staff permission signatures.
--
-- Some environments contain a legacy two-argument has_staff_permission(text,text)
-- function. Its optional/default argument makes one-argument calls ambiguous once
-- the canonical has_staff_permission(text) function is created. Rename the legacy
-- overload rather than dropping it so existing database objects remain intact.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'has_staff_permission'
          AND pg_get_function_identity_arguments(p.oid) = 'text, text'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'has_staff_permission_legacy_v1'
          AND pg_get_function_identity_arguments(p.oid) = 'text, text'
    ) THEN
        ALTER FUNCTION public.has_staff_permission(text, text)
            RENAME TO has_staff_permission_legacy_v1;
    END IF;
END
$$;

COMMENT ON FUNCTION public.has_staff_permission_legacy_v1(text, text) IS
    'Legacy compatibility overload retained under a distinct name. The canonical staff permission API is has_staff_permission(text).';
