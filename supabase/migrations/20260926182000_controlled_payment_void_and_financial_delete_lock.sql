begin;

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check
  check (status in ('PENDING','COMPLETED','FAILED','REFUNDED','VOIDED'));

revoke delete on table public.payments from anon, authenticated;
revoke delete on table public.invoices from anon, authenticated;
revoke delete on table public.quotes from anon, authenticated;

create or replace function public.void_invoice_payment(
  p_payment_id uuid,
  p_reason text default null
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_payment public.payments;
  v_invoice public.invoices;
  v_paid numeric;
  v_total numeric;
  v_new_status text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required.' using errcode='42501';
  end if;

  if not (public.is_super_admin() or public.has_staff_permission('manage_invoices')) then
    raise exception 'Only Super Admin or authorised invoice staff may void a payment.' using errcode='42501';
  end if;

  select * into v_payment from public.payments where id=p_payment_id for update;
  if v_payment.id is null then
    raise exception 'Payment not found.' using errcode='P0002';
  end if;

  if v_payment.status <> 'COMPLETED' then
    raise exception 'Only a COMPLETED payment can be voided.' using errcode='22023';
  end if;

  select * into v_invoice from public.invoices where id=v_payment.invoice_id for update;
  if v_invoice.id is null then
    raise exception 'Invoice for payment not found.' using errcode='P0002';
  end if;

  update public.payments
     set status='VOIDED',
         metadata = coalesce(metadata,'{}'::jsonb)
           || jsonb_build_object(
                'voided', true,
                'voided_at', now(),
                'voided_by', auth.uid(),
                'void_reason', nullif(trim(coalesce(p_reason,'')),'')
              ),
         updated_at=now()
   where id=p_payment_id
   returning * into v_payment;

  select coalesce(sum(amount),0) into v_paid
  from public.payments
  where invoice_id=v_invoice.id and status='COMPLETED';

  v_total := coalesce(v_invoice.total,v_invoice.amount,0);

  if v_paid <= 0 then
    v_new_status := case when v_invoice.status='CANCELLED' then 'CANCELLED' else 'ISSUED' end;
  elsif v_paid >= v_total then
    v_new_status := 'PAID';
  else
    v_new_status := 'PART_PAID';
  end if;

  update public.invoices
     set amount_paid=v_paid,
         balance_due=greatest(v_total-v_paid,0),
         status=v_new_status,
         paid_at=case when v_paid >= v_total and v_total > 0 then coalesce(paid_at,now()) else null end,
         updated_at=now()
   where id=v_invoice.id;

  return v_payment;
end;
$function$;

revoke all on function public.void_invoice_payment(uuid,text) from public;
grant execute on function public.void_invoice_payment(uuid,text) to authenticated;

commit;
