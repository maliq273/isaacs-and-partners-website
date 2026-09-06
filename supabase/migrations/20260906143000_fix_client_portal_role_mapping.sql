-- Isaacs & Partners
-- Fix client portal provisioning to use the application's real client roles.
-- The application uses INDIVIDUAL and BUSINESS, not CLIENT.

begin;

create or replace function public.ensure_client_portal_access()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if upper(new.role::text) in ('INDIVIDUAL', 'BUSINESS') then
        insert into public.client_portal_access(user_id, status)
        values (new.id, 'PENDING')
        on conflict (user_id) do nothing;
    end if;

    return new;
end;
$$;

drop trigger if exists profiles_client_portal_access on public.profiles;

create trigger profiles_client_portal_access
after insert or update of role on public.profiles
for each row
execute function public.ensure_client_portal_access();

-- Backfill existing individual and business clients that were missed by the
-- previous role mapping. Existing access rows are preserved.
insert into public.client_portal_access (user_id, status)
select p.id, 'PENDING'
from public.profiles p
where upper(p.role::text) in ('INDIVIDUAL', 'BUSINESS')
on conflict (user_id) do nothing;

-- Keep the Super Admin approval snapshot aligned with the same client-role
-- definition used by portal access provisioning.
create or replace function public.client_portal_admin_snapshot()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
    v_result jsonb;
begin
    if not public.is_super_admin() then
        raise exception 'Only Super Admin may view client portal approvals.' using errcode = '42501';
    end if;

    select jsonb_build_object(
        'pending_count', count(*) filter (where coalesce(c.status, 'PENDING') = 'PENDING'),
        'approved_count', count(*) filter (where c.status = 'APPROVED'),
        'suspended_count', count(*) filter (where c.status = 'SUSPENDED'),
        'clients', coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'user_id', p.id,
                    'email', p.email,
                    'first_name', p.first_name,
                    'last_name', p.last_name,
                    'phone', p.phone,
                    'role', p.role,
                    'is_active', p.is_active,
                    'access', case
                        when c.user_id is null then jsonb_build_object('status', 'PENDING')
                        else to_jsonb(c)
                    end
                )
                order by coalesce(c.updated_at, c.created_at) desc
            ),
            '[]'::jsonb
        )
    ) into v_result
    from public.profiles p
    left join public.client_portal_access c on c.user_id = p.id
    where upper(p.role::text) in ('INDIVIDUAL', 'BUSINESS');

    return v_result;
end;
$$;

revoke all on function public.client_portal_admin_snapshot() from public;
grant execute on function public.client_portal_admin_snapshot() to authenticated;

commit;
