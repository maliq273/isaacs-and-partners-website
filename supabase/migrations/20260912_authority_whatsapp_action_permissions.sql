-- Isaacs & Partners
-- Expose authoritative action_permissions through WhatsApp authority resolution.
-- The authority directory is the source of truth for organisational action authority.

drop function if exists public.authority_directory_match_whatsapp(text);

create function public.authority_directory_match_whatsapp(p_phone text)
returns table(
  id uuid,
  user_id uuid,
  full_name text,
  phone_number text,
  authority_role text,
  job_title text,
  department text,
  is_active boolean,
  action_permissions jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.user_id,
    a.full_name,
    a.phone_number,
    a.authority_role,
    a.job_title,
    a.department,
    a.is_active,
    coalesce(a.action_permissions, '{}'::jsonb) as action_permissions
  from public.authority_directory a
  where a.is_active = true
    and public.normalise_authority_phone(a.phone_number) = public.normalise_authority_phone(p_phone);
$$;
