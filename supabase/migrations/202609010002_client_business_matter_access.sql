-- Isaacs & Partners
-- PR35: Client / Business / Matter access foundation.
--
-- Existing client, business and matter tables remain authoritative.
-- This migration adds narrowly-scoped access helpers and RPCs so frontend
-- controllers do not need to duplicate authorization rules.

create or replace function public.client_can_access_matter(p_matter_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
    select exists (
        select 1
        from public.matters m
        where m.id = p_matter_id
          and (
              m.individual_user_id = auth.uid()
              or exists (
                  select 1
                  from public.businesses b
                  where b.id = m.business_id
                    and b.owner_user_id = auth.uid()
              )
          )
    );
$$;

revoke all on function public.client_can_access_matter(uuid) from public;
grant execute on function public.client_can_access_matter(uuid) to authenticated;

create or replace function public.get_my_matters()
returns setof public.matters
language sql
security invoker
stable
set search_path = public
as $$
    select m.*
    from public.matters m
    where m.individual_user_id = auth.uid()
       or exists (
            select 1
            from public.businesses b
            where b.id = m.business_id
              and b.owner_user_id = auth.uid()
       )
       or public.is_super_admin()
       or (
            public.current_user_role() = 'STAFF'::app_role
            and public.staff_can_access_matter(m.id, 'view_matters')
       )
    order by m.created_at desc;
$$;

revoke all on function public.get_my_matters() from public;
grant execute on function public.get_my_matters() to authenticated;

create or replace function public.get_matter_access_context(p_matter_id uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
    v_result jsonb;
    v_allowed boolean := false;
begin
    if auth.uid() is null then
        raise exception 'Authentication required' using errcode = '42501';
    end if;

    v_allowed := public.is_super_admin()
        or public.client_can_access_matter(p_matter_id)
        or (
            public.current_user_role() = 'STAFF'::app_role
            and public.staff_can_access_matter(p_matter_id, 'view_matters')
        );

    if not v_allowed then
        raise exception 'Matter access denied' using errcode = '42501';
    end if;

    select jsonb_build_object(
        'matter', to_jsonb(m),
        'client_profile', case when m.individual_user_id is not null then
            (select to_jsonb(p) from public.profiles p where p.id = m.individual_user_id)
            else null end,
        'business', case when m.business_id is not null then
            (select to_jsonb(b) from public.businesses b where b.id = m.business_id)
            else null end
    )
    into v_result
    from public.matters m
    where m.id = p_matter_id;

    if v_result is null then
        raise exception 'Matter not found' using errcode = 'P0002';
    end if;

    return v_result;
end;
$$;

revoke all on function public.get_matter_access_context(uuid) from public;
grant execute on function public.get_matter_access_context(uuid) to authenticated;

comment on function public.client_can_access_matter(uuid) is
'Authoritative client-side authorization helper: true only when the current authenticated user owns the individual or business side of the matter.';

comment on function public.get_my_matters() is
'Returns matters visible to the authenticated caller under existing RLS and staff/super-admin access rules.';

comment on function public.get_matter_access_context(uuid) is
'Returns a permission-checked matter context for authorised users without exposing unrelated client records.';
