-- Control-plane reliability migration
-- Adds the persistence tables used by the existing integration/reporting services
-- without weakening the existing permission/RLS model.

create table if not exists public.integration_providers (
    provider_key text primary key,
    display_name text not null,
    enabled boolean not null default false,
    status text not null default 'DISCONNECTED',
    last_success_at timestamptz,
    last_error text,
    metadata jsonb not null default '{}'::jsonb,
    updated_at timestamptz not null default now()
);

create table if not exists public.integration_events (
    id uuid primary key default gen_random_uuid(),
    event_type text not null,
    entity_type text,
    entity_id uuid,
    operation text,
    source text,
    status text not null default 'PENDING',
    attempts integer not null default 0,
    available_at timestamptz not null default now(),
    processed_at timestamptz,
    last_error text,
    correlation_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists integration_events_status_available_idx on public.integration_events(status, available_at);
create index if not exists integration_events_created_at_idx on public.integration_events(created_at desc);

create table if not exists public.documents (
    id uuid primary key default gen_random_uuid(),
    matter_id uuid references public.matters(id) on delete cascade,
    document_type text,
    name text not null,
    status text not null default 'PENDING',
    required boolean not null default false,
    reviewed boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists documents_matter_id_idx on public.documents(matter_id);
create index if not exists documents_created_at_idx on public.documents(created_at desc);

alter table public.integration_providers enable row level security;
alter table public.integration_events enable row level security;
alter table public.documents enable row level security;

drop policy if exists integration_providers_admin_select on public.integration_providers;
create policy integration_providers_admin_select on public.integration_providers for select to authenticated using (public.is_super_admin());

drop policy if exists integration_providers_admin_write on public.integration_providers;
create policy integration_providers_admin_write on public.integration_providers for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists integration_events_admin_select on public.integration_events;
create policy integration_events_admin_select on public.integration_events for select to authenticated using (public.is_super_admin());

drop policy if exists integration_events_admin_write on public.integration_events;
create policy integration_events_admin_write on public.integration_events for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists documents_select_authorised on public.documents;
create policy documents_select_authorised on public.documents for select to authenticated using (
    public.is_super_admin()
    or (matter_id is not null and (
        exists (select 1 from public.matters m where m.id = documents.matter_id and m.individual_user_id = auth.uid())
        or exists (select 1 from public.matters m join public.businesses b on b.id = m.business_id where m.id = documents.matter_id and b.owner_user_id = auth.uid())
        or (public.current_user_role() = 'STAFF'::public.app_role and public.has_staff_permission('view_documents'::text) and public.staff_can_access_matter(documents.matter_id, 'view_documents'::text))
    ))
);

drop policy if exists documents_admin_write on public.documents;
create policy documents_admin_write on public.documents for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

drop trigger if exists integration_providers_set_updated_at on public.integration_providers;
create trigger integration_providers_set_updated_at before update on public.integration_providers for each row execute function public.set_updated_at();

drop trigger if exists integration_events_set_updated_at on public.integration_events;
create trigger integration_events_set_updated_at before update on public.integration_events for each row execute function public.set_updated_at();

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at before update on public.documents for each row execute function public.set_updated_at();

insert into public.integration_providers(provider_key, display_name)
values ('supabase', 'Supabase'), ('zoho', 'Zoho'), ('whatsapp', 'WhatsApp'), ('google', 'Google')
on conflict (provider_key) do nothing;

comment on table public.integration_providers is 'Control-plane provider registry consumed by IntegrationDataService.';
comment on table public.integration_events is 'Durable control-plane event/outbox records for third-party synchronisation.';
comment on table public.documents is 'Matter document records consumed by reporting and document workflows.';
