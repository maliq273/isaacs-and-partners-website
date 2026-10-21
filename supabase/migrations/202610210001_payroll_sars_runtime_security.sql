-- Production hardening: payroll/SARS billing access and privileged RPC grants.
-- Business owners may read their own SARS billing status. Only trusted backend
-- service-role code may change payment/access fields; client writes stay locked.
begin;

alter table public.hr_sars_billing_periods enable row level security;

drop policy if exists hr_sars_billing_periods_read_scoped on public.hr_sars_billing_periods;
create policy hr_sars_billing_periods_read_scoped
  on public.hr_sars_billing_periods
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.businesses b
      where b.id = hr_sars_billing_periods.business_id
        and b.owner_user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.is_active = true
        and p.role::text in ('STAFF', 'SUPER_ADMIN')
    )
  );

-- Payroll reviewer and internal approval data must never be callable by anon.
-- The functions retain their own Super Admin checks as defence in depth.
revoke all on function public.payroll_reviewer_admin_snapshot() from public, anon;
revoke all on function public.payroll_reviewer_set(uuid, uuid, text) from public, anon;
revoke all on function public.super_admin_payroll_approval_snapshot() from public, anon;
grant execute on function public.payroll_reviewer_admin_snapshot() to authenticated, service_role;
grant execute on function public.payroll_reviewer_set(uuid, uuid, text) to authenticated, service_role;
grant execute on function public.super_admin_payroll_approval_snapshot() to authenticated, service_role;

-- Client service administration is authenticated-only; each RPC checks the
-- active Super Admin (or specifically authorised finance actor) in its body.
revoke all on function public.client_service_revoke(uuid, text) from public, anon;
revoke all on function public.client_service_unlock_paid(uuid, text) from public, anon;
revoke all on function public.service_price_set(text, numeric, text) from public, anon;
grant execute on function public.client_service_revoke(uuid, text) to authenticated, service_role;
grant execute on function public.client_service_unlock_paid(uuid, text) to authenticated, service_role;
grant execute on function public.service_price_set(text, numeric, text) to authenticated, service_role;

-- This recurring billing function creates invoices and locks service access.
-- It is scheduled by pg_cron as the database owner; clients must not be able
-- to trigger billing for every account through the public Data API.
revoke all on function public.generate_monthly_client_service_invoices() from public, anon, authenticated;
grant execute on function public.generate_monthly_client_service_invoices() to service_role;

notify pgrst, 'reload schema';
commit;
