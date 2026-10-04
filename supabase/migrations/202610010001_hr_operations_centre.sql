-- HR operations centre: client legal/billing profile, document centre, payroll and branded document registry.
-- Current SARS 2027 tax year basis: 1 March 2026 - 28 February 2027.
create table if not exists public.client_legal_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  client_number text unique,
  client_type text not null default 'INDIVIDUAL',
  legal_name text,
  trading_name text,
  id_number text,
  passport_number text,
  nationality text,
  date_of_birth date,
  email text,
  phone text,
  whatsapp text,
  physical_address text,
  postal_address text,
  billing_email text,
  billing_contact_name text,
  billing_contact_phone text,
  company_registration_number text,
  tax_number text,
  vat_number text,
  paye_reference text,
  uif_reference text,
  sdl_reference text,
  preferred_currency text not null default 'ZAR',
  payment_terms text not null default '50% deposit before work starts; balance before final submission/delivery unless otherwise approved',
  legal_recovery_address text,
  legal_recovery_email text,
  legal_recovery_phone text,
  responsible_person_name text,
  responsible_person_id_number text,
  popia_consent boolean not null default false,
  profile_completeness numeric(5,2) not null default 0,
  profile_status text not null default 'INCOMPLETE',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.client_legal_profiles enable row level security;
drop policy if exists client_legal_profile_owner on public.client_legal_profiles;
create policy client_legal_profile_owner on public.client_legal_profiles for all to authenticated
using (user_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN')))
with check (user_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN')));

create table if not exists public.hr_document_templates (
  id uuid primary key default gen_random_uuid(),
  template_code text unique not null,
  service_code text not null,
  name text not null,
  description text,
  document_format text not null default 'DOCX_AND_PDF',
  required_answers text[] not null default '{}',
  active boolean not null default true,
  version text not null default '1.0.0',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.hr_document_templates enable row level security;
drop policy if exists hr_document_templates_read on public.hr_document_templates;
create policy hr_document_templates_read on public.hr_document_templates for select to authenticated using (active=true);

insert into public.hr_document_templates(template_code,service_code,name,description,required_answers,metadata)
values
('HR-CONTRACT-FULLTIME-PERMANENT','HR-EMPLOYMENT-CONTRACTS','Full-Time Permanent Employment Contract','Isaacs & Partners branded permanent full-time employment agreement.',
 array['customer_type','employment_relationship','employee_count','role_or_category','remuneration','working_hours','employee_full_name','employee_id_or_passport','start_date','job_duties'],
 jsonb_build_object('employment_type','FULL_TIME_PERMANENT','brand','ISAACS_AND_PARTNERS')),
('HR-CONTRACT-TEMPORARY','HR-EMPLOYMENT-CONTRACTS','Temporary Employment Contract','Isaacs & Partners branded temporary employment agreement.',
 array['customer_type','employment_relationship','employee_count','role_or_category','remuneration','working_hours','employee_full_name','employee_id_or_passport','start_date','end_date','job_duties'],
 jsonb_build_object('employment_type','TEMPORARY','brand','ISAACS_AND_PARTNERS')),
('HR-CONTRACT-PROJECT','HR-EMPLOYMENT-CONTRACTS','Project-Based Employment Contract','Isaacs & Partners branded project-based employment agreement.',
 array['customer_type','employment_relationship','employee_count','role_or_category','remuneration','working_hours','employee_full_name','employee_id_or_passport','start_date','end_date','project_scope','job_duties'],
 jsonb_build_object('employment_type','PROJECT_BASED','brand','ISAACS_AND_PARTNERS')),
('HR-CONTRACT-FULLTIME-FIXEDTERM','HR-EMPLOYMENT-CONTRACTS','Full-Time Fixed-Term Employment Contract','Isaacs & Partners branded full-time fixed-term employment agreement.',
 array['customer_type','employment_relationship','employee_count','role_or_category','remuneration','working_hours','employee_full_name','employee_id_or_passport','start_date','end_date','job_duties'],
 jsonb_build_object('employment_type','FULL_TIME_FIXED_TERM','brand','ISAACS_AND_PARTNERS')),
('HR-DISCIPLINARY-WARNING','HR-DISCIPLINARY-HEARINGS','Written Warning','Isaacs & Partners branded written warning.',
 array['party_role','allegation_or_issue','incident_date','employee_full_name','employee_id_or_passport','date_of_warning','warning_valid_until','facts','employee_response','policy_breached','corrective_action'],
 jsonb_build_object('disciplinary_document','WRITTEN_WARNING','brand','ISAACS_AND_PARTNERS')),
('HR-DISCIPLINARY-FINAL-WARNING','HR-DISCIPLINARY-HEARINGS','Final Written Warning','Isaacs & Partners branded final written warning.',
 array['party_role','allegation_or_issue','incident_date','employee_full_name','employee_id_or_passport','date_of_warning','warning_valid_until','facts','employee_response','policy_breached','corrective_action','prior_warnings'],
 jsonb_build_object('disciplinary_document','FINAL_WRITTEN_WARNING','brand','ISAACS_AND_PARTNERS')),
('HR-DISCIPLINARY-NOTICE','HR-DISCIPLINARY-HEARINGS','Notice to Attend Disciplinary Hearing','Isaacs & Partners branded notice to attend disciplinary hearing.',
 array['party_role','allegation_or_issue','incident_date','employee_full_name','employee_id_or_passport','hearing_date','hearing_time','hearing_location','charges','employee_rights'],
 jsonb_build_object('disciplinary_document','NOTICE_TO_ATTEND','brand','ISAACS_AND_PARTNERS'))
on conflict(template_code) do update set name=excluded.name,description=excluded.description,required_answers=excluded.required_answers,metadata=excluded.metadata,updated_at=now();

alter table public.service_catalog add column if not exists document_generation_policy jsonb not null default '{}'::jsonb;
update public.service_catalog set document_generation_policy=jsonb_build_object(
 'enabled',true,'questionnaire_mode','ANTHONY_SELF_POPULATING',
 'template_codes',case code
   when 'HR-EMPLOYMENT-CONTRACTS' then jsonb_build_array('HR-CONTRACT-FULLTIME-PERMANENT','HR-CONTRACT-TEMPORARY','HR-CONTRACT-PROJECT','HR-CONTRACT-FULLTIME-FIXEDTERM')
   when 'HR-DISCIPLINARY-HEARINGS' then jsonb_build_array('HR-DISCIPLINARY-WARNING','HR-DISCIPLINARY-FINAL-WARNING','HR-DISCIPLINARY-NOTICE')
   else '[]'::jsonb end,
 'human_review_required',true
) where code in ('HR-EMPLOYMENT-CONTRACTS','HR-DISCIPLINARY-HEARINGS');

alter table public.matters add column if not exists client_profile_snapshot jsonb not null default '{}'::jsonb;

create table if not exists public.hr_employees (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  employee_number text not null,
  first_name text not null,
  last_name text not null,
  id_number text,
  passport_number text,
  tax_number text,
  date_of_birth date,
  nationality text,
  employment_type text not null default 'PERMANENT',
  employment_status text not null default 'ACTIVE',
  start_date date,
  end_date date,
  job_title text,
  department text,
  pay_frequency text not null default 'MONTHLY',
  basic_salary numeric(14,2) not null default 0,
  bank_account_last4 text,
  medical_dependants integer not null default 0,
  age integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(business_id,employee_number)
);
alter table public.hr_employees enable row level security;
drop policy if exists hr_employees_business_owner on public.hr_employees;
create policy hr_employees_business_owner on public.hr_employees for all to authenticated
using (exists(select 1 from public.businesses b where b.id=hr_employees.business_id and b.owner_user_id=(select auth.uid())) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN')))
with check (exists(select 1 from public.businesses b where b.id=hr_employees.business_id and b.owner_user_id=(select auth.uid())) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN')));

create table if not exists public.hr_payroll_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  pay_date date,
  tax_year integer not null default 2027,
  status text not null default 'DRAFT',
  rules_version text not null default 'SARS-2027',
  total_gross numeric(14,2) not null default 0,
  total_paye numeric(14,2) not null default 0,
  total_uif_employee numeric(14,2) not null default 0,
  total_uif_employer numeric(14,2) not null default 0,
  total_sdl numeric(14,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.hr_payroll_runs enable row level security;
drop policy if exists hr_payroll_runs_business_owner on public.hr_payroll_runs;
create policy hr_payroll_runs_business_owner on public.hr_payroll_runs for all to authenticated
using (exists(select 1 from public.businesses b where b.id=hr_payroll_runs.business_id and b.owner_user_id=(select auth.uid())) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN')))
with check (exists(select 1 from public.businesses b where b.id=hr_payroll_runs.business_id and b.owner_user_id=(select auth.uid())) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN')));

create table if not exists public.hr_payroll_entries (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.hr_payroll_runs(id) on delete cascade,
  employee_id uuid not null references public.hr_employees(id) on delete cascade,
  gross_pay numeric(14,2) not null default 0,
  taxable_income numeric(14,2) not null default 0,
  paye numeric(14,2) not null default 0,
  uif_employee numeric(14,2) not null default 0,
  uif_employer numeric(14,2) not null default 0,
  sdl numeric(14,2) not null default 0,
  net_pay numeric(14,2) not null default 0,
  earnings jsonb not null default '{}'::jsonb,
  deductions jsonb not null default '{}'::jsonb,
  source_codes jsonb not null default '{}'::jsonb,
  payslip_document_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(payroll_run_id,employee_id)
);
alter table public.hr_payroll_entries enable row level security;
drop policy if exists hr_payroll_entries_business_owner on public.hr_payroll_entries;
create policy hr_payroll_entries_business_owner on public.hr_payroll_entries for all to authenticated
using (exists(select 1 from public.hr_payroll_runs r join public.businesses b on b.id=r.business_id where r.id=hr_payroll_entries.payroll_run_id and (b.owner_user_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN')))))
with check (exists(select 1 from public.hr_payroll_runs r join public.businesses b on b.id=r.business_id where r.id=hr_payroll_entries.payroll_run_id and (b.owner_user_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN')))));

create table if not exists public.hr_generated_documents (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid references public.matters(id) on delete set null,
  client_user_id uuid references public.profiles(id) on delete set null,
  business_id uuid references public.businesses(id) on delete set null,
  template_code text,
  document_type text not null,
  title text not null,
  version text not null default '1.0.0',
  status text not null default 'NEEDS_HUMAN_REVIEW',
  docx_path text,
  pdf_path text,
  source_answers jsonb not null default '{}'::jsonb,
  provenance jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.hr_generated_documents enable row level security;
drop policy if exists hr_generated_documents_client_read on public.hr_generated_documents;
create policy hr_generated_documents_client_read on public.hr_generated_documents for select to authenticated
using (client_user_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN')));
drop policy if exists hr_generated_documents_staff_write on public.hr_generated_documents;
create policy hr_generated_documents_staff_write on public.hr_generated_documents for all to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN')))
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN')));

create table if not exists public.client_document_center_items (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid references public.profiles(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  matter_id uuid references public.matters(id) on delete cascade,
  document_category text not null,
  title text not null,
  document_id uuid references public.hr_generated_documents(id) on delete set null,
  source_document_id uuid references public.client_documents(id) on delete set null,
  required boolean not null default false,
  acknowledgement_required boolean not null default false,
  acknowledgement_status text not null default 'PENDING',
  status text not null default 'AVAILABLE',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.client_document_center_items enable row level security;
drop policy if exists client_document_center_owner on public.client_document_center_items;
create policy client_document_center_owner on public.client_document_center_items for all to authenticated
using (client_user_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN')))
with check (client_user_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role in ('STAFF','SUPER_ADMIN')));

insert into public.service_qualification_questions(service_code,question_key,question_text,input_type,required,sort_order)
values
('HR-EMPLOYMENT-CONTRACTS','employee_full_name','What is the employee''s full legal name?','TEXT',true,100),
('HR-EMPLOYMENT-CONTRACTS','employee_id_or_passport','What is the employee''s South African ID number or passport number?','TEXT',true,110),
('HR-EMPLOYMENT-CONTRACTS','employment_type','Which contract type is required: temporary, project-based, full-time fixed-term, or full-time permanent?','TEXT',true,120),
('HR-EMPLOYMENT-CONTRACTS','start_date','What is the employment start date?','TEXT',true,130),
('HR-EMPLOYMENT-CONTRACTS','end_date','If temporary/project/fixed-term, what is the end date?','TEXT',false,140),
('HR-EMPLOYMENT-CONTRACTS','project_scope','If project-based, what is the project and deliverable scope?','TEXT',false,150),
('HR-EMPLOYMENT-CONTRACTS','job_duties','What are the employee''s principal duties and responsibilities?','TEXT',true,160),
('HR-EMPLOYMENT-CONTRACTS','probation_period','Does the employee have a probation period? If yes, state the period.','TEXT',false,170),
('HR-EMPLOYMENT-CONTRACTS','notice_period','What notice period should apply?','TEXT',false,180),
('HR-EMPLOYMENT-CONTRACTS','leave_entitlement','What leave arrangement or entitlement applies?','TEXT',false,190),
('HR-DISCIPLINARY-HEARINGS','employee_full_name','What is the employee''s full legal name?','TEXT',true,100),
('HR-DISCIPLINARY-HEARINGS','employee_id_or_passport','What is the employee''s ID or passport number?','TEXT',true,110),
('HR-DISCIPLINARY-HEARINGS','date_of_warning','What is the date of the warning or notice?','TEXT',false,120),
('HR-DISCIPLINARY-HEARINGS','warning_valid_until','If a warning is issued, how long should it remain valid?','TEXT',false,130),
('HR-DISCIPLINARY-HEARINGS','facts','Set out the material facts supporting the allegation.','TEXT',true,140),
('HR-DISCIPLINARY-HEARINGS','employee_response','What is the employee''s response, if already provided?','TEXT',false,150),
('HR-DISCIPLINARY-HEARINGS','policy_breached','Which workplace rule, policy or contract term is alleged to have been breached?','TEXT',false,160),
('HR-DISCIPLINARY-HEARINGS','corrective_action','What corrective action or expected improvement is required?','TEXT',false,170),
('HR-DISCIPLINARY-HEARINGS','prior_warnings','Describe any prior warnings or disciplinary history relevant to the document.','TEXT',false,180),
('HR-DISCIPLINARY-HEARINGS','hearing_time','What time is the hearing scheduled?','TEXT',false,190),
('HR-DISCIPLINARY-HEARINGS','hearing_location','Where will the hearing take place?','TEXT',false,200),
('HR-DISCIPLINARY-HEARINGS','charges','List the charges/allegations to be addressed at the hearing.','TEXT',false,210),
('HR-DISCIPLINARY-HEARINGS','employee_rights','What representation, witness or procedural rights should be stated?','TEXT',false,220)
on conflict(service_code,question_key) do update set question_text=excluded.question_text,input_type=excluded.input_type,required=excluded.required,sort_order=excluded.sort_order,active=true,updated_at=now();

create or replace function public.client_portal_create_service_request(p_service_type text,p_title text,p_description text default null,p_business_id uuid default null)
returns public.matters language plpgsql security definer set search_path=''
as $$
declare u uuid:=(select auth.uid()); m public.matters; b public.businesses; svc public.service_catalog; cp public.client_legal_profiles;
begin
 if u is null then raise exception 'Authentication required.' using errcode='42501'; end if;
 if public.client_portal_access_status()<>'APPROVED' then raise exception 'Client portal access is not approved.' using errcode='42501'; end if;
 if nullif(trim(p_service_type),'') is null or nullif(trim(p_title),'') is null then raise exception 'Service type and title are required.' using errcode='22023'; end if;
 select * into svc from public.service_catalog where code=trim(p_service_type) and active=true limit 1;
 if svc.id is null then raise exception 'Selected service is not available.' using errcode='22023'; end if;
 if p_business_id is not null then select * into b from public.businesses where id=p_business_id and owner_user_id=u; if b.id is null then raise exception 'Business is outside caller scope.' using errcode='42501'; end if; end if;
 select * into cp from public.client_legal_profiles where user_id=u;
 insert into public.matters(individual_user_id,business_id,title,description,service_type,portal_request_status,portal_metadata,client_profile_snapshot,created_by)
 values(case when p_business_id is null then u end,p_business_id,trim(p_title),nullif(trim(p_description),''),trim(p_service_type),'submitted',
 jsonb_build_object('source','CUSTOMER_PORTAL','customer_facing_service',svc.name,'evidence_requirements',coalesce(svc.metadata->'evidence_requirements','[]'::jsonb),'evidence_status','OUTSTANDING','questionnaire_status','IN_PROGRESS'),
 coalesce(to_jsonb(cp),'{}'::jsonb),u) returning * into m;
 perform public.client_portal_queue_notification(u,'Service request submitted',format('Your %s service request has been submitted and is now with Isaacs & Partners for review.',svc.name),jsonb_build_object('type','SERVICE_REQUEST','matter_id',m.id,'evidence_requirements',coalesce(svc.metadata->'evidence_requirements','[]'::jsonb)));
 return m;
end $$;
revoke all on function public.client_portal_create_service_request(text,text,text,uuid) from public,anon;
grant execute on function public.client_portal_create_service_request(text,text,text,uuid) to authenticated;
notify pgrst,'reload schema';
