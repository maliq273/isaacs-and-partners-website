create or replace function public.payroll_release_if_paid_actor(
  p_payroll_run_id uuid,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
 r public.hr_payroll_runs%rowtype;
 b public.businesses%rowtype;
 actor_role text;
 paid boolean;
 s public.hr_sars_billing_periods%rowtype;
begin
 select role::text into actor_role from public.profiles where id=p_actor_user_id and is_active=true;
 if actor_role is null then raise exception 'Active actor account is required.'; end if;

 select * into r from public.hr_payroll_runs where id=p_payroll_run_id for update;
 if not found then raise exception 'Payroll run not found.'; end if;
 select * into b from public.businesses where id=r.business_id and is_active=true;
 if not found then raise exception 'Business not found.'; end if;
 if actor_role='BUSINESS' and b.owner_user_id<>p_actor_user_id then raise exception 'Business is outside your access scope.'; end if;
 if actor_role not in ('BUSINESS','STAFF','SUPER_ADMIN') then raise exception 'Payroll release access denied.'; end if;

 paid := exists(
   select 1 from public.payments p
   where p.invoice_id=r.payroll_invoice_id
     and p.provider='PAYSTACK'
     and p.status='COMPLETED'
     and p.amount >= (select total from public.invoices where id=r.payroll_invoice_id)
 );

 if not paid and not b.is_internal_company then
   raise exception 'Payroll payment has not been verified by Paystack. Payslips remain locked.';
 end if;

 if paid or b.is_internal_company then
   update public.invoices set status='PAID',amount_paid=total,balance_due=0,paid_at=coalesce(paid_at,now()),updated_at=now()
   where id=r.payroll_invoice_id and b.is_internal_company=false;

   update public.hr_payroll_runs
     set billing_status=case when b.is_internal_company then 'NOT_REQUIRED' else 'PAID' end,
         workflow_stage='RELEASED',released_at=now(),updated_at=now()
   where id=r.id;

   update public.hr_payroll_entries set release_status='RELEASED',released_at=now()
   where payroll_run_id=r.id;

   if not b.is_internal_company then
     update public.hr_payslip_charge_events c
       set status='INVOICED',payment_id=p.id
     from public.payments p
     where c.payroll_run_id=r.id and c.invoice_id=p.invoice_id and p.status='COMPLETED';
   end if;
 end if;

 select * into s from public.hr_sars_billing_periods where business_id=r.business_id and invoice_id=r.sars_retainer_invoice_id limit 1;
 if s.id is not null and exists(
   select 1 from public.payments p
   where p.invoice_id=s.invoice_id and p.provider='PAYSTACK' and p.status='COMPLETED'
     and p.amount >= (select total from public.invoices where id=s.invoice_id)
 ) then
   update public.hr_sars_billing_periods
     set status='PAID',access_state='ENABLED',
         paid_at=coalesce(paid_at,now()),
         payment_id=(select p.id from public.payments p where p.invoice_id=s.invoice_id and p.provider='PAYSTACK' and p.status='COMPLETED' order by p.paid_at desc nulls last limit 1),
         updated_at=now()
   where id=s.id;
 end if;

 return jsonb_build_object(
   'ok',true,'payroll_run_id',r.id,
   'workflow_stage',(select workflow_stage from public.hr_payroll_runs where id=r.id),
   'payroll_paid',paid or b.is_internal_company,
   'sars_access',(select access_state from public.hr_sars_billing_periods where id=s.id)
 );
end;
$$;

revoke all on function public.payroll_release_if_paid(uuid) from public,anon,authenticated;
revoke all on function public.payroll_release_if_paid_actor(uuid,uuid) from public,anon,authenticated;
grant execute on function public.payroll_release_if_paid_actor(uuid,uuid) to authenticated;
notify pgrst,'reload schema';
