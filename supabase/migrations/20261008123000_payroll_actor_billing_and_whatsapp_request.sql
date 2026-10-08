-- Actor-aware payroll billing and SARS access gating
-- 2026-10-08

create or replace function public.payroll_prepare_client_billing_actor(
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
  p public.hr_payroll_profiles%rowtype;
  b public.businesses%rowtype;
  actor_role text;
  entry_count integer;
  payroll_total numeric := 0;
  payroll_invoice uuid;
  sars_invoice uuid;
  period_key text;
  sars_period public.hr_sars_billing_periods%rowtype;
  inv_number text;
begin
  select role::text into actor_role from public.profiles where id=p_actor_user_id and is_active=true;
  if actor_role is null then raise exception 'Active actor account is required.'; end if;

  select * into r from public.hr_payroll_runs where id=p_payroll_run_id for update;
  if not found then raise exception 'Payroll run not found.'; end if;
  select * into b from public.businesses where id=r.business_id and is_active=true;
  if not found then raise exception 'Employer business not found.'; end if;

  if actor_role='BUSINESS' and b.owner_user_id<>p_actor_user_id then
    raise exception 'Business is outside your access scope.';
  end if;
  if actor_role not in ('BUSINESS','STAFF','SUPER_ADMIN') then
    raise exception 'Payroll billing access denied.';
  end if;

  select * into p from public.hr_payroll_profiles where business_id=r.business_id and active=true limit 1;
  if not found then raise exception 'Payroll profile is not configured.'; end if;

  select count(*) into entry_count from public.hr_payroll_entries where payroll_run_id=r.id;
  payroll_total := round(entry_count * coalesce(p.payslip_unit_price,0),2);

  if payroll_total > 0 and r.payroll_invoice_id is null then
    inv_number := 'PAY-' || to_char(current_date,'YYYYMMDD') || '-' || substr(replace(r.id::text,'-',''),1,8);
    insert into public.invoices(
      business_id, invoice_number, description, amount, amount_paid, currency,
      status, invoice_date, due_date, subject, subtotal, total, balance_due,
      terms, customer_notes, created_by
    ) values(
      r.business_id,inv_number,
      'Payroll payslips — '||entry_count||' payslip(s) — '||coalesce(r.period_end::text,''),
      payroll_total,0,coalesce(p.currency,'ZAR'),'SENT',current_date,current_date,
      'Payroll payslip processing',payroll_total,payroll_total,payroll_total,
      'Payslips remain locked until verified Paystack payment.',
      'Payment must be verified by the backend before payslips are released.',p_actor_user_id
    ) returning id into payroll_invoice;

    insert into public.invoice_items(invoice_id,item_order,item_name,description,quantity,rate,tax_rate,amount)
    values(payroll_invoice,1,'Payroll payslips','Per-employee payslip processing',entry_count,p.payslip_unit_price,0,payroll_total);

    insert into public.hr_payslip_charge_events(
      business_id,payroll_profile_id,payroll_run_id,payroll_entry_id,employee_id,
      unit_price,quantity,currency,status,source,invoice_id
    )
    select r.business_id,p.id,e.payroll_run_id,e.id,e.employee_id,p.payslip_unit_price,1,p.currency,'INVOICED','PAYROLL_INVOICE',payroll_invoice
    from public.hr_payroll_entries e
    where e.payroll_run_id=r.id
    on conflict (payroll_entry_id) do update set invoice_id=excluded.invoice_id,status='INVOICED';

    update public.hr_payroll_runs set payroll_invoice_id=payroll_invoice,billing_status='PAYMENT_PENDING',workflow_stage='INVOICE',updated_at=now() where id=r.id;
  end if;

  if coalesce(p.sars_monthly_fee,0)>0 then
    period_key:=to_char(coalesce(r.period_end,current_date),'YYYY-MM');
    insert into public.hr_sars_billing_periods(business_id,period_key,tax_year,fee,currency,status,access_state,requested_at)
    values(r.business_id,period_key,r.tax_year,p.sars_monthly_fee,coalesce(p.subscription_currency,'ZAR'),'PENDING','LOCKED',now())
    on conflict (business_id,period_key) do update set fee=excluded.fee,updated_at=now()
    returning * into sars_period;

    if sars_period.invoice_id is null then
      inv_number:='SARS-'||period_key||'-'||substr(replace(r.business_id::text,'-',''),1,8);
      insert into public.invoices(
        business_id,invoice_number,description,amount,amount_paid,currency,status,
        invoice_date,due_date,subject,subtotal,total,balance_due,terms,customer_notes,created_by
      ) values(
        r.business_id,inv_number,'Monthly SARS payroll compliance retainer — '||period_key,
        sars_period.fee,0,sars_period.currency,'SENT',current_date,current_date,
        'SARS monthly retainer',sars_period.fee,sars_period.fee,sars_period.fee,
        'SARS data is populated and retained, but client access is locked until the monthly retainer is paid.',
        'Payment is verified server-side before SARS access is enabled.',p_actor_user_id
      ) returning id into sars_invoice;
      insert into public.invoice_items(invoice_id,item_order,item_name,description,quantity,rate,tax_rate,amount)
      values(sars_invoice,1,'SARS monthly retainer','Monthly SARS payroll compliance access',1,sars_period.fee,0,sars_period.fee);
      update public.hr_sars_billing_periods set invoice_id=sars_invoice,status='INVOICED',updated_at=now() where id=sars_period.id;
      update public.hr_payroll_runs set sars_retainer_invoice_id=sars_invoice,updated_at=now() where id=r.id;
    end if;
  end if;

  insert into public.notifications(recipient_user_id,channel,subject,message,status,provider,metadata)
  values(
    b.owner_user_id,'WHATSAPP','Payroll payment request',
    'Anthony Isaacs has prepared your payroll. Payroll payslips and SARS access remain locked until the required payment(s) are verified. Please log in to the Isaacs & Partners portal to review and pay.',
    'PENDING','OPENWA',
    jsonb_build_object('business_id',b.id,'payroll_run_id',r.id,'payroll_invoice_id',payroll_invoice,'sars_retainer_invoice_id',sars_invoice,'phone',b.phone)
  );

  return jsonb_build_object(
    'ok',true,'payroll_run_id',r.id,'payroll_invoice_id',payroll_invoice,
    'sars_retainer_invoice_id',sars_invoice,'payroll_total',payroll_total,
    'workflow_stage',(select workflow_stage from public.hr_payroll_runs where id=r.id)
  );
end;
$$;

revoke all on function public.payroll_prepare_client_billing_actor(uuid,uuid) from public,anon,authenticated;
grant execute on function public.payroll_prepare_client_billing_actor(uuid,uuid) to authenticated;

notify pgrst,'reload schema';
