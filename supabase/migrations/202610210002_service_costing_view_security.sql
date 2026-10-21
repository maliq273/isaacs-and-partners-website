-- Prevent the public pricing API view from bypassing RLS on internal cost tables.
begin;
alter view public.service_costing_summary set (security_invoker = true);
revoke all on table public.service_costing_summary from public, anon;
grant select on table public.service_costing_summary to authenticated, service_role;
comment on view public.service_costing_summary is
  'Internal costing summary. Security-invoker semantics preserve base-table RLS; anonymous access is intentionally disabled.';
commit;
