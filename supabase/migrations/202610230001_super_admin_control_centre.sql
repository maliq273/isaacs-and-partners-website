begin;

-- Vendor ledger: source records are separate from customer receivables.
create table if not exists public.ap_vendors (
 id uuid primary key default gen_random_uuid(),
 vendor_name text not null,
 contact_name text,
 email text,
 phone text,
 registration_number text,
 vat_number text,
 payment_terms_days integer not null default 30 check(payment_terms_days between 0 and 365),
 bank_reference text,
 notes text,
 active boolean not null default true,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists ap_vendors_name_uq on public.ap_vendors(lower(vendor_name));

create table if not exists public.ap_vendor_invoices (
 id uuid primary key default gen_random_uuid(),
 vendor_id uuid not null references public.ap_vendors(id) on delete restrict,
 supplier_invoice_number text not null,
 invoice_date date not null default current_date,
 due_date date not null,
 description text not null,
 currency text not null default 'ZAR' check(currency='ZAR'),
 subtotal numeric(14,2) not null check(subtotal>=0),
 tax_amount numeric(14,2) not null default 0 check(tax_amount>=0),
 total_amount numeric(14,2) generated always as (round(subtotal+tax_amount,2)) stored,
 status text not null default 'RECORDED' check(status in ('RECORDED','APPROVED','PART_PAID','PAID','DISPUTED','VOID')),
 attachment_path text,
 notes text,
 recorded_by uuid references auth.users(id) on delete set null,
 approved_by uuid references auth.users(id) on delete set null,
 approved_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(vendor_id,supplier_invoice_number)
);
create index if not exists ap_vendor_invoices_due_idx on public.ap_vendor_invoices(due_date,status);

create table if not exists public.ap_vendor_payments (
 id uuid primary key default gen_random_uuid(),
 vendor_invoice_id uuid not null references public.ap_vendor_invoices(id) on delete restrict,
 amount numeric(14,2) not null check(amount>0),
 payment_date date not null default current_date,
 payment_method text not null default 'BANK_TRANSFER',
 reference text not null,
 notes text,
 recorded_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 unique(reference)
);
create index if not exists ap_vendor_payments_invoice_idx on public.ap_vendor_payments(vendor_invoice_id,payment_date);

create table if not exists public.ap_vendor_audit (
 id bigint generated always as identity primary key,
 actor_user_id uuid references auth.users(id) on delete set null,
 action text not null,
 entity_type text not null,
 entity_id uuid,
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists ap_vendor_audit_created_idx on public.ap_vendor_audit(created_at desc);

alter table public.ap_vendors enable row level security;
alter table public.ap_vendor_invoices enable row level security;
alter table public.ap_vendor_payments enable row level security;
alter table public.ap_vendor_audit enable row level security;

drop policy if exists ap_vendors_super_admin_all on public.ap_vendors;
create policy ap_vendors_super_admin_all on public.ap_vendors for all to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN' and p.is_active))
with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN' and p.is_active));
drop policy if exists ap_vendor_invoices_super_admin_all on public.ap_vendor_invoices;
create policy ap_vendor_invoices_super_admin_all on public.ap_vendor_invoices for all to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN' and p.is_active))
with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN' and p.is_active));
drop policy if exists ap_vendor_payments_super_admin_all on public.ap_vendor_payments;
create policy ap_vendor_payments_super_admin_all on public.ap_vendor_payments for all to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN' and p.is_active))
with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN' and p.is_active));
drop policy if exists ap_vendor_audit_super_admin_read on public.ap_vendor_audit;
create policy ap_vendor_audit_super_admin_read on public.ap_vendor_audit for select to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN' and p.is_active));
revoke insert,update,delete on public.ap_vendor_audit from authenticated;
grant select on public.ap_vendor_audit to authenticated;

-- Durable memory is curated by Super Admin. Only general, non-client-specific
-- notes may be marked eligible for the optional external model.
create table if not exists public.anthony_memory_entries (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 memory_text text not null,
 category text not null default 'WORKFLOW' check(category in ('PREFERENCE','WORKFLOW','PROJECT','GENERAL')),
 sensitivity text not null default 'INTERNAL' check(sensitivity in ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED')),
 grok_eligible boolean not null default false,
 active boolean not null default true,
 created_by uuid references auth.users(id) on delete set null,
 updated_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint anthony_memory_external_scope check (not grok_eligible or (sensitivity='INTERNAL' and category in ('PREFERENCE','WORKFLOW','GENERAL')))
);
create index if not exists anthony_memory_active_idx on public.anthony_memory_entries(active,category,updated_at desc);
create table if not exists public.anthony_memory_audit (
 id bigint generated always as identity primary key,
 memory_id uuid,
 actor_user_id uuid references auth.users(id) on delete set null,
 action text not null check(action in ('CREATE','UPDATE','ARCHIVE','GROK_REQUEST')),
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table public.anthony_memory_entries enable row level security;
alter table public.anthony_memory_audit enable row level security;
drop policy if exists anthony_memory_super_admin_all on public.anthony_memory_entries;
create policy anthony_memory_super_admin_all on public.anthony_memory_entries for all to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN' and p.is_active))
with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN' and p.is_active));
drop policy if exists anthony_memory_audit_super_admin_read on public.anthony_memory_audit;
create policy anthony_memory_audit_super_admin_read on public.anthony_memory_audit for select to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN' and p.is_active));
revoke insert,update,delete on public.anthony_memory_audit from authenticated;
grant select on public.anthony_memory_audit to authenticated;

-- Public-facing availability exposes only slot times and types, never internal matter notes.
create table if not exists public.appointment_availability_slots (
 id uuid primary key default gen_random_uuid(),
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 appointment_type text not null default 'CONSULTATION' check(appointment_type in ('CONSULTATION','HEARING','SITE_VISIT','MEETING','OTHER')),
 delivery_mode text not null default 'physical' check(delivery_mode in ('physical','online','phone')),
 public_label text not null default 'Appointment available',
 active boolean not null default true,
 booked_appointment_id uuid references public.appointments(id) on delete set null,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint appointment_slot_order check(ends_at>starts_at)
);
create index if not exists appointment_slots_available_idx on public.appointment_availability_slots(active,starts_at) where booked_appointment_id is null;
alter table public.appointment_availability_slots enable row level security;
drop policy if exists appointment_slots_public_read on public.appointment_availability_slots;
create policy appointment_slots_public_read on public.appointment_availability_slots for select to anon,authenticated
using(active=true and booked_appointment_id is null and starts_at>now());
drop policy if exists appointment_slots_super_admin_all on public.appointment_availability_slots;
create policy appointment_slots_super_admin_all on public.appointment_availability_slots for all to authenticated
using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN' and p.is_active))
with check(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN' and p.is_active));

-- Statement query is a RLS-respecting view. Payment totals come only from the
-- existing payment ledger; the status of a payment remains authoritative.
create or replace view public.customer_statement_lines with (security_invoker=true) as
select i.id as invoice_id,i.individual_user_id,i.business_id,i.invoice_number,
       coalesce(i.issued_at::date,i.invoice_date) as transaction_date,
       coalesce(i.description,i.subject,'Invoice') as description,
       coalesce(i.total,i.amount,0)::numeric(14,2) as invoice_total,
       coalesce(p.paid_total,0)::numeric(14,2) as verified_paid,
       greatest(coalesce(i.total,i.amount,0)-coalesce(p.paid_total,0),0)::numeric(14,2) as balance_due,
       i.status as invoice_status,i.due_date
from public.invoices i
left join (
 select invoice_id,sum(amount)::numeric(14,2) as paid_total
 from public.payments where status='COMPLETED' group by invoice_id
) p on p.invoice_id=i.id
where i.status not in ('DRAFT','VOID');

grant select on public.customer_statement_lines to authenticated;

-- Add the optional provider name to the existing Vault allowlist. API keys are
-- written only through the existing admin_secret_store endpoint.
notify pgrst,'reload schema';
commit;
