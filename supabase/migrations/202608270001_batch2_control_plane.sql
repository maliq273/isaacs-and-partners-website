-- Isaacs & Partners
-- Batch 2: assignments, staff-to-matter/case assignment, cases and quotes.
-- Supabase remains the authoritative source of truth and RLS remains the
-- final authorization boundary.

-- Assignment visibility and mutation.
drop policy if exists assignments_select_authorised on public.assignments;
create policy assignments_select_authorised
on public.assignments
for select to authenticated
using (
    public.is_super_admin()
    or assigned_by = auth.uid()
    or staff_id in (select s.id from public.staff s where s.user_id = auth.uid())
);

drop policy if exists assignments_admin_insert on public.assignments;
create policy assignments_admin_insert
on public.assignments
for insert to authenticated
with check (
    public.is_super_admin()
    or (
        public.current_user_role() = 'STAFF'::app_role
        and public.has_staff_permission('manage_assignments')
        and assigned_by = auth.uid()
    )
);

drop policy if exists assignments_admin_update on public.assignments;
create policy assignments_admin_update
on public.assignments
for update to authenticated
using (
    public.is_super_admin()
    or (
        public.current_user_role() = 'STAFF'::app_role
        and public.has_staff_permission('manage_assignments')
        and assigned_by = auth.uid()
    )
)
with check (
    public.is_super_admin()
    or (
        public.current_user_role() = 'STAFF'::app_role
        and public.has_staff_permission('manage_assignments')
        and assigned_by = auth.uid()
    )
);

-- Matter assignment requires the dedicated assignment permission. Super Admin
-- remains unrestricted.
drop policy if exists matters_assignment_staff_update on public.matters;
create policy matters_assignment_staff_update
on public.matters
for update to authenticated
using (
    public.is_super_admin()
    or (
        public.current_user_role() = 'STAFF'::app_role
        and public.has_staff_permission('assign_matters')
        and public.staff_can_access_matter(id, 'assign_matters')
    )
)
with check (
    public.is_super_admin()
    or (
        public.current_user_role() = 'STAFF'::app_role
        and public.has_staff_permission('assign_matters')
    )
);

-- Case visibility/edit/create is permission-aware while preserving the
-- existing owner and Super Admin paths.
drop policy if exists cases_staff_permission_select on public.cases;
create policy cases_staff_permission_select
on public.cases
for select to authenticated
using (
    public.is_super_admin()
    or (
        public.current_user_role() = 'STAFF'::app_role
        and public.has_staff_permission('view_cases')
        and public.staff_can_access_case(id, 'view_cases')
    )
    or exists (
        select 1 from public.matters m
        where m.id = cases.matter_id
          and (
              m.individual_user_id = auth.uid()
              or m.business_id in (select b.id from public.businesses b where b.owner_user_id = auth.uid())
          )
    )
);

drop policy if exists cases_staff_permission_insert on public.cases;
create policy cases_staff_permission_insert
on public.cases
for insert to authenticated
with check (
    public.is_super_admin()
    or (
        public.current_user_role() = 'STAFF'::app_role
        and public.has_staff_permission('create_cases')
        and created_by = auth.uid()
    )
    or (
        public.current_user_role() <> 'STAFF'::app_role
        and created_by = auth.uid()
    )
);

drop policy if exists cases_staff_permission_update on public.cases;
create policy cases_staff_permission_update
on public.cases
for update to authenticated
using (
    public.is_super_admin()
    or (
        public.current_user_role() = 'STAFF'::app_role
        and public.has_staff_permission('edit_cases')
        and public.staff_can_access_case(id, 'edit_cases')
    )
    or (
        public.current_user_role() <> 'STAFF'::app_role
        and created_by = auth.uid()
    )
)
with check (
    public.is_super_admin()
    or (
        public.current_user_role() = 'STAFF'::app_role
        and public.has_staff_permission('edit_cases')
        and public.staff_can_access_case(id, 'edit_cases')
    )
    or (
        public.current_user_role() <> 'STAFF'::app_role
        and created_by = auth.uid()
    )
);

-- Quotes/pre-quotes.
drop policy if exists quotes_batch2_staff_select on public.quotes;
create policy quotes_batch2_staff_select
on public.quotes
for select to authenticated
using (
    public.is_super_admin()
    or (
        public.current_user_role() = 'STAFF'::app_role
        and public.has_staff_permission('view_quotes')
        and public.staff_can_access_quote(id, 'view_quotes')
    )
    or individual_user_id = auth.uid()
    or business_id in (select b.id from public.businesses b where b.owner_user_id = auth.uid())
);

drop policy if exists quotes_batch2_staff_insert on public.quotes;
create policy quotes_batch2_staff_insert
on public.quotes
for insert to authenticated
with check (
    public.is_super_admin()
    or (
        public.current_user_role() = 'STAFF'::app_role
        and public.has_staff_permission('create_quotes')
        and created_by = auth.uid()
    )
    or (
        public.current_user_role() <> 'STAFF'::app_role
        and created_by = auth.uid()
    )
);

drop policy if exists quotes_batch2_staff_update on public.quotes;
create policy quotes_batch2_staff_update
on public.quotes
for update to authenticated
using (
    public.is_super_admin()
    or (
        public.current_user_role() = 'STAFF'::app_role
        and public.has_staff_permission('edit_quotes')
        and public.staff_can_access_quote(id, 'edit_quotes')
    )
    or (
        public.current_user_role() <> 'STAFF'::app_role
        and created_by = auth.uid()
    )
)
with check (
    public.is_super_admin()
    or (
        public.current_user_role() = 'STAFF'::app_role
        and public.has_staff_permission('edit_quotes')
        and public.staff_can_access_quote(id, 'edit_quotes')
    )
    or (
        public.current_user_role() <> 'STAFF'::app_role
        and created_by = auth.uid()
    )
);

-- Assignment target helper. This keeps staff assignment scoped to the live
-- staff table and blocks inactive staff from receiving new work.
create or replace function public.staff_is_assignable(p_staff_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1
        from public.staff s
        join public.profiles p on p.id = s.user_id
        where s.id = p_staff_id
          and s.is_active = true
          and p.is_active = true
          and p.role = 'STAFF'::app_role
    );
$$;

revoke all on function public.staff_is_assignable(uuid) from public;
grant execute on function public.staff_is_assignable(uuid) to authenticated;

comment on function public.staff_is_assignable(uuid) is
'Returns true only for active STAFF profiles with active staff records.';
