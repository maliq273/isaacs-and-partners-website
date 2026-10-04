create table if not exists public.client_document_catalog (
 id uuid primary key default gen_random_uuid(),
 document_code text unique not null,
 category text not null,
 title text not null,
 description text,
 audience text not null default 'CLIENT',
 required_for_services text[] not null default '{}',
 acknowledgement_required boolean not null default false,
 active boolean not null default true,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.client_document_catalog enable row level security;
drop policy if exists client_document_catalog_read on public.client_document_catalog;
create policy client_document_catalog_read on public.client_document_catalog for select to authenticated using (active=true);
insert into public.client_document_catalog(document_code,category,title,description,required_for_services,acknowledgement_required)
values
('IP-SLA-HR','SERVICE_LEVEL_AGREEMENT','Isaacs & Partners HR/IR Service Level Agreement','Master service-level agreement governing HR and Industrial Relations services.','{HR-EMPLOYMENT-CONTRACTS,HR-HR-POLICIES,HR-DISCIPLINARY-HEARINGS,HR-CHAIRPERSON-SERVICES,HR-GRIEVANCE-HEARINGS,HR-PERFORMANCE-MANAGEMENT,HR-RETRENCHMENT-CONSULTING,HR-CCMA-REPRESENTATION}',true),
('IP-RETAINER-HR','RETAINER','Isaacs & Partners HR/IR Retainer Agreement','Retainer terms for recurring HR and Industrial Relations support.','{HR-HR-POLICIES,HR-PERFORMANCE-MANAGEMENT,HR-RETRENCHMENT-CONSULTING}',true),
('IP-TEMP-PLACEMENT','PLACEMENT_CONTRACT','Temporary Placement Agreement','Temporary staffing / placement agreement for client approval and signature.','{}',true),
('IP-PERM-PLACEMENT','PLACEMENT_CONTRACT','Permanent Placement Agreement','Permanent recruitment / placement agreement for client approval and signature.','{}',true),
('IP-CONFIDENTIALITY-HR','CONFIDENTIALITY','HR Confidentiality & Data Handling Terms','Confidentiality and POPIA-related handling terms for HR records.','{}',true)
on conflict(document_code) do update set title=excluded.title,description=excluded.description,required_for_services=excluded.required_for_services,acknowledgement_required=excluded.acknowledgement_required,active=true,updated_at=now();
notify pgrst,'reload schema';