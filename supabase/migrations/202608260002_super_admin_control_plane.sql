-- Isaacs & Partners
-- Super Admin Control Plane + durable integration outbox
--
-- Supabase is the authoritative application data store. Every material
-- change made through the application is captured as an integration event.
-- Provider credentials MUST remain in Supabase Edge Function secrets.

create table if not exists public.integration_providers (
    provider_key text primary key,
    display_name text not null,
    enabled boolean not null default false,
    status text not null default 'NOT_CONFIGURED',
    last_success_at timestamptz null,
    last_error text null,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint integration_providers_status_check
        check (status in ('CONNECTED','DEGRADED','ERROR','NOT_CONFIGURED','DISABLED'))
);

create table if not exists public.integration_events (
    id uuid primary key default gen_random_uuid(),
    event_type text not null,
    entity_type text not null,
    entity_id uuid null,
    operation text not null,
    source text not null default 'SUPABASE',
    payload jsonb not null default '{}'::jsonb,
    status text not null default 'PENDING',
    attempts integer not null default 0,
    available_at timestamptz not null default now(),
    processed_at timestamptz null,
    last_error text null,
    correlation_id uuid null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint integration_events_operation_check
        check (operation in ('INSERT','UPDATE','DELETE')),
    constraint integration_events_status_check
        check (status in ('PENDING','PROCESSING','COMPLETED','PARTIAL','FAILED','CANCELLED'))
);

create index if not exists integration_events_pending_idx
    on public.integration_events (status, available_at, created_at);

create index if not exists integration_events_entity_idx
    on public.integration_events (entity_type, entity_id, created_at desc);

create index if not exists integration_events_correlation_idx
    on public.integration_events (correlation_id);

insert into public.integration_providers (provider_key, display_name, enabled, status)
values
    ('supabase', 'Supabase', true, 'CONNECTED'),
    ('zoho', 'Zoho', false, 'NOT_CONFIGURED'),
    ('whatsapp', 'WhatsApp', false, 'NOT_CONFIGURED'),
    ('email', 'Email', false, 'NOT_CONFIGURED'),
    ('payments', 'Payments', false, 'NOT_CONFIGURED')
on conflict (provider_key) do nothing;

create or replace function public.set_integration_provider_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

 drop trigger if exists integration_providers_updated_at on public.integration_providers;
create trigger integration_providers_updated_at
before update on public.integration_providers
for each row execute function public.set_integration_provider_updated_at();

create or replace function public.enqueue_integration_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    row_data jsonb;
    event_operation text;
    entity_id_value uuid;
begin
    event_operation := upper(TG_OP);

    if TG_OP = 'DELETE' then
        row_data := to_jsonb(OLD);
        entity_id_value := OLD.id;
    else
        row_data := to_jsonb(NEW);
        entity_id_value := NEW.id;
    end if;

    insert into public.integration_events (
        event_type,
        entity_type,
        entity_id,
        operation,
        source,
        payload
    )
    values (
        TG_TABLE_NAME || '_' || lower(event_operation),
        TG_TABLE_NAME,
        entity_id_value,
        event_operation,
        'SUPABASE',
        row_data
    );

    return coalesce(NEW, OLD);
end;
$$;

do $$
declare
    table_name text;
begin
    foreach table_name in array array[
        'profiles', 'staff', 'businesses', 'matters', 'cases', 'assignments', 'quotes'
    ] loop
        execute format('drop trigger if exists integration_event_%I on public.%I', table_name, table_name);
        execute format(
            'create trigger integration_event_%I after insert or update or delete on public.%I for each row execute function public.enqueue_integration_event()',
            table_name, table_name
        );
    end loop;
end $$;

alter table public.integration_providers enable row level security;
alter table public.integration_events enable row level security;

drop policy if exists integration_providers_admin_select on public.integration_providers;
create policy integration_providers_admin_select on public.integration_providers for select to authenticated using (public.is_super_admin());

drop policy if exists integration_providers_admin_update on public.integration_providers;
create policy integration_providers_admin_update on public.integration_providers for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists integration_events_admin_select on public.integration_events;
create policy integration_events_admin_select on public.integration_events for select to authenticated using (public.is_super_admin());

revoke all on public.integration_events from anon;
revoke all on public.integration_events from authenticated;
grant select on public.integration_events to authenticated;
grant select, update on public.integration_providers to authenticated;

comment on table public.integration_events is 'Durable outbound integration outbox. Service-role Edge Functions consume events and synchronize configured providers.';
comment on table public.integration_providers is 'Provider registry and health state. Secrets are stored only in Supabase Edge Function secrets.';
