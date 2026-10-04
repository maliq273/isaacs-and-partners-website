alter table public.hr_employees add column if not exists sars_profile jsonb not null default '{}'::jsonb;
alter table public.hr_payroll_entries add column if not exists brs_source_codes jsonb not null default '{}'::jsonb;
alter table public.hr_payroll_entries add column if not exists eti_months jsonb not null default '{}'::jsonb;
alter table public.hr_payroll_entries add column if not exists certificate_type text not null default 'IRP5';
alter table public.hr_payroll_entries add column if not exists certificate_number text;
create table if not exists public.sars_payroll_export_runs (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 payroll_run_id uuid references public.hr_payroll_runs(id) on delete set null,
 brs_version text not null default '25.3.0',
 certificate_type text not null default 'IRP5',
 reconciliation_period text not null,
 transaction_year integer not null,
 environment text not null default 'TEST',
 status text not null default 'VALIDATION_FAILED',
 validation_errors jsonb not null default '[]'::jsonb,
 validation_warnings jsonb not null default '[]'::jsonb,
 employee_count integer not null default 0,
 export_path text,
 source_snapshot jsonb not null default '{}'::jsonb,
 created_by uuid references public.profiles(id),
 created_at timestamptz not null default now()
);
alter table public.sars_payroll_export_runs enable row level security;
drop policy if exists sars_payroll_export_owner on public.sars_payroll_export_runs;
create policy sars_payroll_export_owner on public.sars_payroll_export_runs for all to authenticated
using (exists(select 1 from public.businesses b where b.id=sars_payroll_export_runs.business_id and b.owner_user_id=(select auth.uid())) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN')))
with check (exists(select 1 from public.businesses b where b.id=sars_payroll_export_runs.business_id and b.owner_user_id=(select auth.uid())) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN')));\nalter table public.businesses add column if not exists sars_profile jsonb not null default '{}'::jsonb;\n