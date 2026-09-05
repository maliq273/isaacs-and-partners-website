-- Client Portal Access Control
--
-- New client registrations remain in PENDING state until Super Admin approval.
-- This is an operational gate for client interaction, not an authentication gate.
-- RLS remains authoritative: clients can read only their own access record;
-- Super Admin can approve, suspend and review all records.

create table if not exists public.client_portal_access (
    user_id uuid primary key references public.profiles(id) on delete cascade,
    status text not null default 'PENDING',
    approved_by uuid references public.profiles(id) on delete set null,
    approved_at timestamptz,
    suspended_by uuid references public.profiles(id) on delete set null,
    suspended_at timestamptz,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint client_portal_access_status_check
        check (status in ('PENDING', 'APPROVED', 'SUSPENDED'))
);

create index if not exists idx_client_portal_access_status
    on public.client_portal_access(status);

create index if not exists idx_client_portal_access_approved_by
    on public.client_portal_access(approved_by);

alter table public.client_portal_access enable row level security;

revoke all on public.client_portal_access from anon;
revoke all on public.client_portal_access from authenticated;

grant select on public.client_portal_access to authenticated;
grant select, insert, update on public.client_portal_access to authenticated;

drop policy if exists client_portal_access_client_select on public.client_portal_access;
create policy client_portal_access_client_select
on public.client_portal_access
for select
to authenticated
using (
    user_id = auth.uid()
    or public.is_super_admin()
);

drop policy if exists client_portal_access_super_admin_insert on public.client_portal_access;
create policy client_portal_access_super_admin_insert
on public.client_portal_access
for insert
to authenticated
with check (
    public.is_super_admin()
);

drop policy if exists client_portal_access_super_admin_update on public.client_portal_access;
create policy client_portal_access_super_admin_update
on public.client_portal_access
for update
to authenticated
using (
    public.is_super_admin()
)
with check (
    public.is_super_admin()
);

create or replace function public.client_portal_access_status()
returns text
language sql
stable
security definer
set search_path = public
as $$
    select coalesce(
        (
            select c.status
            from public.client_portal_access c
            where c.user_id = auth.uid()
        ),
        'PENDING'
    );
$$;

revoke all on function public.client_portal_access_status() from public;
grant execute on function public.client_portal_access_status() to authenticated;

create or replace function public.client_portal_approve(p_user_id uuid, p_notes text default null)
returns public.client_portal_access
language plpgsql
security definer
set search_path = public
as $$
declare
    v_row public.client_portal_access;
    v_user uuid := auth.uid();
begin
    if not public.is_super_admin() then
        raise exception 'Only Super Admin may approve client portal access.' using errcode = '42501';
    end if;

    if p_user_id is null then
        raise exception 'Client user id is required.' using errcode = '22023';
    end if;

    insert into public.client_portal_access (
        user_id,
        status,
        approved_by,
        approved_at,
        suspended_by,
        suspended_at,
        notes,
        updated_at
    ) values (
        p_user_id,
        'APPROVED',
        v_user,
        now(),
        null,
        null,
        p_notes,
        now()
    )
    on conflict (user_id) do update
    set status = 'APPROVED',
        approved_by = excluded.approved_by,
        approved_at = excluded.approved_at,
        suspended_by = null,
        suspended_at = null,
        notes = excluded.notes,
        updated_at = now()
    returning * into v_row;

    return v_row;
end;
$$;

create or replace function public.client_portal_suspend(p_user_id uuid, p_notes text default null)
returns public.client_portal_access
language plpgsql
security definer
set search_path = public
as $$
declare
    v_row public.client_portal_access;
    v_user uuid := auth.uid();
begin
    if not public.is_super_admin() then
        raise exception 'Only Super Admin may suspend client portal access.' using errcode = '42501';
    end if;

    if p_user_id is null then
        raise exception 'Client user id is required.' using errcode = '22023';
    end if;

    insert into public.client_portal_access (
        user_id,
        status,
        suspended_by,
        suspended_at,
        notes,
        updated_at
    ) values (
        p_user_id,
        'SUSPENDED',
        v_user,
        now(),
        p_notes,
        now()
    )
    on conflict (user_id) do update
    set status = 'SUSPENDED',
        suspended_by = excluded.suspended_by,
        suspended_at = excluded.suspended_at,
        notes = excluded.notes,
        updated_at = now()
    returning * into v_row;

    return v_row;
end;
$$;

revoke all on function public.client_portal_approve(uuid, text) from public;
revoke all on function public.client_portal_suspend(uuid, text) from public;
grant execute on function public.client_portal_approve(uuid, text) to authenticated;
grant execute on function public.client_portal_suspend(uuid, text) to authenticated;
