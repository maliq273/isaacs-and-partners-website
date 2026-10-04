drop policy if exists hr_generated_documents_staff_write on public.hr_generated_documents;
create policy hr_generated_documents_staff_insert on public.hr_generated_documents for insert to authenticated
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN')));
create policy hr_generated_documents_staff_update on public.hr_generated_documents for update to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN')))
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN')));
create policy hr_generated_documents_staff_delete on public.hr_generated_documents for delete to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN')));