-- Invoice line items inherit the visibility boundary of their invoice.
drop policy if exists invoice_items_select_authorised on public.invoice_items;
create policy invoice_items_select_authorised on public.invoice_items
for select to authenticated
using (
    exists (
        select 1
        from public.invoices i
        where i.id = invoice_items.invoice_id
          and (
              public.is_super_admin()
              or i.created_by = auth.uid()
              or i.individual_user_id = auth.uid()
              or i.business_id in (select b.id from public.businesses b where b.owner_user_id = auth.uid())
              or (
                  public.current_user_role() = 'STAFF'::app_role
                  and public.has_staff_permission('view_financials')
                  and (i.matter_id is null or public.staff_can_access_matter(i.matter_id, 'view_financials'))
              )
          )
    )
);

drop policy if exists invoice_items_write_authorised on public.invoice_items;
create policy invoice_items_write_authorised on public.invoice_items
for all to authenticated
using (
    exists (
        select 1 from public.invoices i
        where i.id = invoice_items.invoice_id
          and (
              public.is_super_admin()
              or i.created_by = auth.uid()
              or public.has_staff_permission('manage_invoices')
          )
    )
)
with check (
    exists (
        select 1 from public.invoices i
        where i.id = invoice_items.invoice_id
          and (
              public.is_super_admin()
              or i.created_by = auth.uid()
              or public.has_staff_permission('manage_invoices')
          )
    )
);
