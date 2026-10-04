alter table public.hr_payroll_profiles
 add column if not exists payroll_monthly_fee numeric(12,2) not null default 0,
 add column if not exists sars_monthly_fee numeric(12,2) not null default 0,
 add column if not exists billing_day integer not null default 1 check(billing_day between 1 and 28),
 add column if not exists subscription_currency text not null default 'ZAR';

create or replace function public.ensure_payroll_service_entitlements(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare p public.hr_payroll_profiles;
begin
 select * into p from public.hr_payroll_profiles where business_id=p_business_id and active=true;
 if not found then return; end if;

 insert into public.client_service_entitlements
 (business_id,service_code,service_name,billing_model,monthly_amount,currency,grace_days,current_period_start,current_period_end,next_billing_date,metadata)
 values
 (p_business_id,'HR-PAYROLL','Isaacs & Partners Payroll Service','MONTHLY',coalesce(p.payroll_monthly_fee,0),p.subscription_currency,0,date_trunc('month',current_date)::date,(date_trunc('month',current_date)+interval '1 month-1 day')::date,make_date(extract(year from current_date)::int,extract(month from current_date)::int,least(p.billing_day,28)),jsonb_build_object('source','hr_payroll_profiles'))
 on conflict(business_id,service_code) do update set monthly_amount=excluded.monthly_amount,currency=excluded.currency,updated_at=now();

 insert into public.client_service_entitlements
 (business_id,service_code,service_name,billing_model,monthly_amount,currency,grace_days,current_period_start,current_period_end,next_billing_date,metadata)
 values
 (p_business_id,'HR-SARS','Isaacs & Partners SARS/e@syFile Preparation Service','MONTHLY',coalesce(p.sars_monthly_fee,0),p.subscription_currency,0,date_trunc('month',current_date)::date,(date_trunc('month',current_date)+interval '1 month-1 day')::date,make_date(extract(year from current_date)::int,extract(month from current_date)::int,least(p.billing_day,28)),jsonb_build_object('source','hr_payroll_profiles','sars_version',p.sars_rules_version))
 on conflict(business_id,service_code) do update set monthly_amount=excluded.monthly_amount,currency=excluded.currency,updated_at=now();

 if coalesce(p.payroll_monthly_fee,0)>0 then
   perform public.refresh_client_service_entitlement(id) from public.client_service_entitlements where business_id=p_business_id and service_code='HR-PAYROLL';
 end if;
 if coalesce(p.sars_monthly_fee,0)>0 then
   perform public.refresh_client_service_entitlement(id) from public.client_service_entitlements where business_id=p_business_id and service_code='HR-SARS';
 end if;
end $$;

create or replace function public.assert_client_service_access(p_business_id uuid,p_service_code text)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
 perform public.refresh_client_service_entitlement(id)
 from public.client_service_entitlements
 where business_id=p_business_id and service_code=p_service_code;

 if not public.service_access_allowed(p_business_id,p_service_code) then
   raise exception 'SERVICE_LOCKED: Isaacs & Partners % is unavailable because the service entitlement has no current paid invoice.',p_service_code using errcode='P0001';
 end if;
end $$;

comment on column public.hr_payroll_profiles.payroll_monthly_fee is 'Monthly Isaacs & Partners payroll platform/service fee, separate from per-employee payslip charges.';
comment on column public.hr_payroll_profiles.sars_monthly_fee is 'Monthly Isaacs & Partners SARS/e@syFile preparation, validation and export service fee. This is not a SARS government fee.';
