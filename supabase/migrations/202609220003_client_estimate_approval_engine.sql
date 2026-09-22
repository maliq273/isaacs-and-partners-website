create table if not exists public.service_qualification_questions (
 id uuid primary key default gen_random_uuid(), service_code text not null, question_key text not null, question_text text not null,
 input_type text not null default 'TEXT', options jsonb not null default '[]'::jsonb, required boolean not null default true,
 sort_order integer not null default 0, active boolean not null default true, created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), unique(service_code,question_key)
);
create table if not exists public.client_estimates (
 id uuid primary key default gen_random_uuid(), client_user_id uuid references auth.users(id) on delete cascade,
 business_id uuid references public.businesses(id) on delete set null, service_id uuid references public.service_catalog(id) on delete set null,
 service_code text not null, service_name text not null,
 status text not null default 'QUALIFYING' check(status in ('QUALIFYING','ESTIMATE_READY','AWAITING_APPROVAL','MODIFICATION_REQUESTED','REJECTED','APPROVED','QUOTE_CREATED','INVOICE_CREATED')),
 request_data jsonb not null default '{}'::jsonb, qualifying_answers jsonb not null default '{}'::jsonb,
 research_snapshot jsonb not null default '{}'::jsonb, rough_low numeric(14,2), rough_high numeric(14,2),
 rough_currency text not null default 'ZAR', rough_disclaimer text not null default 'Indicative estimate only — not a final quotation.',
 internal_costing_snapshot jsonb not null default '{}'::jsonb, proposed_total numeric(14,2), approved_total numeric(14,2),
 approval_notes text, approved_by uuid references auth.users(id) on delete set null, approved_at timestamptz,
 quote_id uuid references public.quotes(id) on delete set null, invoice_id uuid references public.invoices(id) on delete set null,
 document_path text, document_type text check(document_type in ('QUOTE_PDF','INVOICE_PDF')),
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists client_estimates_client_idx on public.client_estimates(client_user_id,created_at desc);
create index if not exists client_estimates_status_idx on public.client_estimates(status,updated_at desc);
create table if not exists public.commercial_approval_actions (
 id uuid primary key default gen_random_uuid(), estimate_id uuid not null references public.client_estimates(id) on delete cascade,
 action text not null check(action in ('APPROVE','MODIFY','REJECT')), actor_user_id uuid references auth.users(id) on delete set null,
 actor_phone text, notes text, before_status text, after_status text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
alter table public.service_qualification_questions enable row level security;
alter table public.client_estimates enable row level security;
alter table public.commercial_approval_actions enable row level security;
drop policy if exists service_questions_authenticated_read on public.service_qualification_questions;
create policy service_questions_authenticated_read on public.service_qualification_questions for select to authenticated using(active=true);
drop policy if exists estimates_super_admin_all on public.client_estimates;
create policy estimates_super_admin_all on public.client_estimates for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
drop policy if exists approval_actions_super_admin_read on public.commercial_approval_actions;
create policy approval_actions_super_admin_read on public.commercial_approval_actions for select to authenticated using(public.is_super_admin());
drop view if exists public.client_estimates_public;
create view public.client_estimates_public as select id,client_user_id,business_id,service_id,service_code,service_name,status,request_data,qualifying_answers,rough_low,rough_high,rough_currency,rough_disclaimer,proposed_total,approved_total,approved_at,quote_id,invoice_id,document_type,created_at,updated_at from public.client_estimates where client_user_id=auth.uid();
revoke all on public.client_estimates_public from anon;
grant select on public.client_estimates_public to authenticated;
insert into storage.buckets(id,name,public) values('commercial-documents','commercial-documents',false) on conflict(id) do nothing;
insert into public.service_qualification_questions(service_code,question_key,question_text,input_type,required,sort_order) values
('TEMP_OUTSOURCING','position','What position or role is required?','TEXT',true,10),
('TEMP_OUTSOURCING','employees','How many employees are required?','NUMBER',true,20),
('TEMP_OUTSOURCING','nt_rate','What normal-time hourly rate should be used?','NUMBER',true,30),
('TEMP_OUTSOURCING','nt_hours','How many normal-time hours are expected?','NUMBER',true,40),
('TEMP_OUTSOURCING','ot_hours','How many overtime hours are expected?','NUMBER',false,50),
('TEMP_OUTSOURCING','sunday_hours','How many Sunday hours are expected?','NUMBER',false,60),
('TEMP_OUTSOURCING','public_holiday_hours','How many public-holiday hours are expected?','NUMBER',false,70),
('TEMP_OUTSOURCING','retail_sunday','Is Sunday a normal working day for this retail operation?','BOOLEAN',false,80),
('TEMP_OUTSOURCING','medical_test','Include medical testing?','BOOLEAN',false,90),
('TEMP_OUTSOURCING','ppe','Include PPE?','BOOLEAN',false,100),
('PERM_OUTSOURCING','position','What position is being recruited?','TEXT',true,10),
('PERM_OUTSOURCING','monthly_salary','What monthly salary is being offered?','NUMBER',true,20),
('PERM_OUTSOURCING','employees','How many employees are required?','NUMBER',true,30),
('FOREIGNER_EMPLOYMENT_OFFER','monthly_retainer_months','How many months should the retainer run?','NUMBER',true,10),
('FOREIGNER_EMPLOYMENT_OFFER','repatriation_reserve','Use the standard repatriation reserve?','BOOLEAN',true,20),
('BUSINESS_COMPLIANCE','services','Which separate compliance services are required?','MULTISELECT',true,10),
('IMMIGRATION','visa_category','What immigration/visa category are you seeking?','TEXT',true,10),
('IMMIGRATION','applicant_count','How many applicants/dependants are included?','NUMBER',true,20),
('IMMIGRATION','current_status','What is the applicant''s current South African status?','TEXT',true,30),
('IMMIGRATION','refusal_or_appeal','Is there an existing refusal, appeal or review issue?','BOOLEAN',false,40)
on conflict(service_code,question_key) do update set question_text=excluded.question_text,input_type=excluded.input_type,required=excluded.required,sort_order=excluded.sort_order,active=true,updated_at=now();