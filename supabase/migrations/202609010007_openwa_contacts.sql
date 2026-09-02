-- PR43 — controlled WhatsApp contact mapping
create table if not exists public.communication_contacts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    phone_number text not null,
    chat_id text not null,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (chat_id)
);

create index if not exists communication_contacts_user_idx
    on public.communication_contacts(user_id);

alter table public.communication_contacts enable row level security;

create policy communication_contacts_owner_select
on public.communication_contacts for select to authenticated
using (user_id = auth.uid() or public.is_super_admin());

create policy communication_contacts_owner_insert
on public.communication_contacts for insert to authenticated
with check (user_id = auth.uid() or public.is_super_admin());

create policy communication_contacts_owner_update
on public.communication_contacts for update to authenticated
using (user_id = auth.uid() or public.is_super_admin())
with check (user_id = auth.uid() or public.is_super_admin());

create policy communication_contacts_owner_delete
on public.communication_contacts for delete to authenticated
using (user_id = auth.uid() or public.is_super_admin());
