do $$ begin
 create policy sars_compliance_access on public.sars_payroll_compliance_runs for all to authenticated using (
  exists(select 1 from public.businesses b where b.id=sars_payroll_compliance_runs.business_id and b.owner_user_id=(select auth.uid()))
  or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN'))
 ) with check (
  exists(select 1 from public.businesses b where b.id=sars_payroll_compliance_runs.business_id and b.owner_user_id=(select auth.uid()))
  or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN'))
 );
exception when duplicate_object then null; end $$;
do $$ begin
 create policy sars_cert_access on public.sars_payroll_certificate_events for all to authenticated using (
  exists(select 1 from public.businesses b where b.id=sars_payroll_certificate_events.business_id and b.owner_user_id=(select auth.uid()))
  or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN'))
 ) with check (
  exists(select 1 from public.businesses b where b.id=sars_payroll_certificate_events.business_id and b.owner_user_id=(select auth.uid()))
  or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN'))
 );
exception when duplicate_object then null; end $$;
do $$ begin
 create policy sars_audit_read on public.sars_payroll_audit for select to authenticated using (
  exists(select 1 from public.businesses b where b.id=sars_payroll_audit.business_id and b.owner_user_id=(select auth.uid()))
  or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN'))
 );
exception when duplicate_object then null; end $$;
do $$ begin
 create policy sars_emp201_access on public.sars_emp201_reconciliation for all to authenticated using (
  exists(select 1 from public.businesses b where b.id=sars_emp201_reconciliation.business_id and b.owner_user_id=(select auth.uid()))
  or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN'))
 ) with check (
  exists(select 1 from public.businesses b where b.id=sars_emp201_reconciliation.business_id and b.owner_user_id=(select auth.uid()))
  or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN'))
 );
exception when duplicate_object then null; end $$;
do $$ begin
 create policy sars_emp501_access on public.sars_emp501_reconciliation for all to authenticated using (
  exists(select 1 from public.businesses b where b.id=sars_emp501_reconciliation.business_id and b.owner_user_id=(select auth.uid()))
  or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN'))
 ) with check (
  exists(select 1 from public.businesses b where b.id=sars_emp501_reconciliation.business_id and b.owner_user_id=(select auth.uid()))
  or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN'))
 );
exception when duplicate_object then null; end $$;
do $$ begin
 create policy sars_emp601_access on public.sars_emp601_cancellations for all to authenticated using (
  exists(select 1 from public.businesses b where b.id=sars_emp601_cancellations.business_id and b.owner_user_id=(select auth.uid()))
  or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN'))
 ) with check (
  exists(select 1 from public.businesses b where b.id=sars_emp601_cancellations.business_id and b.owner_user_id=(select auth.uid()))
  or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN'))
 );
exception when duplicate_object then null; end $$;
alter function public.sars_payroll_audit_immutable() set search_path = public;