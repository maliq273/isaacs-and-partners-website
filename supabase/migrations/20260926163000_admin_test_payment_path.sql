-- Authorised admin test payment path.
-- Production payment reconciliation should call record_verified_invoice_payment
-- after the real payment provider/bank event is verified.
create or replace function public.record_verified_invoice_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_payment_method text default 'OTHER',
  p_provider text default null,
  p_provider_reference text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.payments
language plpgsql
security definer
set search_path=''
as $$
declare
  u uuid := (select auth.uid());
  inv public.invoices;
  payment public.payments;
begin
  if u is null then
    raise exception 'Authentication required.' using errcode='42501';
  end if;

  select * into inv
  from public.invoices
  where id=p_invoice_id
  for update;

  if inv.id is null then
    raise exception 'Invoice not found.' using errcode='P0002';
  end if;

  if not (
    public.is_super_admin()
    or public.has_staff_permission('manage_invoices')
  ) then
    raise exception 'Only an authorised admin/staff payment operator can record a verified payment.' using errcode='42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than zero.' using errcode='23514';
  end if;

  if p_amount > greatest(coalesce(inv.total,inv.amount,0)-coalesce(inv.amount_paid,0),0) then
    raise exception 'Payment exceeds the current invoice balance.' using errcode='22003';
  end if;

  insert into public.payments(
    invoice_id, amount, currency, payment_method, provider,
    provider_reference, status, received_by, metadata
  )
  values(
    p_invoice_id,
    p_amount,
    coalesce(inv.currency,'ZAR'),
    upper(coalesce(nullif(trim(p_payment_method),''),'OTHER')),
    nullif(trim(p_provider),''),
    nullif(trim(p_provider_reference),''),
    'COMPLETED',
    u,
    coalesce(p_metadata,'{}'::jsonb)
      || jsonb_build_object(
        'recorded_by',u,
        'source','CONTROLLED_PAYMENT_OPERATION',
        'operator_verified',true
      )
  )
  returning * into payment;

  update public.invoices
  set amount_paid=least(coalesce(total,amount,0),coalesce(amount_paid,0)+p_amount),
      balance_due=greatest(coalesce(total,amount,0)-(coalesce(amount_paid,0)+p_amount),0),
      status=case
        when coalesce(amount_paid,0)+p_amount >= coalesce(total,amount,0) then 'PAID'
        when coalesce(amount_paid,0)+p_amount > 0 then 'PART_PAID'
        else status
      end,
      paid_at=case when coalesce(amount_paid,0)+p_amount >= coalesce(total,amount,0) then now() else paid_at end,
      updated_by=u,
      updated_at=now()
  where id=p_invoice_id;

  return payment;
end $$;

revoke all on function public.record_verified_invoice_payment(uuid,numeric,text,text,text,jsonb) from public,anon;
grant execute on function public.record_verified_invoice_payment(uuid,numeric,text,text,text,jsonb) to authenticated;
