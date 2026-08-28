-- Isaacs & Partners
-- Staff permission enforcement foundation.
--
-- This migration is intentionally self-contained. Some remote databases may
-- contain legacy overloaded has_staff_permission functions whose default
-- arguments make one-argument calls ambiguous. Rename every legacy overload
-- before creating the canonical one-argument API so existing dependencies are
-- preserved instead of destructively dropping functions.

do $$
declare
    fn record;
    legacy_name text;
begin
    for fn in
        select p.oid,
               pg_get_function_identity_arguments(p.oid) as identity_args
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'has_staff_permission'
          and pg_get_function_identity_arguments(p.oid) <> 'text'
    loop
        legacy_name := 'has_staff_permission_legacy_' || substr(md5(fn.identity_args), 1, 10);
        execute format(
            'alter function public.has_staff_permission(%s) rename to %I',
            fn.identity_args,
            legacy_name
        );
    end loop;
end
$$;

create or replace function public.staff_permission_scope(p_permission_key text)
returns text language sql security definer set search_path = public stable
as $$
    select coalesce((select sp.access_scope from public.staff_permissions sp join public.staff s on s.id=sp.staff_id where s.user_id=auth.uid() and s.is_active=true and sp.permission_key=p_permission_key and sp.is_enabled=true order by case sp.access_scope when 'ALL' then 4 when 'DEPARTMENT' then 3 when 'ASSIGNED' then 2 when 'OWN' then 1 else 0 end desc limit 1),'NONE');
$$;

create or replace function public.has_staff_permission(p_permission_key text)
returns boolean language sql security definer set search_path = public stable
as $$ select public.is_super_admin() or public.staff_permission_scope(p_permission_key) <> 'NONE'; $$;

create or replace function public.staff_can_access_matter(p_matter_id uuid, p_permission_key text)
returns boolean language sql security definer set search_path = public stable
as $$
    with access as (select public.staff_permission_scope(p_permission_key) as scope)
    select public.is_super_admin()
    or exists (select 1 from access where scope='ALL')
    or exists (select 1 from access where scope='OWN' and exists (select 1 from public.matters m where m.id=p_matter_id and (m.created_by=auth.uid() or m.individual_user_id=auth.uid() or exists (select 1 from public.businesses b where b.id=m.business_id and b.owner_user_id=auth.uid()))))
    or exists (select 1 from access where scope='ASSIGNED' and exists (select 1 from public.assignments a join public.staff s on s.id=a.staff_id where a.matter_id=p_matter_id and s.user_id=auth.uid() and s.is_active=true and a.status='ACTIVE'::assignment_status))
    or exists (select 1 from access where scope='DEPARTMENT' and exists (select 1 from public.assignments a join public.staff assigned_staff on assigned_staff.id=a.staff_id join public.staff current_staff on current_staff.user_id=auth.uid() where a.matter_id=p_matter_id and a.status='ACTIVE'::assignment_status and assigned_staff.department=current_staff.department and current_staff.is_active=true));
$$;

create or replace function public.staff_can_access_case(p_case_id uuid, p_permission_key text)
returns boolean language sql security definer set search_path = public stable
as $$ select public.is_super_admin() or public.staff_permission_scope(p_permission_key)='ALL' or exists (select 1 from public.cases c where c.id=p_case_id and public.staff_can_access_matter(c.matter_id,p_permission_key)); $$;

create or replace function public.staff_can_access_quote(p_quote_id uuid, p_permission_key text)
returns boolean language sql security definer set search_path = public stable
as $$ select public.is_super_admin() or public.staff_permission_scope(p_permission_key)='ALL' or exists (select 1 from public.quotes q where q.id=p_quote_id and ((public.staff_permission_scope(p_permission_key)='OWN' and (q.created_by=auth.uid() or q.individual_user_id=auth.uid())) or (public.staff_permission_scope(p_permission_key)='ASSIGNED' and exists (select 1 from public.assignments a join public.staff s on s.id=a.staff_id where a.quote_id=q.id and s.user_id=auth.uid() and s.is_active=true and a.status='ACTIVE'::assignment_status)) or (public.staff_permission_scope(p_permission_key)='DEPARTMENT' and q.matter_id is not null and public.staff_can_access_matter(q.matter_id,p_permission_key)))); $$;

create or replace function public.staff_can_access_assignment(p_assignment_id uuid, p_permission_key text)
returns boolean language sql security definer set search_path = public stable
as $$ select public.is_super_admin() or public.staff_permission_scope(p_permission_key)='ALL' or exists (select 1 from public.assignments a join public.staff s on s.id=a.staff_id where a.id=p_assignment_id and s.user_id=auth.uid() and s.is_active=true); $$;

-- Replace staff-sensitive policies while preserving direct client/business ownership.
drop policy if exists matters_select_owner_staff_admin on public.matters;
create policy matters_select_owner_staff_admin on public.matters for select to authenticated using (public.is_super_admin() or individual_user_id=auth.uid() or business_id in (select b.id from public.businesses b where b.owner_user_id=auth.uid()) or (public.current_user_role()='STAFF'::app_role and public.has_staff_permission('view_matters'::text) and public.staff_can_access_matter(id,'view_matters'::text)));

drop policy if exists matters_admin_update on public.matters;
create policy matters_admin_update on public.matters for update to authenticated using (public.is_super_admin() or (public.current_user_role()<>'STAFF'::app_role and created_by=auth.uid()) or (public.current_user_role()='STAFF'::app_role and public.has_staff_permission('edit_matters'::text) and public.staff_can_access_matter(id,'edit_matters'::text))) with check (public.is_super_admin() or (public.current_user_role()<>'STAFF'::app_role and created_by=auth.uid()) or (public.current_user_role()='STAFF'::app_role and public.has_staff_permission('edit_matters'::text) and public.staff_can_access_matter(id,'edit_matters'::text)));

drop policy if exists cases_select_authorised on public.cases;
create policy cases_select_authorised on public.cases for select to authenticated using (public.is_super_admin() or exists (select 1 from public.matters m where m.id=cases.matter_id and (m.individual_user_id=auth.uid() or m.business_id in (select b.id from public.businesses b where b.owner_user_id=auth.uid()))) or (public.current_user_role()='STAFF'::app_role and public.has_staff_permission('view_cases'::text) and public.staff_can_access_case(id,'view_cases'::text)));

drop policy if exists cases_admin_update on public.cases;
create policy cases_admin_update on public.cases for update to authenticated using (public.is_super_admin() or (public.current_user_role()<>'STAFF'::app_role and created_by=auth.uid()) or (public.current_user_role()='STAFF'::app_role and public.has_staff_permission('edit_cases'::text) and public.staff_can_access_case(id,'edit_cases'::text))) with check (public.is_super_admin() or (public.current_user_role()<>'STAFF'::app_role and created_by=auth.uid()) or (public.current_user_role()='STAFF'::app_role and public.has_staff_permission('edit_cases'::text) and public.staff_can_access_case(id,'edit_cases'::text)));

drop policy if exists quotes_select_authorised on public.quotes;
create policy quotes_select_authorised on public.quotes for select to authenticated using (public.is_super_admin() or individual_user_id=auth.uid() or business_id in (select b.id from public.businesses b where b.owner_user_id=auth.uid()) or (public.current_user_role()='STAFF'::app_role and public.has_staff_permission('view_quotes'::text) and public.staff_can_access_quote(id,'view_quotes'::text)));

drop policy if exists quotes_admin_update on public.quotes;
create policy quotes_admin_update on public.quotes for update to authenticated using (public.is_super_admin() or (public.current_user_role()<>'STAFF'::app_role and created_by=auth.uid()) or (public.current_user_role()='STAFF'::app_role and public.has_staff_permission('edit_quotes'::text) and public.staff_can_access_quote(id,'edit_quotes'::text))) with check (public.is_super_admin() or (public.current_user_role()<>'STAFF'::app_role and created_by=auth.uid()) or (public.current_user_role()='STAFF'::app_role and public.has_staff_permission('edit_quotes'::text) and public.staff_can_access_quote(id,'edit_quotes'::text)));

drop policy if exists assignments_select_authorised on public.assignments;
create policy assignments_select_authorised on public.assignments for select to authenticated using (public.is_super_admin() or assigned_by=auth.uid() or (public.current_user_role()='STAFF'::app_role and public.has_staff_permission('manage_assignments'::text) and public.staff_can_access_assignment(id,'manage_assignments'::text)) or staff_id in (select s.id from public.staff s where s.user_id=auth.uid() and s.is_active=true));

drop policy if exists assignments_admin_insert on public.assignments;
create policy assignments_admin_insert on public.assignments for insert to authenticated with check (public.is_super_admin() or (public.current_user_role()='STAFF'::app_role and public.has_staff_permission('manage_assignments'::text) and assigned_by=auth.uid()));

drop policy if exists assignments_admin_update on public.assignments;
create policy assignments_admin_update on public.assignments for update to authenticated using (public.is_super_admin() or (public.current_user_role()='STAFF'::app_role and public.has_staff_permission('manage_assignments'::text) and public.staff_can_access_assignment(id,'manage_assignments'::text))) with check (public.is_super_admin() or (public.current_user_role()='STAFF'::app_role and public.has_staff_permission('manage_assignments'::text)));

comment on function public.staff_permission_scope(text) is 'Returns the strongest enabled permission scope for the authenticated staff member.';
comment on function public.has_staff_permission(text) is 'Returns true only for SUPER_ADMIN or an active staff account with the requested enabled permission.';
