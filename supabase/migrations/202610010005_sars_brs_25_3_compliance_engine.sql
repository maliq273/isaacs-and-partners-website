create table if not exists public.sars_payroll_compliance_runs (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 payroll_run_id uuid references public.hr_payroll_runs(id) on delete set null,
 brs_version text not null default '25.3.0',
 transaction_year integer not null,
 reconciliation_period text not null,
 environment text not null check(environment in ('TEST','LIVE')),
 status text not null default 'DRAFT',
 validation_report jsonb not null default '{}'::jsonb,
 reconciliation_pack jsonb not null default '{}'::jsonb,
 artifact_paths jsonb not null default '[]'::jsonb,
 source_snapshot_hash text,
 created_by uuid references public.profiles(id),
 created_at timestamptz not null default now(),
 finalized_at timestamptz
);
create table if not exists public.sars_payroll_certificate_events (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 employee_id uuid references public.hr_employees(id) on delete set null,
 compliance_run_id uuid references public.sars_payroll_compliance_runs(id) on delete set null,
 certificate_number text,
 certificate_type text not null,
 event_type text not null check(event_type in ('ISSUED','CANCELLED','REPLACED')),
 replacement_certificate_number text,
 reason text,
 certificate_snapshot jsonb not null default '{}'::jsonb,
 created_by uuid references public.profiles(id),
 created_at timestamptz not null default now()
);
create unique index if not exists sars_cert_number_unique on public.sars_payroll_certificate_events(certificate_number) where certificate_number is not null;
create table if not exists public.sars_payroll_audit (
 id uuid primary key default gen_random_uuid(),
 compliance_run_id uuid references public.sars_payroll_compliance_runs(id) on delete restrict,
 business_id uuid not null references public.businesses(id) on delete restrict,
 actor_user_id uuid references public.profiles(id),
 action text not null,
 environment text not null,
 request_hash text not null,
 payload_hash text not null,
 result_hash text,
 previous_audit_hash text,
 audit_hash text not null,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists sars_audit_run_idx on public.sars_payroll_audit(compliance_run_id,created_at);
create table if not exists public.sars_emp201_reconciliation (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 tax_period text not null,
 transaction_year integer not null,
 declaration jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(business_id,tax_period,transaction_year)
);
create table if not exists public.sars_emp501_reconciliation (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 compliance_run_id uuid references public.sars_payroll_compliance_runs(id) on delete cascade,
 transaction_year integer not null,
 reconciliation_period text not null,
 monthly_data jsonb not null default '[]'::jsonb,
 certificate_totals jsonb not null default '{}'::jsonb,
 declared_totals jsonb not null default '{}'::jsonb,
 payment_totals jsonb not null default '{}'::jsonb,
 differences jsonb not null default '[]'::jsonb,
 status text not null default 'DRAFT',
 created_at timestamptz not null default now()
);
create table if not exists public.sars_emp601_cancellations (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 certificate_number text not null,
 cancellation_reason text not null,
 replacement_certificate_number text,
 declaration jsonb not null default '{}'::jsonb,
 created_by uuid references public.profiles(id),
 created_at timestamptz not null default now()
);
alter table public.sars_payroll_compliance_runs enable row level security;
alter table public.sars_payroll_certificate_events enable row level security;
alter table public.sars_payroll_audit enable row level security;
alter table public.sars_emp201_reconciliation enable row level security;
alter table public.sars_emp501_reconciliation enable row level security;
alter table public.sars_emp601_cancellations enable row level security;
create or replace function public.sars_payroll_audit_immutable() returns trigger language plpgsql security invoker as $$
begin raise exception 'SARS audit trail is immutable'; end $$;
drop trigger if exists trg_sars_audit_immutable on public.sars_payroll_audit;
create trigger trg_sars_audit_immutable before update or delete on public.sars_payroll_audit for each row execute function public.sars_payroll_audit_immutable();