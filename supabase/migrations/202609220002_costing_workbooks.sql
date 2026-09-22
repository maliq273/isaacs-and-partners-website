-- Costing Workbooks: persistent Excel-style calculation sheets for Super Admin.
create table if not exists public.service_costing_workbooks (
 id uuid primary key default gen_random_uuid(),
 template_key text not null unique,
 name text not null,
 formula_version text not null,
 data jsonb not null default '{}'::jsonb,
 active boolean not null default true,
 updated_by uuid,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists idx_service_costing_workbooks_active on public.service_costing_workbooks(active,template_key);
alter table public.service_costing_workbooks enable row level security;
drop policy if exists service_costing_workbooks_admin_all on public.service_costing_workbooks;
create policy service_costing_workbooks_admin_all on public.service_costing_workbooks
for all to authenticated
using (exists(select 1 from public.authority_directory a where a.user_id=auth.uid() and a.is_active=true and a.authority_role='SUPER_ADMIN'))
with check (exists(select 1 from public.authority_directory a where a.user_id=auth.uid() and a.is_active=true and a.authority_role='SUPER_ADMIN'));
grant select,insert,update on public.service_costing_workbooks to authenticated;
