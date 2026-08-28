-- Isaacs & Partners
-- Final repair for environments where an obsolete two-argument
-- has_staff_permission overload remains and blocks one-argument calls.
drop function if exists public.has_staff_permission(text, text);
