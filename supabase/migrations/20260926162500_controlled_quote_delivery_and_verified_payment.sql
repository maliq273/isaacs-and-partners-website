-- Controlled quote delivery and verified payment operations for Anthony's commercial workflow.
create or replace function public.client_portal_deliver_quote(p_quote_id uuid)
returns public.quotes
language plpgsql
security definer
set search_path=''
as $$
declare
  u uuid := (select auth.uid());
  q public.quotes;
  recipient uuid;
  msg text;
begin
  if u is null then
    raise exception 'Authentication required.' using errcode='42501';
  end if;

  select * into q from public.quotes x
  where x.id=p_quote_id
    and (public.is_super_admin()
      or x.created_by=u
      or public.has_staff_permission('send_quotes')
      or public.has_staff_permission('manage_quotes'))
  for update;

  if q.id is null then
    raise exception 'Quote is outside caller scope or caller is not authorised to deliver it.' using errcode='42501';
  end if;

  if upper(coalesce(q.status::text,'')) not in ('DRAFT','APPROVED') then
    raise exception 'Only draft or approved quotes can be delivered.' using errcode='40901';
  end if;

  if coalesce(q.customer_decision,'PENDING')='ACCEPTED' then
    raise exception 'An accepted quote cannot be re-delivered by this operation.' using errcode='40901';
  end if;

  recipient := q.individual_user_id;
  if recipient is null and q.business_id is not null then
    select b.owner_user_id into recipient from public.businesses b where b.id=q.business_id;
  end if;

  if recipient is null then
    raise exception 'Quote has no customer recipient.' using errcode='23514';
  end if;

  msg := format(
    'Your quote %s from Isaacs & Partners is ready for review. Please open your customer portal to review the quote and accept it digitally.',
    coalesce(q.quote_number,q.reference_number,'quote')
  );

  update public.quotes
  set delivery_status='SENT',
      updated_by=u,
      updated_at=now()
  where id=p_quote_id
  returning * into q;

  perform public.client_portal_queue_notification(
    recipient,
    'Quote ready for review',
    msg,
    jsonb_build_object(
      'type','QUOTE_DELIVERED',
      'quote_id',p_quote_id,
      'matter_id',q.matter_id,
      'quote_number',q.quote_number,
      'delivery_status','SENT'
    )
  );

  return q;
end $$;

revoke all on function public.client_portal_deliver_quote(uuid) from public,anon;
grant execute on function public.client_portal_deliver_quote(uuid) to authenticated;

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

  select * into inv from public.invoices where id=p_invoice_id for update;

  if inv.id is null then
    raise exception 'Invoice not found.' using errcode='P0002';
  end if;

  if not (public.is_super_admin() or inv.created_by=u or public.has_staff_permission('manage_invoices')) then
    raise exception 'You are not authorised to record a verified payment.' using errcode='42501';
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
      || jsonb_build_object('recorded_by',u,'source','CONTROLLED_PAYMENT_OPERATION')
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
