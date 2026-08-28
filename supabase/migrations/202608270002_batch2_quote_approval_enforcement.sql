-- Quote approval is a distinct privilege from ordinary quote editing.
drop policy if exists quotes_batch2_staff_update on public.quotes;
create policy quotes_batch2_staff_update
on public.quotes
for update to authenticated
using (
    public.is_super_admin()
    or (
        public.current_user_role() = 'STAFF'::app_role
        and (
            (public.has_staff_permission('edit_quotes') and public.staff_can_access_quote(id, 'edit_quotes'))
            or public.has_staff_permission('approve_quotes')
        )
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
        and (
            (
                status = 'APPROVED'
                and public.has_staff_permission('approve_quotes')
            )
            or (
                status <> 'APPROVED'
                and public.has_staff_permission('edit_quotes')
                and public.staff_can_access_quote(id, 'edit_quotes')
            )
        )
    )
    or (
        public.current_user_role() <> 'STAFF'::app_role
        and created_by = auth.uid()
    )
);
