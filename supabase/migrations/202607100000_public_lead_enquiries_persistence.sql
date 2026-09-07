-- Isaacs & Partners
-- Secure Server-Side Public Lead Enquiry Persistence
--
-- Enables anonymous website visitors to persist qualified AI Liaison enquiries
-- to Supabase without exposing private client records or requiring full auth.
-- Upon client account creation, the enquiry is automatically linked to the new profile.

begin;

create table if not exists public.public_enquiries (
    id uuid primary key default gen_random_uuid(),
    session_id text not null unique,
    category_id text,
    service_id text,
    service_name text,
    service_domain text,
    answers jsonb not null default '[]'::jsonb,
    qualified boolean not null default false,
    client_user_id uuid references public.profiles(id) on delete set null,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_public_enquiries_session on public.public_enquiries(session_id);
create index if not exists idx_public_enquiries_client on public.public_enquiries(client_user_id);
create index if not exists idx_public_enquiries_qualified on public.public_enquiries(qualified, created_at desc);

alter table public.public_enquiries enable row level security;

-- Grant permissions
grant select, insert, update on public.public_enquiries to anon;
grant select, insert, update on public.public_enquiries to authenticated;

-- RLS: anonymous and authenticated users can only select their own linked enquiries, or staff/super admin can select all
drop policy if exists public_enquiries_select_policy on public.public_enquiries;
create policy public_enquiries_select_policy on public.public_enquiries
for select
to public
using (
    client_user_id = auth.uid()
    or public.is_super_admin()
    or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and upper(p.role::text) in ('SUPER_ADMIN', 'STAFF')
    )
);

-- Secure RPC function to submit or update a public lead enquiry from anonymous website visitors
create or replace function public.submit_public_enquiry(
    p_session_id text,
    p_category_id text default null,
    p_service_id text default null,
    p_service_name text default null,
    p_service_domain text default null,
    p_answers jsonb default '[]'::jsonb,
    p_qualified boolean default false,
    p_metadata jsonb default '{}'::jsonb
)
returns public.public_enquiries
language plpgsql
security definer
set search_path = public
as $$
declare
    v_record public.public_enquiries;
begin
    if p_session_id is null or trim(p_session_id) = '' then
        raise exception 'Session ID is required for public enquiry submission.' using errcode = '22023';
    end if;

    insert into public.public_enquiries (
        session_id,
        category_id,
        service_id,
        service_name,
        service_domain,
        answers,
        qualified,
        metadata,
        updated_at
    )
    values (
        trim(p_session_id),
        p_category_id,
        p_service_id,
        p_service_name,
        p_service_domain,
        coalesce(p_answers, '[]'::jsonb),
        coalesce(p_qualified, false),
        coalesce(p_metadata, '{}'::jsonb),
        now()
    )
    on conflict (session_id) do update set
        category_id = coalesce(excluded.category_id, public_enquiries.category_id),
        service_id = coalesce(excluded.service_id, public_enquiries.service_id),
        service_name = coalesce(excluded.service_name, public_enquiries.service_name),
        service_domain = coalesce(excluded.service_domain, public_enquiries.service_domain),
        answers = excluded.answers,
        qualified = case when excluded.qualified then true else public_enquiries.qualified end,
        metadata = public_enquiries.metadata || excluded.metadata,
        updated_at = now()
    returning * into v_record;

    return v_record;
end;
$$;

revoke all on function public.submit_public_enquiry from public;
grant execute on function public.submit_public_enquiry to anon;
grant execute on function public.submit_public_enquiry to authenticated;

-- Function to link a public lead enquiry to a newly created client user profile
create or replace function public.link_public_enquiry_to_client(
    p_session_id text,
    p_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
    if p_session_id is null or trim(p_session_id) = '' or p_user_id is null then
        return false;
    end if;

    update public.public_enquiries
    set client_user_id = p_user_id,
        updated_at = now()
    where session_id = trim(p_session_id);

    return found;
end;
$$;

revoke all on function public.link_public_enquiry_to_client from public;
grant execute on function public.link_public_enquiry_to_client to authenticated;

commit;
