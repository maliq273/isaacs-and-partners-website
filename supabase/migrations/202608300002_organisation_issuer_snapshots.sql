-- PR30: issuer snapshots for historical quotes and invoices.
-- The active organisation profile remains the live source of truth; a snapshot
-- is captured when a quote or invoice row is first created so historical PDFs
-- do not change when the organisation profile is later amended.

alter table if exists public.quotes add column if not exists issuer_snapshot jsonb;
alter table if exists public.invoices add column if not exists issuer_snapshot jsonb;

create or replace function public.capture_organisation_issuer_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare p public.organisation_profiles%rowtype;
begin
    if new.issuer_snapshot is not null then return new; end if;
    select * into p from public.organisation_profiles where is_active order by updated_at desc limit 1;
    if not found then return new; end if;
    new.issuer_snapshot := jsonb_build_object(
        'legal_name',p.legal_name,
        'trading_name',p.trading_name,
        'entity_type',p.entity_type,
        'registration_number',p.registration_number,
        'cipc_number',p.cipc_number,
        'income_tax_number',p.income_tax_number,
        'vat_registered',p.vat_registered,
        'vat_number',p.vat_number,
        'vat_effective_date',p.vat_effective_date,
        'registered_address',p.registered_address,
        'physical_address',p.physical_address,
        'postal_address',p.postal_address,
        'city',p.city,
        'province',p.province,
        'postal_code',p.postal_code,
        'country',p.country,
        'phone',p.phone,
        'whatsapp',p.whatsapp,
        'email',p.email,
        'billing_email',p.billing_email,
        'accounts_email',p.accounts_email,
        'website',p.website,
        'bank_name',p.bank_name,
        'account_holder',p.account_holder,
        'account_number',p.account_number,
        'account_type',p.account_type,
        'branch_code',p.branch_code,
        'swift_code',p.swift_code,
        'logo_url',p.logo_url,
        'currency',p.default_currency,
        'vat_rate',p.default_vat_rate,
        'captured_at',now()
    );
    return new;
end;
$$;

drop trigger if exists quotes_capture_organisation_issuer on public.quotes;
create trigger quotes_capture_organisation_issuer before insert on public.quotes for each row execute function public.capture_organisation_issuer_snapshot();
drop trigger if exists invoices_capture_organisation_issuer on public.invoices;
create trigger invoices_capture_organisation_issuer before insert on public.invoices for each row execute function public.capture_organisation_issuer_snapshot();

comment on column public.quotes.issuer_snapshot is 'Immutable issuer details captured from the active Isaacs & Partners organisation profile when the quote is created.';
comment on column public.invoices.issuer_snapshot is 'Immutable issuer details captured from the active Isaacs & Partners organisation profile when the invoice is created.';
