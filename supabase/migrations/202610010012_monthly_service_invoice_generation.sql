create or replace function public.generate_monthly_client_service_invoices()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare e record; inv_id uuid; created_count integer:=0; period_start date:=date_trunc('month',current_date)::date; period_end date:=(date_trunc('month',current_date)+interval '1 month-1 day')::date; due_date date;
begin
 for e in
   select * from public.client_service_entitlements
   where billing_model='MONTHLY'
     and status<>'CANCELLED'
     and monthly_amount>0
     and coalesce(next_billing_date,period_start)<=current_date
 loop
   if e.current_invoice_id is not null then
     if exists(select 1 from public.invoices i where i.id=e.current_invoice_id and i.status in ('DRAFT','SENT','PARTIALLY_PAID','OVERDUE','ISSUED')) then
       continue;
     end if;
   end if;

   due_date:=period_start+greatest(0,e.grace_days);
   insert into public.invoices
   (business_id,description,amount,amount_paid,currency,status,invoice_date,due_date,subject,subtotal,total,balance_due,terms,customer_notes)
   values
   (e.business_id,
    e.service_name||' — monthly service fee — '||to_char(period_start,'YYYY-MM'),
    e.monthly_amount,0,e.currency,'SENT',current_date,due_date,
    e.service_name||' subscription',
    e.monthly_amount,e.monthly_amount,e.monthly_amount,'MONTHLY',
    'Isaacs & Partners service access is dependent on the applicable invoice being paid.')
   returning id into inv_id;

   update public.client_service_entitlements
   set current_invoice_id=inv_id,
       current_period_start=period_start,
       current_period_end=period_end,
       next_billing_date=(period_start+interval '1 month')::date,
       status='PAST_DUE',
       access_state='LOCKED',
       lock_reason='Monthly service invoice awaiting payment.',
       locked_at=coalesce(locked_at,now()),
       updated_at=now()
   where id=e.id;

   insert into public.client_service_billing_events
   (entitlement_id,business_id,invoice_id,event_type,amount,currency,period_start,period_end,metadata)
   values(e.id,e.business_id,inv_id,'INVOICE_ISSUED',e.monthly_amount,e.currency,period_start,period_end,jsonb_build_object('service_code',e.service_code));

   created_count:=created_count+1;
 end loop;
 return created_count;
end $$;

comment on function public.generate_monthly_client_service_invoices() is 'Creates Isaacs & Partners recurring monthly payroll/SARS service invoices and locks access until payment is recorded.';
