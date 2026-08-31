-- PR32 follow-up security hardening.
-- The organisation master RPC is an authenticated Super Admin operation.
-- Anonymous clients must not be able to invoke the function.

revoke execute
on function public.save_organisation_master(jsonb)
from anon;

revoke execute
on function public.save_organisation_master(jsonb)
from public;

grant execute
on function public.save_organisation_master(jsonb)
to authenticated;

comment on function public.save_organisation_master(jsonb) is
    'Authoritative Super Admin write path for the single active Isaacs & Partners organisation master record. Anonymous execution is explicitly prohibited.';
