-- Fix quote -> invoice conversion against the live invoice schema.
-- Also make conversion idempotent so repeated clicks return the existing invoice.

CREATE OR REPLACE FUNCTION public.convert_quote_to_invoice(p_quote_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  q public.quotes%rowtype;
  v_invoice_id uuid;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE id = p_quote_id FOR UPDATE;

  IF q.id IS NULL THEN
    RAISE EXCEPTION 'Quote not found.' USING errcode='P0002';
  END IF;

  IF NOT (
    public.is_super_admin()
    OR q.created_by = auth.uid()
    OR public.has_staff_permission('approve_quotes')
  ) THEN
    RAISE EXCEPTION 'You are not authorised to convert this quote.' USING errcode='42501';
  END IF;

  IF q.converted_invoice_id IS NOT NULL THEN
    RETURN q.converted_invoice_id;
  END IF;

  IF upper(coalesce(q.status::text,'')) <> 'APPROVED'
     AND upper(coalesce(q.customer_decision,'')) <> 'ACCEPTED' THEN
    RAISE EXCEPTION 'Only an approved or accepted quote can be converted to an invoice.' USING errcode='23514';
  END IF;

  INSERT INTO public.invoices (
    matter_id, quote_id, business_id, individual_user_id,
    invoice_number, invoice_date, due_date, currency,
    description, subject, subtotal,
    discount_type, discount_value, discount_amount,
    tax_rate, tax_amount, shipping_charge, adjustment,
    amount, total, amount_paid, balance_due, status,
    customer_notes, terms, terms_and_conditions,
    created_by, updated_by
  )
  VALUES (
    q.matter_id, q.id, q.business_id, q.individual_user_id,
    'INV-' || to_char(current_date,'YYYYMMDD') || '-' ||
      upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
    current_date, q.expiry_date, coalesce(q.currency,'ZAR'),
    coalesce(nullif(q.description,''), q.subject, 'Services rendered by Isaacs & Partners'),
    q.subject, coalesce(q.subtotal,0),
    q.discount_type, coalesce(q.discount_value,0), coalesce(q.discount_amount,0),
    coalesce(q.tax_rate,0), coalesce(q.tax_amount,0),
    coalesce(q.shipping_charge,0), coalesce(q.adjustment,0),
    coalesce(q.total,q.amount,0), coalesce(q.total,q.amount,0),
    0, coalesce(q.total,q.amount,0), 'DRAFT',
    q.customer_notes, q.terms, q.terms,
    auth.uid(), auth.uid()
  )
  RETURNING id INTO v_invoice_id;

  INSERT INTO public.invoice_items (
    invoice_id, item_order, item_name, description,
    quantity, rate, tax_rate, discount_type, discount_value, amount
  )
  SELECT
    v_invoice_id, item_order, item_name, description,
    quantity, rate, tax_rate, discount_type, discount_value, amount
  FROM public.quote_items
  WHERE quote_id = q.id
  ORDER BY item_order;

  UPDATE public.quotes
  SET converted_invoice_id = v_invoice_id,
      status = 'APPROVED',
      updated_by = auth.uid(),
      updated_at = now()
  WHERE id = q.id;

  RETURN v_invoice_id;
END;
$function$;
