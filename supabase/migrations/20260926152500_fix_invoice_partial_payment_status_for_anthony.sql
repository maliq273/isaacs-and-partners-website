create or replace function public.record_invoice_payment(p_invoice_id uuid, p_amount numeric)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_invoice public.invoices%rowtype;
    v_paid numeric(14,2);
begin
    select * into v_invoice from public.invoices where id=p_invoice_id for update;
    if v_invoice.id is null then raise exception 'Invoice not found.' using errcode='P0002'; end if;
    if not (public.is_super_admin() or v_invoice.created_by=auth.uid() or public.has_staff_permission('manage_invoices')) then
      raise exception 'You are not authorised to record a payment.' using errcode='42501';
    end if;
    if p_amount is null or p_amount <= 0 then raise exception 'Payment amount must be greater than zero.' using errcode='23514'; end if;
    v_paid := least(coalesce(v_invoice.total,0), coalesce(v_invoice.amount_paid,0)+p_amount);
    update public.invoices
       set amount_paid=v_paid,
           balance_due=greatest(coalesce(total,0)-v_paid,0),
           status=case when v_paid >= coalesce(total,0) then 'PAID'
                       when v_paid > 0 then 'PART_PAID'
                       else status end,
           paid_at=case when v_paid >= coalesce(total,0) then now() else paid_at end,
           updated_by=auth.uid(), updated_at=now()
     where id=p_invoice_id
     returning * into v_invoice;
    return v_invoice;
end;
$function$;
