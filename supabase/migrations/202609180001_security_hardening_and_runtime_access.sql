-- Security hardening applied to production Supabase.
-- Keeps AI/relationship state server-controlled, restricts identity requests to Super Admins,
-- removes SECURITY DEFINER execution from PUBLIC, and pins mutable function search paths.

alter table public.communication_identity_requests enable row level security;

drop policy if exists "communication_identity_requests_super_admin" on public.communication_identity_requests;
create policy "communication_identity_requests_super_admin"
on public.communication_identity_requests
for all to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

drop policy if exists "ai_customer_relationship_state_service_only" on public.ai_customer_relationship_state;
create policy "ai_customer_relationship_state_service_only"
on public.ai_customer_relationship_state
for all to authenticated
using (false)
with check (false);

drop policy if exists "ai_relationship_commitments_service_only" on public.ai_relationship_commitments;
create policy "ai_relationship_commitments_service_only"
on public.ai_relationship_commitments
for all to authenticated
using (false)
with check (false);

drop policy if exists "ai_relationship_operational_state_service_only" on public.ai_relationship_operational_state;
create policy "ai_relationship_operational_state_service_only"
on public.ai_relationship_operational_state
for all to authenticated
using (false)
with check (false);

drop policy if exists "github_integration_config_super_admin" on public.github_integration_config;
create policy "github_integration_config_super_admin"
on public.github_integration_config
for all to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

do $$
declare r record;
begin
  for r in
    select p.proname, pg_get_function_identity_arguments(p.oid) args,
           has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    execute format('revoke execute on function public.%I(%s) from public', r.proname, r.args);
    if r.auth_exec then
      execute format('grant execute on function public.%I(%s) to authenticated', r.proname, r.args);
    end if;
  end loop;
end $$;

grant execute on function public.submit_public_enquiry(text,text,text,text,text,jsonb,boolean,jsonb) to anon;

alter function public.normalise_authority_phone(text) set search_path = public, pg_catalog;
alter function public.set_updated_at() set search_path = public, pg_catalog;
alter function public.set_operational_updated_at() set search_path = public, pg_catalog;
alter function public.set_integration_provider_updated_at() set search_path = public, pg_catalog;
alter function public.update_client_documents_updated_at() set search_path = public, pg_catalog;
alter function public.set_client_document_ingestion_updated_at() set search_path = public, pg_catalog;
alter function public.client_document_storage_prefix(uuid) set search_path = public, pg_catalog;
alter function public.touch_communication_message_updated_at() set search_path = public, pg_catalog;
alter function public.set_ai_liaison_updated_at() set search_path = public, pg_catalog;
alter function public.whatsapp_chat_id_from_phone(text) set search_path = public, pg_catalog;
alter function public.normalise_whatsapp_phone(text) set search_path = public, pg_catalog;
