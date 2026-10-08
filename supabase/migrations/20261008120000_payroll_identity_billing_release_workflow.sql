-- Payroll lifecycle, identity routing, client billing gates and SARS retainer locks
-- 2026-10-08

alter table public.businesses
  add column if not exists is_internal_company boolean not null default false;

update public.businesses
set is_internal_company=true
where lower(coalesce(legal_name,'')) like '%isaacs%partner%'
   or lower(coalesce(trading_name,'')) like '%isaacs%partner%';

alter table public.hr_payroll_runs
  add column if not exists workflow_stage text not null default 'CALCULATED',
  add column if not exists billing_status text not null default 'NOT_REQUIRED',
  add column if not exists payroll_invoice_id uuid references public.invoices(id),
  add column if not exists sars_retainer_invoice_id uuid references public.invoices(id),
  add column if not exists approval_status text not null default 'NOT_REQUIRED',
  add column if not exists approved_by uuid references public.profiles(id),
  add column if not exists approved_at timestamptz,
  add column if not exists released_at timestamptz,
  add column if not exists preview_generated_at timestamptz,
  add column if not exists source_file_path text,
  add column if not exists source_file_name text,
  add column if not exists source_snapshot_hash text,
  add column if not exists source_snapshot jsonb not null default '{}'::jsonb;

alter table public.hr_payroll_entries
  add column if not exists release_status text not null default 'LOCKED',
  add column if not exists released_at timestamptz,
  add column if not exists preview_document_id uuid references public.hr_generated_documents(id),
  add column if not exists final_document_id uuid references public.hr_generated_documents(id);

alter table public.hr_payslip_charge_events
  add column if not exists invoice_id uuid references public.invoices(id),
  add column if not exists payment_id uuid references public.payments(id);

create table if not exists public.hr_sars_billing_periods (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  period_key text not null,
  tax_year integer not null,
  fee numeric not null default 0 check (fee >= 0),
  currency text not null default 'ZAR',
  invoice_id uuid references public.invoices(id),
  payment_id uuid references public.payments(id),
  status text not null default 'PENDING' check (status in ('PENDING','INVOICED','PAID','OVERDUE','WAIVED','VOID')),
  access_state text not null default 'LOCKED' check (access_state in ('LOCKED','ENABLED')),
  requested_at timestamptz,
  paid_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, period_key)
);

create index if not exists idx_hr_sars_billing_business_period
  on public.hr_sars_billing_periods(business_id, period_key);

create index if not exists idx_hr_payroll_runs_workflow
  on public.hr_payroll_runs(business_id, workflow_stage, billing_status);

create or replace function public.payroll_prepare_client_billing(
  p_payroll_run_id uuid,
  p_create_sars_retainer boolean default true
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
  entry_count integer;
  payroll_total numeric := 0;
  payroll_invoice uuid;
  sars_invoice uuid;
  period_key text;
  sars_period public.hr_sars_billing_periods%rowtype;
  inv_number text;
begin
  if not public.is_super_admin() then
    raise exception 'Only Super Admin may prepare payroll billing.';
  end if;

  select * into r from public.hr_payroll_runs where id=p_payroll_run_id for update;
  if not found then raise exception 'Payroll run not found.'; end if;

  select * into b from public.businesses where id=r.business_id and is_active=true;
  if not found then raise exception 'Employer business not found.'; end if;

  select * into p from public.hr_payroll_profiles where business_id=r.business_id and active=true limit 1;
  if not found then raise exception 'Payroll profile is not configured.'; end if;

  select count(*) into entry_count from public.hr_payroll_entries where payroll_run_id=r.id;
  payroll_total := round(entry_count * coalesce(p.payslip_unit_price,0),2);

  if payroll_total > 0 then
    inv_number := 'PAY-' || to_char(current_date,'YYYYMMDD') || '-' || substr(replace(r.id::text,'-',''),1,8);
    insert into public.invoices(
      business_id, invoice_number, description, amount, amount_paid, currency,
      status, invoice_date, due_date, subject, subtotal, total, balance_due,
      terms, customer_notes, created_by
    )
    values(
      r.business_id, inv_number,
      'Payroll payslips — ' || entry_count || ' payslip(s) — ' || coalesce(r.period_end::text,''),
      payroll_total, 0, coalesce(p.currency,'ZAR'),
      'SENT', current_date, current_date,
      'Payroll payslip processing', payroll_total, payroll_total, payroll_total,
      'Payslips remain locked until verified Paystack payment.',
      'Anthony Isaacs will release payslips only after backend payment verification.',
      auth.uid()
    )
    returning id into payroll_invoice;

    insert into public.invoice_items(invoice_id,item_order,item_name,description,quantity,rate,tax_rate,amount)
    values(payroll_invoice,1,'Payroll payslips','Per-employee payslip processing',entry_count,p.payslip_unit_price,0,payroll_total);

    update public.hr_payslip_charge_events
      set invoice_id=payroll_invoice,status='INVOICED'
    where payroll_run_id=r.id and status='BILLABLE';

    update public.hr_payroll_runs
      set payroll_invoice_id=payroll_invoice,
          billing_status='PAYMENT_PENDING',
          workflow_stage='INVOICE',
          updated_at=now()
    where id=r.id;
  else
    update public.hr_payroll_runs
      set billing_status='NOT_REQUIRED', workflow_stage='PREVIEW', updated_at=now()
    where id=r.id;
  end if;

  if p_create_sars_retainer and coalesce(p.sars_monthly_fee,0) > 0 then
    period_key := to_char(coalesce(r.period_end,current_date),'YYYY-MM');
    insert into public.hr_sars_billing_periods(business_id,period_key,tax_year,fee,currency,status,access_state,requested_at)
    values(r.business_id,period_key,r.tax_year,p.sars_monthly_fee,coalesce(p.subscription_currency,'ZAR'),'PENDING','LOCKED',now())
    on conflict (business_id,period_key) do update
      set fee=excluded.fee, updated_at=now()
    returning * into sars_period;

    if sars_period.invoice_id is null then
      inv_number := 'SARS-' || to_char(coalesce(r.period_end,current_date),'YYYYMM') || '-' || substr(replace(r.business_id::text,'-',''),1,8);
      insert into public.invoices(
        business_id, invoice_number, description, amount, amount_paid, currency,
        status, invoice_date, due_date, subject, subtotal, total, balance_due,
        terms, customer_notes, created_by
      )
      values(
        r.business_id, inv_number,
        'Monthly SARS payroll compliance retainer — ' || period_key,
        sars_period.fee, 0, sars_period.currency,
        'SENT', current_date, current_date,
        'SARS monthly retainer', sars_period.fee, sars_period.fee, sars_period.fee,
        'SARS payroll information is populated and retained, but client access remains locked until the retainer is paid.',
        'Payment is verified server-side before SARS access is enabled.',
        auth.uid()
      )
      returning id into sars_invoice;

      insert into public.invoice_items(invoice_id,item_order,item_name,description,quantity,rate,tax_rate,amount)
      values(sars_invoice,1,'SARS monthly retainer','Monthly SARS payroll compliance access',1,sars_period.fee,0,sars_period.fee);

      update public.hr_sars_billing_periods
        set invoice_id=sars_invoice,status='INVOICED',updated_at=now()
      where id=sars_period.id;

      update public.hr_payroll_runs
        set sars_retainer_invoice_id=sars_invoice,updated_at=now()
      where id=r.id;
    end if;
  end if;

  insert into public.notifications(recipient_user_id,channel,subject,message,status,provider,metadata)
  values(
    b.owner_user_id,'PORTAL',
    'Payroll payment required',
    'Anthony has prepared your payroll. Payslips remain locked until the requested amount is paid and verified. Your SARS payroll data is being retained separately; SARS access remains locked until the monthly retainer is paid.',
    'PENDING','SYSTEM',
    jsonb_build_object('payroll_run_id',r.id,'business_id',r.business_id,'payroll_invoice_id',payroll_invoice,'sars_retainer_invoice_id',sars_invoice)
  );

  return jsonb_build_object(
    'payroll_run_id',r.id,
    'employee_count',entry_count,
    'payroll_total',payroll_total,
    'payroll_invoice_id',payroll_invoice,
    'sars_retainer_invoice_id',sars_invoice,
    'workflow_stage','INVOICE'
  );
end;
$$;

create or replace function public.payroll_internal_approve(p_payroll_run_id uuid, p_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare r public.hr_payroll_runs%rowtype;
begin
  if not public.is_super_admin() then raise exception 'Only Super Admin may approve internal payroll.'; end if;
  select * into r from public.hr_payroll_runs where id=p_payroll_run_id for update;
  if not found then raise exception 'Payroll run not found.'; end if;
  if not exists(select 1 from public.businesses where id=r.business_id and is_internal_company=true) then
    raise exception 'This payroll run is not marked as Isaacs & Partners internal payroll.';
  end if;

  update public.hr_payroll_runs
    set approval_status='APPROVED', approved_by=auth.uid(), approved_at=now(),
        workflow_stage='RELEASED', released_at=now(), updated_at=now()
  where id=r.id;

  update public.hr_payroll_entries
    set release_status='RELEASED', released_at=now()
  where payroll_run_id=r.id;

  insert into public.notifications(recipient_user_id,channel,subject,message,status,provider,metadata)
  select p.id,'PORTAL','Internal payroll approved',
         'Internal payroll run '||r.id||' has been approved by Super Admin and released.',
         'PENDING','SYSTEM',jsonb_build_object('payroll_run_id',r.id,'notes',p_notes)
  from public.profiles p
  where p.role in ('STAFF','SUPER_ADMIN') and p.is_active=true;

  return jsonb_build_object('ok',true,'payroll_run_id',r.id,'workflow_stage','RELEASED');
end;
$$;

create or replace function public.payroll_release_if_paid(p_payroll_run_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
 r public.hr_payroll_runs%rowtype;
 paid boolean;
 s public.hr_sars_billing_periods%rowtype;
begin
  select * into r from public.hr_payroll_runs where id=p_payroll_run_id for update;
  if not found then raise exception 'Payroll run not found.'; end if;

  paid := exists(
    select 1 from public.payments p
    where p.invoice_id=r.payroll_invoice_id
      and p.provider='PAYSTACK'
      and p.status='COMPLETED'
      and p.amount >= (select total from public.invoices where id=r.payroll_invoice_id)
  );

  if not paid and not exists(select 1 from public.businesses where id=r.business_id and is_internal_company=true) then
    raise exception 'Payroll payment has not been verified by Paystack. Payslips remain locked.';
  end if;

  if paid then
    update public.invoices set status='PAID',amount_paid=total,balance_due=0,paid_at=coalesce(paid_at,now()),updated_at=now()
    where id=r.payroll_invoice_id;

    update public.hr_payroll_runs
      set billing_status='PAID',workflow_stage='RELEASED',released_at=now(),updated_at=now()
    where id=r.id;

    update public.hr_payroll_entries
      set release_status='RELEASED',released_at=now()
    where payroll_run_id=r.id;

    update public.hr_payslip_charge_events c
      set status='INVOICED',payment_id=p.id
    from public.payments p
    where c.payroll_run_id=r.id and c.invoice_id=p.invoice_id and p.status='COMPLETED';
  end if;

  select * into s from public.hr_sars_billing_periods
  where business_id=r.business_id and invoice_id=r.sars_retainer_invoice_id
  limit 1;

  if s.id is not null and exists(
    select 1 from public.payments p
    where p.invoice_id=s.invoice_id and p.provider='PAYSTACK' and p.status='COMPLETED'
      and p.amount >= (select total from public.invoices where id=s.invoice_id)
  ) then
    update public.hr_sars_billing_periods
      set status='PAID',access_state='ENABLED',paid_at=now(),payment_id=(select p.id from public.payments p where p.invoice_id=s.invoice_id and p.provider='PAYSTACK' and p.status='COMPLETED' order by p.paid_at desc nulls last limit 1),updated_at=now()
    where id=s.id;
  end if;

  return jsonb_build_object('ok',true,'payroll_run_id',r.id,'workflow_stage',(select workflow_stage from public.hr_payroll_runs where id=r.id),'payroll_paid',paid,'sars_access',(select access_state from public.hr_sars_billing_periods where id=s.id));
end;
$$;

revoke all on function public.payroll_prepare_client_billing(uuid,boolean) from public,anon,authenticated;
revoke all on function public.payroll_internal_approve(uuid,text) from public,anon,authenticated;
grant execute on function public.payroll_prepare_client_billing(uuid,boolean) to authenticated;
grant execute on function public.payroll_internal_approve(uuid,text) to authenticated;
grant execute on function public.payroll_release_if_paid(uuid) to authenticated;

notify pgrst,'reload schema';
