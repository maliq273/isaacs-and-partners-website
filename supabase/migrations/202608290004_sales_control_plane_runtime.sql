-- Isaacs & Partners
-- Sales control-plane runtime repair.
--
-- The browser sales controllers use Supabase RPCs and the invoice_date column.
-- This migration is intentionally idempotent and runs after the 20260829 sales
-- foundation/RPC migrations. It repairs partially-created remote schemas and
-- explicitly reloads the PostgREST schema cache after DDL.

begin;

-- -----------------------------------------------------------------------------
-- Invoice compatibility: older environments may have an invoices table with
-- only the original amount/status fields. Keep the table and add the columns
-- required by the live invoice controller.
-- -----------------------------------------------------------------------------
alter table if exists public.invoices
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

-- Existing rows must not be invalidated by the repair. Populate financial
-- defaults only where the corresponding values are currently null.
update public.invoices
set
    invoice_date = coalesce(invoice_date, current_date),
    currency = coalesce(nullif(currency, ''), 'ZAR'),
    subtotal = coalesce(subtotal, coalesce(amount, 0)),
    discount_type = coalesce(discount_type, 'PERCENT'),
    discount_value = coalesce(discount_value, 0),
    discount_amount = coalesce(discount_amount, 0),
    tax_rate = coalesce(tax_rate, 0),
    tax_amount = coalesce(tax_amount, 0),
    shipping_charge = coalesce(shipping_charge, 0),
    adjustment = coalesce(adjustment, 0),
    total = coalesce(total, coalesce(amount, 0)),
    amount_paid = coalesce(amount_paid, 0),
    balance_due = coalesce(balance_due, greatest(coalesce(total, amount, 0) - coalesce(amount_paid, 0), 0)),
    status = coalesce(nullif(status, ''), 'DRAFT'),
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now())
where true;

create unique index if not exists invoices_invoice_number_uidx
    on public.invoices(invoice_number)
    where invoice_number is not null;

create index if not exists invoices_invoice_date_idx
    on public.invoices(invoice_date desc, created_at desc);

-- -----------------------------------------------------------------------------
-- Runtime contract checks.
-- Fail the migration with a useful message rather than leaving the browser
-- pointing at a missing RPC.
-- -----------------------------------------------------------------------------
do $$
begin
    if to_regclass('public.quotes') is null then
        raise exception 'Sales runtime repair requires public.quotes. Apply the 20260829 quote/invoice foundation migration first.';
    end if;

    if to_regclass('public.quote_items') is null then
        raise exception 'Sales runtime repair requires public.quote_items. Apply the 202608290001 sales foundation migration first.';
    end if;

    if to_regclass('public.invoices') is null then
        raise exception 'Sales runtime repair requires public.invoices. Apply the 202608290001 sales foundation migration first.';
    end if;

    if to_regprocedure('public.create_quote_transaction(uuid,uuid,uuid,text,date,date,text,text,text,text,numeric,numeric,numeric,numeric,text,text,jsonb)') is null then
        raise exception 'Missing public.create_quote_transaction(uuid,uuid,uuid,text,date,date,text,text,text,text,numeric,numeric,numeric,numeric,text,text,jsonb). Apply 202608290002_sales_transaction_rpc.sql.';
    end if;

    if to_regprocedure('public.create_invoice_transaction(uuid,uuid,uuid,uuid,text,date,text,date,text,text,text,numeric,numeric,numeric,numeric,text,text,jsonb)') is null then
        raise exception 'Missing public.create_invoice_transaction(uuid,uuid,uuid,uuid,text,date,text,date,text,text,text,numeric,numeric,numeric,numeric,text,text,jsonb). Apply 202608290002_sales_transaction_rpc.sql.';
    end if;
end;
$$;

-- PostgREST can retain a stale schema cache after a migration creates or
-- replaces RPCs/columns. Explicitly request a reload so the browser sees the
-- same contract immediately after db push completes.
notify pgrst, 'reload schema';

commit;
