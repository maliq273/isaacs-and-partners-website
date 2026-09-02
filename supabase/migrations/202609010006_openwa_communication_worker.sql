-- PR43 — OpenWA communication worker boundary
-- OpenWA is an external/self-hosted transport. Secrets remain in Edge Function secrets.

create table if not exists public.communication_messages (
    id uuid primary key default gen_random_uuid(),
    customer_user_id uuid references public.profiles(id) on delete set null,
    matter_id uuid references public.matters(id) on delete set null,
    channel text not null default 'WHATSAPP',
    direction text not null check (direction in ('INBOUND','OUTBOUND')),
    phone_number text,
    chat_id text,
    body text not null check (char_length(body) between 1 and 4096),
    status text not null default 'RECEIVED' check (status in ('QUEUED','SENDING','SENT','DELIVERED','READ','RECEIVED','FAILED','REJECTED')),
    openwa_session_id text,
    openwa_message_id text,
    idempotency_key text,
    delivery_id text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists communication_messages_idempotency_idx
    on public.communication_messages(idempotency_key)
    where idempotency_key is not null;

create index if not exists communication_messages_customer_idx
    on public.communication_messages(customer_user_id, created_at desc);

create index if not exists communication_messages_matter_idx
    on public.communication_messages(matter_id, created_at desc);

create table if not exists public.communication_outbox (
    id uuid primary key default gen_random_uuid(),
    message_id uuid not null unique references public.communication_messages(id) on delete cascade,
    session_id text,
    chat_id text not null,
    attempts integer not null default 0,
    status text not null default 'QUEUED' check (status in ('QUEUED','PROCESSING','SENT','FAILED')),
    available_at timestamptz not null default now(),
    locked_at timestamptz,
    last_error text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists communication_outbox_ready_idx
    on public.communication_outbox(status, available_at, created_at);

alter table public.communication_messages enable row level security;
alter table public.communication_outbox enable row level security;

create policy communication_messages_customer_select
on public.communication_messages for select
using (customer_user_id = auth.uid());

create policy communication_messages_staff_select
on public.communication_messages for select
using (public.is_super_admin() or exists (
    select 1 from public.staff s
    where s.user_id = auth.uid() and s.is_active = true
));

create policy communication_outbox_no_client_access
on public.communication_outbox for select
using (public.is_super_admin());

create or replace function public.queue_openwa_message(
    p_chat_id text,
    p_body text,
    p_matter_id uuid default null,
    p_phone_number text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
    v_message_id uuid;
    v_customer_id uuid := auth.uid();
begin
    if v_customer_id is null then
        raise exception 'Authentication required';
    end if;

    if nullif(trim(p_chat_id), '') is null then
        raise exception 'WhatsApp chat ID is required';
    end if;

    if p_body is null or char_length(trim(p_body)) = 0 or char_length(p_body) > 4096 then
        raise exception 'Message body must contain 1 to 4096 characters';
    end if;

    if p_matter_id is not null and not exists (
        select 1 from public.matters m
        where m.id = p_matter_id
          and m.individual_user_id = v_customer_id
    ) and not public.is_super_admin() then
        raise exception 'Matter access denied';
    end if;

    insert into public.communication_messages (
        customer_user_id, matter_id, channel, direction, phone_number, chat_id, body, status
    ) values (
        v_customer_id, p_matter_id, 'WHATSAPP', 'OUTBOUND', p_phone_number,
        trim(p_chat_id), p_body, 'QUEUED'
    ) returning id into v_message_id;

    insert into public.communication_outbox (message_id, chat_id, status)
    values (v_message_id, trim(p_chat_id), 'QUEUED');

    return v_message_id;
end;
$$;

grant execute on function public.queue_openwa_message(text,text,uuid,text) to authenticated;

create or replace function public.touch_communication_message_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists communication_messages_updated_at on public.communication_messages;
create trigger communication_messages_updated_at
before update on public.communication_messages
for each row execute function public.touch_communication_message_updated_at();

drop trigger if exists communication_outbox_updated_at on public.communication_outbox;
create trigger communication_outbox_updated_at
before update on public.communication_outbox
for each row execute function public.touch_communication_message_updated_at();
