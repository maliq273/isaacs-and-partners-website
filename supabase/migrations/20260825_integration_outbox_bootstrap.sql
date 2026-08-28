-- Isaacs & Partners
-- Bootstrap the integration outbox before the operational data-plane migration.

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
    constraint integration_events_operation_check check (operation in ('INSERT','UPDATE','DELETE')),
    constraint integration_events_status_check check (status in ('PENDING','PROCESSING','COMPLETED','PARTIAL','FAILED','CANCELLED'))
);

create index if not exists integration_events_pending_idx on public.integration_events (status, available_at, created_at);
create index if not exists integration_events_entity_idx on public.integration_events (entity_type, entity_id, created_at desc);
create index if not exists integration_events_correlation_idx on public.integration_events (correlation_id);

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
    insert into public.integration_events (event_type, entity_type, entity_id, operation, source, payload)
    values (TG_TABLE_NAME || '_' || lower(event_operation), TG_TABLE_NAME, entity_id_value, event_operation, 'SUPABASE', row_data);
    return coalesce(NEW, OLD);
end;
$$;

revoke all on function public.enqueue_integration_event() from public;
