-- Isaacs & Partners
-- Zoho-style sales transaction foundation.
-- Supabase is the source of truth. Browser controllers only orchestrate requests.

-- -----------------------------------------------------------------------------
-- Quotes: extend the existing live table without replacing its legacy columns.
-- -----------------------------------------------------------------------------
alter table if exists public.quotes
    add column if not exists reference_number text,
    add column if not exists quote_date date not null default current_date,
    add column if not exists expiry_date date,
    add column if not exists subject text,
    add column if not exists currency text not null default 'ZAR',
    add column if not exists subtotal numeric(14,2) not null default 0,
    add column if not exists discount_type text not null default 'PERCENT',
    add column if not exists discount_value numeric(14,2) not null default 0,
    add column if not exists discount_amount numeric(14,2) not null default 0,
    add column if not exists tax_rate numeric(8,4) not null default 0,
    add column if not exists tax_amount numeric(14,2) not null default 0,
    add column if not exists shipping_charge numeric(14,2) not null default 0,
    add column if not exists adjustment numeric(14,2) not null default 0,
    add column if not exists total numeric(14,2) not null default 0,
    add column if not exists customer_notes text,
    add column if not exists terms text,
    add column if not exists salesperson_user_id uuid,
    add column if not exists delivery_status text not null default 'NOT_SENT',
    add column if not exists customer_decision text not null default 'PENDING',
    add column if not exists sent_at timestamptz,
    add column if not exists viewed_at timestamptz,
    add column if not exists accepted_at timestamptz,
    add column if not exists declined_at timestamptz,
    add column if not exists converted_invoice_id uuid,
    add column if not exists updated_by uuid;

create table if not exists public.quote_items (
    id uuid primary key default gen_random_uuid(),
    quote_id uuid not null references public.quotes(id) on delete cascade,
    item_order integer not null default 1,
    item_name text not null,
    description text,
    quantity numeric(14,3) not null default 1,
    rate numeric(14,2) not null default 0,
    tax_rate numeric(8,4) not null default 0,
    discount_type text not null default 'PERCENT',
    discount_value numeric(14,2) not null default 0,
    amount numeric(14,2) not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint quote_items_quantity_check check (quantity > 0),
    constraint quote_items_rate_check check (rate >= 0),
    constraint quote_items_tax_check check (tax_rate >= 0),
    constraint quote_items_discount_type_check check (discount_type in ('PERCENT','FIXED')),
    constraint quote_items_discount_check check (discount_value >= 0)
);

create index if not exists quote_items_quote_idx on public.quote_items(quote_id, item_order);

alter table public.quote_items enable row level security;

drop policy if exists quote_items_select_authorised on public.quote_items;
create policy quote_items_select_authorised on public.quote_items
for select to authenticated
using (
    public.is_super_admin()
    or exists (
        select 1 from public.quotes q
        where q.id = quote_items.quote_id
          and (
              q.created_by = auth.uid()
              or q.individual_user_id = auth.uid()
              or q.business_id in (select b.id from public.businesses b where b.owner_user_id = auth.uid())
              or (
                  public.current_user_role() = 'STAFF'::app_role
                  and public.has_staff_permission('view_quotes')
                  and public.staff_can_access_quote(q.id, 'view_quotes')
              )
          )
    )
);

drop policy if exists quote_items_write_authorised on public.quote_items;
create policy quote_items_write_authorised on public.quote_items
for all to authenticated
using (
    public.is_super_admin()
    or exists (
        select 1 from public.quotes q
        where q.id = quote_items.quote_id
          and (
              q.created_by = auth.uid()
              or (
                  public.current_user_role() = 'STAFF'::app_role
                  and public.has_staff_permission('edit_quotes')
                  and public.staff_can_access_quote(q.id, 'edit_quotes')
              )
          )
    )
)
with check (
    public.is_super_admin()
    or exists (
        select 1 from public.quotes q
        where q.id = quote_items.quote_id
          and (
              q.created_by = auth.uid()
              or (
                  public.current_user_role() = 'STAFF'::app_role
                  and public.has_staff_permission('edit_quotes')
                  and public.staff_can_access_quote(q.id, 'edit_quotes')
              )
          )
    )
);

-- -----------------------------------------------------------------------------
-- Invoices: create if absent; extend if an earlier invoice table exists.
-- -----------------------------------------------------------------------------
create table if not exists public.invoices (
    id uuid primary key default gen_random_uuid(),
    matter_id uuid references public.matters(id) on delete set null,
    quote_id uuid references public.quotes(id) on delete set null,
    business_id uuid references public.businesses(id) on delete set null,
    individual_user_id uuid references public.profiles(id) on delete set null,
    invoice_number text not null,
    order_number text,
    invoice_date date not null default current_date,
    terms text not null default 'DUE_ON_RECEIPT',
    due_date date,
    currency text not null default 'ZAR',
    subject text,
    salesperson_user_id uuid,
    subtotal numeric(14,2) not null default 0,
    discount_type text not null default 'PERCENT',
    discount_value numeric(14,2) not null default 0,
    discount_amount numeric(14,2) not null default 0,
    tax_rate numeric(8,4) not null default 0,
    tax_amount numeric(14,2) not null default 0,
    shipping_charge numeric(14,2) not null default 0,
    adjustment numeric(14,2) not null default 0,
    total numeric(14,2) not null default 0,
    amount_paid numeric(14,2) not null default 0,
    balance_due numeric(14,2) not null default 0,
    status text not null default 'DRAFT',
    customer_notes text,
    terms_and_conditions text,
    sent_at timestamptz,
    paid_at timestamptz,
    voided_at timestamptz,
    created_by uuid not null references auth.users(id),
    updated_by uuid,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint invoices_client_check check (((individual_user_id is not null)::integer + (business_id is not null)::integer) = 1),
    constraint invoices_amount_check check (subtotal >= 0 and discount_amount >= 0 and tax_amount >= 0 and shipping_charge >= 0),
    constraint invoices_status_check check (status in ('DRAFT','SENT','OVERDUE','PARTIALLY_PAID','PAID','VOID','CANCELLED'))
);

alter table public.invoices
    add column if not exists matter_id uuid,
    add column if not exists quote_id uuid,
    add column if not exists business_id uuid,
    add column if not exists individual_user_id uuid,
    add column if not exists invoice_number text,
    add column if not exists order_number text,
    add column if not exists invoice_date date default current_date,
    add column if not exists terms text default 'DUE_ON_RECEIPT',
    add column if not exists due_date date,
    add column if not exists currency text default 'ZAR',
    add column if not exists subject text,
    add column if not exists salesperson_user_id uuid,
    add column if not exists subtotal numeric(14,2) default 0,
    add column if not exists discount_type text default 'PERCENT',
    add column if not exists discount_value numeric(14,2) default 0,
    add column if not exists discount_amount numeric(14,2) default 0,
    add column if not exists tax_rate numeric(8,4) default 0,
    add column if not exists tax_amount numeric(14,2) default 0,
    add column if not exists shipping_charge numeric(14,2) default 0,
    add column if not exists adjustment numeric(14,2) default 0,
    add column if not exists total numeric(14,2) default 0,
    add column if not exists amount_paid numeric(14,2) default 0,
    add column if not exists balance_due numeric(14,2) default 0,
    add column if not exists status text default 'DRAFT',
    add column if not exists customer_notes text,
    add column if not exists terms_and_conditions text,
    add column if not exists sent_at timestamptz,
    add column if not exists paid_at timestamptz,
    add column if not exists voided_at timestamptz,
    add column if not exists created_by uuid,
    add column if not exists updated_by uuid,
    add column if not exists created_at timestamptz default now(),
    add column if not exists updated_at timestamptz default now();

create unique index if not exists invoices_invoice_number_uidx on public.invoices(invoice_number) where invoice_number is not null;
create index if not exists invoices_customer_idx on public.invoices(individual_user_id, business_id, invoice_date desc);
create index if not exists invoices_matter_idx on public.invoices(matter_id, created_at desc);

create table if not exists public.invoice_items (
    id uuid primary key default gen_random_uuid(),
    invoice_id uuid not null references public.invoices(id) on delete cascade,
    item_order integer not null default 1,
    item_name text not null,
    description text,
    quantity numeric(14,3) not null default 1,
    rate numeric(14,2) not null default 0,
    tax_rate numeric(8,4) not null default 0,
    discount_type text not null default 'PERCENT',
    discount_value numeric(14,2) not null default 0,
    amount numeric(14,2) not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint invoice_items_quantity_check check (quantity > 0),
    constraint invoice_items_rate_check check (rate >= 0),
    constraint invoice_items_tax_check check (tax_rate >= 0),
    constraint invoice_items_discount_type_check check (discount_type in ('PERCENT','FIXED')),
    constraint invoice_items_discount_check check (discount_value >= 0)
);

create index if not exists invoice_items_invoice_idx on public.invoice_items(invoice_id, item_order);

alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;

drop policy if exists invoices_select_authorised on public.invoices;
create policy invoices_select_authorised on public.invoices
for select to authenticated
using (
    public.is_super_admin()
    or created_by = auth.uid()
    or individual_user_id = auth.uid()
    or business_id in (select b.id from public.businesses b where b.owner_user_id = auth.uid())
    or (
        public.current_user_role() = 'STAFF'::app_role
        and public.has_staff_permission('view_financials')
        and (
            matter_id is null
            or public.staff_can_access_matter(matter_id, 'view_financials')
        )
    )
);

drop policy if exists invoices_write_authorised on public.invoices;
create policy invoices_write_authorised on public.invoices
for all to authenticated
using (
    public.is_super_admin()
    or created_by = auth.uid()
    or (
        public.current_user_role() = 'STAFF'::app_role
        and public.has_staff_permission('manage_invoices')
    )
)
with check (
    public.is_super_admin()
    or created_by = auth.uid()
    or (
        public.current_user_role() = 'STAFF'::app_role
        and public.has_staff_permission('manage_invoices')
    )
);

drop policy if exists invoice_items_select_authorised on public.invoice_items;
create policy invoice_items_select_authorised on public.invoice_items
for select to authenticated
using (exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id));

drop policy if exists invoice_items_write_authorised on public.invoice_items;
create policy invoice_items_write_authorised on public.invoice_items
for all to authenticated
using (exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id and (public.is_super_admin() or i.created_by = auth.uid() or public.has_staff_permission('manage_invoices'))))
with check (exists (select 1 from public.invoices i where i.id = invoice_items.invoice_id and (public.is_super_admin() or i.created_by = auth.uid() or public.has_staff_permission('manage_invoices'))));

-- -----------------------------------------------------------------------------
-- Transaction helpers. These centralise totals and conversion so browser code
-- cannot create a quote/invoice with inconsistent financial totals.
-- -----------------------------------------------------------------------------
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

    v_quote_number := coalesce(nullif(trim(p_reference_number), ''), 'QT-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)));

    for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
        v_qty := greatest(coalesce((v_item->>'quantity')::numeric, 1), 0);
        v_rate := greatest(coalesce((v_item->>'rate')::numeric, 0), 0);
        v_tax_rate := greatest(coalesce((v_item->>'tax_rate')::numeric, p_tax_rate, 0), 0);
        v_line := round(v_qty * v_rate, 2);
        v_line_discount := case when upper(coalesce(v_item->>'discount_type','PERCENT')) = 'FIXED' then least(v_line, greatest(coalesce((v_item->>'discount_value')::numeric,0),0)) else round(v_line * greatest(coalesce((v_item->>'discount_value')::numeric,0),0) / 100, 2) end;
        v_line := greatest(v_line - v_line_discount, 0);
        v_line_tax := round(v_line * v_tax_rate / 100, 2);
        v_subtotal := v_subtotal + v_line;
        v_tax := v_tax + v_line_tax;
        insert into public.quote_items (quote_id, item_order, item_name, description, quantity, rate, tax_rate, discount_type, discount_value, amount)
        values (v_quote_id, v_order, coalesce(v_item->>'item_name','Service'), v_item->>'description', v_qty, v_rate, v_tax_rate, upper(coalesce(v_item->>'discount_type','PERCENT')), greatest(coalesce((v_item->>'discount_value')::numeric,0),0), round(v_line + v_line_tax,2));
        v_order := v_order + 1;
    end loop;

    v_discount := case when upper(coalesce(p_discount_type,'PERCENT')) = 'FIXED' then least(v_subtotal, greatest(coalesce(p_discount_value,0),0)) else round(v_subtotal * greatest(coalesce(p_discount_value,0),0) / 100, 2) end;
    v_total := greatest(v_subtotal - v_discount + v_tax + greatest(coalesce(p_shipping_charge,0),0) + coalesce(p_adjustment,0), 0);

    insert into public.quotes (matter_id, individual_user_id, business_id, quote_number, description, amount, status, created_by, reference_number, quote_date, expiry_date, subject, currency, subtotal, discount_type, discount_value, discount_amount, tax_rate, tax_amount, shipping_charge, adjustment, total, customer_notes, terms, delivery_status, customer_decision)
    values (p_matter_id, p_individual_user_id, p_business_id, v_quote_number, coalesce(nullif(trim(p_description),''), trim(p_subject)), v_total, 'DRAFT', auth.uid(), p_reference_number, coalesce(p_quote_date,current_date), p_expiry_date, p_subject, coalesce(nullif(p_currency,''),'ZAR'), v_subtotal, upper(coalesce(p_discount_type,'PERCENT')), greatest(coalesce(p_discount_value,0),0), v_discount, greatest(coalesce(p_tax_rate,0),0), v_tax, greatest(coalesce(p_shipping_charge,0),0), coalesce(p_adjustment,0), v_total, p_customer_notes, p_terms, 'NOT_SENT', 'PENDING')
    returning id into v_quote_id;

    -- Items are inserted after the quote exists. Rebuild the list from payload.
    delete from public.quote_items where quote_id = v_quote_id;
    v_order := 1;
    for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
        v_qty := greatest(coalesce((v_item->>'quantity')::numeric,1),0);
        v_rate := greatest(coalesce((v_item->>'rate')::numeric,0),0);
        v_tax_rate := greatest(coalesce((v_item->>'tax_rate')::numeric,p_tax_rate,0),0);
        v_line := round(v_qty*v_rate,2);
        v_line_discount := case when upper(coalesce(v_item->>'discount_type','PERCENT'))='FIXED' then least(v_line,greatest(coalesce((v_item->>'discount_value')::numeric,0),0)) else round(v_line*greatest(coalesce((v_item->>'discount_value')::numeric,0),0)/100,2) end;
        v_line := greatest(v_line-v_line_discount,0);
        v_line_tax := round(v_line*v_tax_rate/100,2);
        insert into public.quote_items (quote_id,item_order,item_name,description,quantity,rate,tax_rate,discount_type,discount_value,amount)
        values (v_quote_id,v_order,coalesce(v_item->>'item_name','Service'),v_item->>'description',v_qty,v_rate,v_tax_rate,upper(coalesce(v_item->>'discount_type','PERCENT')),greatest(coalesce((v_item->>'discount_value')::numeric,0),0),round(v_line+v_line_tax,2));
        v_order:=v_order+1;
    end loop;

    return v_quote_id;
end;
$$;

revoke all on function public.create_quote_transaction(uuid,uuid,uuid,text,date,date,text,text,text,text,numeric,numeric,numeric,numeric,text,text,jsonb) from public;
grant execute on function public.create_quote_transaction(uuid,uuid,uuid,text,date,date,text,text,text,text,numeric,numeric,numeric,numeric,text,text,jsonb) to authenticated;

create or replace function public.convert_quote_to_invoice(p_quote_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    q public.quotes%rowtype;
    v_invoice_id uuid;
    v_invoice_number text;
    v_due_date date;
begin
    select * into q from public.quotes where id = p_quote_id for update;
    if q.id is null then raise exception 'Quote not found.' using errcode='P0002'; end if;
    if not (public.is_super_admin() or q.created_by = auth.uid() or public.has_staff_permission('approve_quotes')) then
        raise exception 'You are not authorised to convert this quote.' using errcode='42501';
    end if;
    if upper(coalesce(q.delivery_status,'NOT_SENT')) <> 'SENT' and upper(coalesce(q.customer_decision,'PENDING')) <> 'ACCEPTED' and upper(coalesce(q.status,'')) <> 'APPROVED' then
        raise exception 'Only an approved, sent or accepted quote can be converted to an invoice.' using errcode='23514';
    end if;

    v_invoice_number := 'INV-' || to_char(current_date,'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
    v_due_date := coalesce(q.expiry_date, current_date);

    insert into public.invoices (matter_id, quote_id, business_id, individual_user_id, invoice_number, invoice_date, due_date, currency, subject, salesperson_user_id, subtotal, discount_type, discount_value, discount_amount, tax_rate, tax_amount, shipping_charge, adjustment, total, balance_due, status, customer_notes, terms_and_conditions, created_by)
    values (q.matter_id,q.id,q.business_id,q.individual_user_id,v_invoice_number,current_date,v_due_date,coalesce(q.currency,'ZAR'),q.subject,q.salesperson_user_id,q.subtotal,q.discount_type,q.discount_value,q.discount_amount,q.tax_rate,q.tax_amount,q.shipping_charge,q.adjustment,coalesce(q.total,q.amount,0),coalesce(q.total,q.amount,0),'DRAFT',q.customer_notes,q.terms,auth.uid())
    returning id into v_invoice_id;

    insert into public.invoice_items (invoice_id,item_order,item_name,description,quantity,rate,tax_rate,discount_type,discount_value,amount)
    select v_invoice_id,item_order,item_name,description,quantity,rate,tax_rate,discount_type,discount_value,amount from public.quote_items where quote_id=q.id order by item_order;

    update public.quotes set converted_invoice_id=v_invoice_id, status='APPROVED', customer_decision=case when customer_decision='ACCEPTED' then 'ACCEPTED' else customer_decision end, updated_by=auth.uid(), updated_at=now() where id=q.id;
    return v_invoice_id;
end;
$$;

revoke all on function public.convert_quote_to_invoice(uuid) from public;
grant execute on function public.convert_quote_to_invoice(uuid) to authenticated;
