-- Repair/complete the sales transaction RPC layer.
-- This migration intentionally replaces the first draft function before any
-- browser code calls it. The quote row must exist before quote_items can exist.

create or replace function public.create_quote_transaction(
    p_matter_id uuid default null,
    p_individual_user_id uuid default null,
    p_business_id uuid default null,
    p_reference_number text default null,
    p_quote_date date default current_date,
    p_expiry_date date default null,
    p_subject text default null,
    p_description text default null,
    p_currency text default 'ZAR',
    p_discount_type text default 'PERCENT',
    p_discount_value numeric default 0,
    p_tax_rate numeric default 0,
    p_shipping_charge numeric default 0,
    p_adjustment numeric default 0,
    p_customer_notes text default null,
    p_terms text default null,
    p_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_quote_id uuid;
    v_quote_number text;
    v_subtotal numeric(14,2) := 0;
    v_discount numeric(14,2) := 0;
    v_tax numeric(14,2) := 0;
    v_total numeric(14,2) := 0;
    v_item jsonb;
    v_qty numeric;
    v_rate numeric;
    v_tax_rate numeric;
    v_line numeric;
    v_line_discount numeric;
    v_line_tax numeric;
    v_order integer := 1;
begin
    if (p_individual_user_id is null) = (p_business_id is null) then
        raise exception 'A quote must be linked to exactly one individual or business client.' using errcode = '23514';
    end if;
    if nullif(trim(coalesce(p_subject, p_description, '')), '') is null then
        raise exception 'Quote subject or description is required.' using errcode = '23514';
    end if;

    v_quote_number := coalesce(
        nullif(trim(p_reference_number), ''),
        'QT-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
    );

    for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
        v_qty := greatest(coalesce((v_item->>'quantity')::numeric, 1), 0.001);
        v_rate := greatest(coalesce((v_item->>'rate')::numeric, 0), 0);
        v_tax_rate := greatest(coalesce((v_item->>'tax_rate')::numeric, p_tax_rate, 0), 0);
        v_line := round(v_qty * v_rate, 2);
        v_line_discount := case
            when upper(coalesce(v_item->>'discount_type','PERCENT')) = 'FIXED'
                then least(v_line, greatest(coalesce((v_item->>'discount_value')::numeric,0),0))
            else round(v_line * greatest(coalesce((v_item->>'discount_value')::numeric,0),0) / 100, 2)
        end;
        v_line := greatest(v_line - v_line_discount, 0);
        v_line_tax := round(v_line * v_tax_rate / 100, 2);
        v_subtotal := v_subtotal + v_line;
        v_tax := v_tax + v_line_tax;
    end loop;

    v_discount := case
        when upper(coalesce(p_discount_type,'PERCENT')) = 'FIXED'
            then least(v_subtotal, greatest(coalesce(p_discount_value,0),0))
        else round(v_subtotal * greatest(coalesce(p_discount_value,0),0) / 100, 2)
    end;
    v_total := greatest(v_subtotal - v_discount + v_tax + greatest(coalesce(p_shipping_charge,0),0) + coalesce(p_adjustment,0), 0);

    insert into public.quotes (
        matter_id, individual_user_id, business_id, quote_number, description, amount,
        status, created_by, reference_number, quote_date, expiry_date, subject, currency,
        subtotal, discount_type, discount_value, discount_amount, tax_rate, tax_amount,
        shipping_charge, adjustment, total, customer_notes, terms, delivery_status, customer_decision
    ) values (
        p_matter_id, p_individual_user_id, p_business_id, v_quote_number,
        coalesce(nullif(trim(p_description),''), trim(p_subject)), v_total, 'DRAFT', auth.uid(),
        p_reference_number, coalesce(p_quote_date,current_date), p_expiry_date, p_subject,
        coalesce(nullif(p_currency,''),'ZAR'), v_subtotal,
        upper(coalesce(p_discount_type,'PERCENT')), greatest(coalesce(p_discount_value,0),0),
        v_discount, greatest(coalesce(p_tax_rate,0),0), v_tax,
        greatest(coalesce(p_shipping_charge,0),0), coalesce(p_adjustment,0), v_total,
        p_customer_notes, p_terms, 'NOT_SENT', 'PENDING'
    ) returning id into v_quote_id;

    for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
        v_qty := greatest(coalesce((v_item->>'quantity')::numeric, 1), 0.001);
        v_rate := greatest(coalesce((v_item->>'rate')::numeric, 0), 0);
        v_tax_rate := greatest(coalesce((v_item->>'tax_rate')::numeric, p_tax_rate, 0), 0);
        v_line := round(v_qty * v_rate, 2);
        v_line_discount := case
            when upper(coalesce(v_item->>'discount_type','PERCENT')) = 'FIXED'
                then least(v_line, greatest(coalesce((v_item->>'discount_value')::numeric,0),0))
            else round(v_line * greatest(coalesce((v_item->>'discount_value')::numeric,0),0) / 100, 2)
        end;
        v_line := greatest(v_line - v_line_discount, 0);
        v_line_tax := round(v_line * v_tax_rate / 100, 2);
        insert into public.quote_items (
            quote_id, item_order, item_name, description, quantity, rate, tax_rate,
            discount_type, discount_value, amount
        ) values (
            v_quote_id, v_order, coalesce(nullif(trim(v_item->>'item_name'),''),'Service'),
            v_item->>'description', v_qty, v_rate, v_tax_rate,
            upper(coalesce(v_item->>'discount_type','PERCENT')),
            greatest(coalesce((v_item->>'discount_value')::numeric,0),0),
            round(v_line + v_line_tax,2)
        );
        v_order := v_order + 1;
    end loop;

    return v_quote_id;
end;
$$;

revoke all on function public.create_quote_transaction(uuid,uuid,uuid,text,date,date,text,text,text,text,numeric,numeric,numeric,numeric,text,text,jsonb) from public;
grant execute on function public.create_quote_transaction(uuid,uuid,uuid,text,date,date,text,text,text,text,numeric,numeric,numeric,numeric,text,text,jsonb) to authenticated;

create or replace function public.create_invoice_transaction(
    p_matter_id uuid default null,
    p_quote_id uuid default null,
    p_individual_user_id uuid default null,
    p_business_id uuid default null,
    p_order_number text default null,
    p_invoice_date date default current_date,
    p_terms text default 'DUE_ON_RECEIPT',
    p_due_date date default null,
    p_subject text default null,
    p_currency text default 'ZAR',
    p_discount_type text default 'PERCENT',
    p_discount_value numeric default 0,
    p_tax_rate numeric default 0,
    p_shipping_charge numeric default 0,
    p_adjustment numeric default 0,
    p_customer_notes text default null,
    p_terms_and_conditions text default null,
    p_items jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_invoice_id uuid;
    v_invoice_number text;
    v_subtotal numeric(14,2) := 0;
    v_discount numeric(14,2) := 0;
    v_tax numeric(14,2) := 0;
    v_total numeric(14,2) := 0;
    v_item jsonb;
    v_qty numeric;
    v_rate numeric;
    v_tax_rate numeric;
    v_line numeric;
    v_line_discount numeric;
    v_line_tax numeric;
    v_order integer := 1;
begin
    if (p_individual_user_id is null) = (p_business_id is null) then
        raise exception 'An invoice must be linked to exactly one individual or business client.' using errcode='23514';
    end if;

    v_invoice_number := 'INV-' || to_char(current_date,'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));

    for v_item in select * from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
        v_qty := greatest(coalesce((v_item->>'quantity')::numeric,1),0.001);
        v_rate := greatest(coalesce((v_item->>'rate')::numeric,0),0);
        v_tax_rate := greatest(coalesce((v_item->>'tax_rate')::numeric,p_tax_rate,0),0);
        v_line := round(v_qty*v_rate,2);
        v_line_discount := case when upper(coalesce(v_item->>'discount_type','PERCENT'))='FIXED'
            then least(v_line,greatest(coalesce((v_item->>'discount_value')::numeric,0),0))
            else round(v_line*greatest(coalesce((v_item->>'discount_value')::numeric,0),0)/100,2) end;
        v_line := greatest(v_line-v_line_discount,0);
        v_line_tax := round(v_line*v_tax_rate/100,2);
        v_subtotal := v_subtotal+v_line;
        v_tax := v_tax+v_line_tax;
    end loop;

    v_discount := case when upper(coalesce(p_discount_type,'PERCENT'))='FIXED'
        then least(v_subtotal,greatest(coalesce(p_discount_value,0),0))
        else round(v_subtotal*greatest(coalesce(p_discount_value,0),0)/100,2) end;
    v_total := greatest(v_subtotal-v_discount+v_tax+greatest(coalesce(p_shipping_charge,0),0)+coalesce(p_adjustment,0),0);

    insert into public.invoices (
        matter_id,quote_id,individual_user_id,business_id,invoice_number,order_number,
        invoice_date,terms,due_date,currency,subject,subtotal,discount_type,discount_value,
        discount_amount,tax_rate,tax_amount,shipping_charge,adjustment,total,amount_paid,
        balance_due,status,customer_notes,terms_and_conditions,created_by
    ) values (
        p_matter_id,p_quote_id,p_individual_user_id,p_business_id,v_invoice_number,p_order_number,
        coalesce(p_invoice_date,current_date),coalesce(p_terms,'DUE_ON_RECEIPT'),p_due_date,
        coalesce(nullif(p_currency,''),'ZAR'),p_subject,v_subtotal,upper(coalesce(p_discount_type,'PERCENT')),
        greatest(coalesce(p_discount_value,0),0),v_discount,greatest(coalesce(p_tax_rate,0),0),v_tax,
        greatest(coalesce(p_shipping_charge,0),0),coalesce(p_adjustment,0),v_total,0,v_total,'DRAFT',
        p_customer_notes,p_terms_and_conditions,auth.uid()
    ) returning id into v_invoice_id;

    for v_item in select * from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) loop
        v_qty := greatest(coalesce((v_item->>'quantity')::numeric,1),0.001);
        v_rate := greatest(coalesce((v_item->>'rate')::numeric,0),0);
        v_tax_rate := greatest(coalesce((v_item->>'tax_rate')::numeric,p_tax_rate,0),0);
        v_line := round(v_qty*v_rate,2);
        v_line_discount := case when upper(coalesce(v_item->>'discount_type','PERCENT'))='FIXED'
            then least(v_line,greatest(coalesce((v_item->>'discount_value')::numeric,0),0))
            else round(v_line*greatest(coalesce((v_item->>'discount_value')::numeric,0),0)/100,2) end;
        v_line := greatest(v_line-v_line_discount,0);
        v_line_tax := round(v_line*v_tax_rate/100,2);
        insert into public.invoice_items (invoice_id,item_order,item_name,description,quantity,rate,tax_rate,discount_type,discount_value,amount)
        values (v_invoice_id,v_order,coalesce(nullif(trim(v_item->>'item_name'),''),'Service'),v_item->>'description',v_qty,v_rate,v_tax_rate,upper(coalesce(v_item->>'discount_type','PERCENT')),greatest(coalesce((v_item->>'discount_value')::numeric,0),0),round(v_line+v_line_tax,2));
        v_order:=v_order+1;
    end loop;

    return v_invoice_id;
end;
$$;

revoke all on function public.create_invoice_transaction(uuid,uuid,uuid,uuid,text,date,text,date,text,text,text,numeric,numeric,numeric,numeric,text,text,jsonb) from public;
grant execute on function public.create_invoice_transaction(uuid,uuid,uuid,uuid,text,date,text,date,text,text,text,numeric,numeric,numeric,numeric,text,text,jsonb) to authenticated;

create or replace function public.record_invoice_payment(p_invoice_id uuid, p_amount numeric)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
    v_invoice public.invoices%rowtype;
    v_paid numeric(14,2);
begin
    select * into v_invoice from public.invoices where id=p_invoice_id for update;
    if v_invoice.id is null then raise exception 'Invoice not found.' using errcode='P0002'; end if;
    if not (public.is_super_admin() or v_invoice.created_by=auth.uid() or public.has_staff_permission('manage_invoices')) then raise exception 'You are not authorised to record a payment.' using errcode='42501'; end if;
    if p_amount is null or p_amount <= 0 then raise exception 'Payment amount must be greater than zero.' using errcode='23514'; end if;
    v_paid := least(coalesce(v_invoice.total,0), coalesce(v_invoice.amount_paid,0)+p_amount);
    update public.invoices
       set amount_paid=v_paid,
           balance_due=greatest(coalesce(total,0)-v_paid,0),
           status=case when v_paid >= coalesce(total,0) then 'PAID' when v_paid > 0 then 'PARTIALLY_PAID' else status end,
           paid_at=case when v_paid >= coalesce(total,0) then now() else paid_at end,
           updated_by=auth.uid(), updated_at=now()
     where id=p_invoice_id
     returning * into v_invoice;
    return v_invoice;
end;
$$;

revoke all on function public.record_invoice_payment(uuid,numeric) from public;
grant execute on function public.record_invoice_payment(uuid,numeric) to authenticated;

create or replace function public.convert_quote_to_invoice(p_quote_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    q public.quotes%rowtype;
    v_invoice_id uuid;
begin
    select * into q from public.quotes where id=p_quote_id for update;
    if q.id is null then raise exception 'Quote not found.' using errcode='P0002'; end if;
    if not (public.is_super_admin() or q.created_by=auth.uid() or public.has_staff_permission('approve_quotes')) then raise exception 'You are not authorised to convert this quote.' using errcode='42501'; end if;
    if upper(coalesce(q.status,'')) <> 'APPROVED' and upper(coalesce(q.customer_decision,'')) <> 'ACCEPTED' then raise exception 'Only an approved or accepted quote can be converted to an invoice.' using errcode='23514'; end if;

    insert into public.invoices (matter_id,quote_id,business_id,individual_user_id,invoice_number,invoice_date,due_date,currency,subject,subtotal,discount_type,discount_value,discount_amount,tax_rate,tax_amount,shipping_charge,adjustment,total,amount_paid,balance_due,status,customer_notes,terms_and_conditions,created_by)
    values (q.matter_id,q.id,q.business_id,q.individual_user_id,'INV-'||to_char(current_date,'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),current_date,q.expiry_date,coalesce(q.currency,'ZAR'),q.subject,q.subtotal,q.discount_type,q.discount_value,q.discount_amount,q.tax_rate,q.tax_amount,q.shipping_charge,q.adjustment,coalesce(q.total,q.amount,0),0,coalesce(q.total,q.amount,0),'DRAFT',q.customer_notes,q.terms,auth.uid())
    returning id into v_invoice_id;

    insert into public.invoice_items (invoice_id,item_order,item_name,description,quantity,rate,tax_rate,discount_type,discount_value,amount)
    select v_invoice_id,item_order,item_name,description,quantity,rate,tax_rate,discount_type,discount_value,amount from public.quote_items where quote_id=q.id order by item_order;

    update public.quotes set converted_invoice_id=v_invoice_id,status='APPROVED',updated_by=auth.uid(),updated_at=now() where id=q.id;
    return v_invoice_id;
end;
$$;

revoke all on function public.convert_quote_to_invoice(uuid) from public;
grant execute on function public.convert_quote_to_invoice(uuid) to authenticated;
