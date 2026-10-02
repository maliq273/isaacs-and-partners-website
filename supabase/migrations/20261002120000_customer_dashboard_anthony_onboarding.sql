-- Customer dashboard onboarding state, Anthony-controlled setup, login tracking and customer service directory.
-- Applied to production as migration 20261002120000_customer_dashboard_anthony_onboarding.
-- Pricing, commercial approval and document release remain governed by existing authoritative workflows.

create table if not exists public.client_dashboard_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  setup_status text not null default 'NOT_STARTED' check (setup_status in ('NOT_STARTED','IN_PROGRESS','COMPLETED','SUSPENDED')),
  setup_step text not null default 'WELCOME',
  login_count integer not null default 0 check (login_count >= 0),
  first_login_at timestamptz,
  last_login_at timestamptz,
  setup_started_at timestamptz,
  setup_completed_at timestamptz,
  anthony_intro_seen boolean not null default false,
  profile_data jsonb not null default '{}'::jsonb,
  selected_service_codes text[] not null default '{}'::text[],
  notification_preferences jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_dashboard_state enable row level security;
drop policy if exists "client_dashboard_state_select_own" on public.client_dashboard_state;
drop policy if exists "client_dashboard_state_insert_own" on public.client_dashboard_state;
drop policy if exists "client_dashboard_state_update_own" on public.client_dashboard_state;
create policy "client_dashboard_state_select_own" on public.client_dashboard_state for select to authenticated using ((select auth.uid()) = user_id);
create policy "client_dashboard_state_insert_own" on public.client_dashboard_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "client_dashboard_state_update_own" on public.client_dashboard_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table if not exists public.client_portal_service_directory (
  id uuid primary key default gen_random_uuid(),
  service_code text not null unique,
  service_name text not null,
  service_domain text not null,
  billing_model text not null default 'MATTER' check (billing_model in ('MONTHLY','PER_EMPLOYEE_PAYSLIP','ONE_OFF','MATTER','QUOTE')),
  pricing_visibility text not null default 'STAFF_APPROVED' check (pricing_visibility in ('PUBLIC','INDICATIVE','STAFF_APPROVED','ADMIN_ONLY')),
  service_catalog_code text references public.service_catalog(code) on update cascade on delete set null,
  active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_portal_service_directory enable row level security;
drop policy if exists "client_portal_service_directory_active_read" on public.client_portal_service_directory;
create policy "client_portal_service_directory_active_read" on public.client_portal_service_directory for select to authenticated using (active = true);

create or replace function public.client_portal_begin_session()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := (select auth.uid()); s public.client_dashboard_state;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  insert into public.client_dashboard_state(user_id,login_count,first_login_at,last_login_at,updated_at)
  values(uid,1,now(),now(),now())
  on conflict (user_id) do update set login_count=client_dashboard_state.login_count+1,last_login_at=now(),updated_at=now()
  returning * into s;
  return jsonb_build_object('user_id',s.user_id,'setup_status',s.setup_status,'setup_step',s.setup_step,'login_count',s.login_count,'first_login_at',s.first_login_at,'last_login_at',s.last_login_at,'setup_started_at',s.setup_started_at,'setup_completed_at',s.setup_completed_at,'anthony_intro_seen',s.anthony_intro_seen,'profile_data',s.profile_data,'selected_service_codes',s.selected_service_codes,'notification_preferences',s.notification_preferences);
end; $$;
revoke all on function public.client_portal_begin_session() from public,anon;
grant execute on function public.client_portal_begin_session() to authenticated;

create or replace function public.client_portal_save_dashboard_setup(p_profile_data jsonb,p_selected_service_codes text[],p_setup_step text default 'COMPLETED',p_anthony_intro_seen boolean default true)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := (select auth.uid()); s public.client_dashboard_state; next_status text;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  next_status := case when upper(coalesce(p_setup_step,'COMPLETED'))='COMPLETED' then 'COMPLETED' else 'IN_PROGRESS' end;
  insert into public.client_dashboard_state(user_id,setup_status,setup_step,setup_started_at,setup_completed_at,anthony_intro_seen,profile_data,selected_service_codes,updated_at)
  values(uid,next_status,coalesce(p_setup_step,'COMPLETED'),now(),case when next_status='COMPLETED' then now() else null end,p_anthony_intro_seen,coalesce(p_profile_data,'{}'::jsonb),coalesce(p_selected_service_codes,'{}'::text[]),now())
  on conflict (user_id) do update set setup_status=excluded.setup_status,setup_step=excluded.setup_step,setup_started_at=coalesce(client_dashboard_state.setup_started_at,excluded.setup_started_at),setup_completed_at=excluded.setup_completed_at,anthony_intro_seen=excluded.anthony_intro_seen,profile_data=excluded.profile_data,selected_service_codes=excluded.selected_service_codes,updated_at=now()
  returning * into s;
  return jsonb_build_object('setup_status',s.setup_status,'setup_step',s.setup_step,'login_count',s.login_count,'profile_data',s.profile_data,'selected_service_codes',s.selected_service_codes,'anthony_intro_seen',s.anthony_intro_seen);
end; $$;
revoke all on function public.client_portal_save_dashboard_setup(jsonb,text[],text,boolean) from public,anon;
grant execute on function public.client_portal_save_dashboard_setup(jsonb,text[],text,boolean) to authenticated;

create or replace function public.client_portal_dashboard_onboarding()
returns jsonb language sql security definer set search_path = public as $$
select jsonb_build_object('dashboard',coalesce((select to_jsonb(s) from public.client_dashboard_state s where s.user_id=(select auth.uid())),'{}'::jsonb),'services',coalesce((select jsonb_agg(to_jsonb(d) order by d.service_domain,d.sort_order,d.service_name) from public.client_portal_service_directory d where d.active=true),'[]'::jsonb));
$$;
revoke all on function public.client_portal_dashboard_onboarding() from public,anon;
grant execute on function public.client_portal_dashboard_onboarding() to authenticated;

insert into public.client_portal_service_directory(service_code,service_name,service_domain,billing_model,pricing_visibility,service_catalog_code,sort_order) values
('IMM-WORK-VISAS','Work Visas','Immigration Services','MATTER','STAFF_APPROVED','IMMIGRATION',10),('IMM-CRITICAL-SKILLS','Critical Skills Visas','Immigration Services','MATTER','STAFF_APPROVED','IMM-CRITICAL-SKILLS',20),('IMM-GENERAL-WORK','General Work Visas','Immigration Services','MATTER','STAFF_APPROVED','IMM-GENERAL-WORK',30),('IMM-BUSINESS-VISA','Business Visas','Immigration Services','MATTER','STAFF_APPROVED','IMMIGRATION',40),('IMM-CORPORATE-VISA','Corporate Visas','Immigration Services','MATTER','STAFF_APPROVED','IMM-CORPORATE-CSV',50),('IMM-STUDY-VISA','Study Visas','Immigration Services','MATTER','STAFF_APPROVED','IMMIGRATION',60),('IMM-RELATIVE-VISA','Relative Visas','Immigration Services','MATTER','STAFF_APPROVED','IMM-SPOUSAL-RELATIVE',70),('IMM-SPOUSAL-VISA','Spousal Visas','Immigration Services','MATTER','STAFF_APPROVED','IMM-SPOUSAL-RELATIVE',80),('IMM-VISITOR-VISA','Visitor Visas','Immigration Services','MATTER','STAFF_APPROVED','IMM-VISITOR-TEMP',90),('IMM-PR','Permanent Residence','Immigration Services','MATTER','STAFF_APPROVED','IMM-PERM-RESIDENCE',100),('IMM-CITIZENSHIP','Citizenship Applications','Immigration Services','MATTER','STAFF_APPROVED','IMMIGRATION',110),('IMM-REFUGEE-ASYLUM','Refugee & Asylum Assistance','Immigration Services','MATTER','STAFF_APPROVED','IMMIGRATION',120),('IMM-SECTION-22','Section 22 Applications','Immigration Services','MATTER','STAFF_APPROVED','IMM-SECTION-22',130),('IMM-SECTION-24','Section 24 Applications','Immigration Services','MATTER','STAFF_APPROVED','IMM-SECTION-24',140),('IMM-VISA-APPEALS','Visa Appeals','Immigration Services','MATTER','STAFF_APPROVED','IMM-REFUSAL-APPEAL',150),('IMM-DHA-REPRESENTATIONS','DHA Representations','Immigration Services','MATTER','STAFF_APPROVED','IMMIGRATION',160),('IMM-VFS','VFS Global Applications','Immigration Services','MATTER','STAFF_APPROVED','IMMIGRATION',170),('IMM-STATUS-VERIFICATION','Status Verification','Immigration Services','MATTER','STAFF_APPROVED','IMMIGRATION',180),
('HR-EMPLOYMENT-CONTRACTS','Employment Contracts','HR & Industrial Relations','MATTER','STAFF_APPROVED','HR-EMPLOYMENT-CONTRACTS',10),('HR-HR-POLICIES','HR Policies','HR & Industrial Relations','MATTER','STAFF_APPROVED','HR-HR-POLICIES',20),('HR-DISCIPLINARY-HEARINGS','Disciplinary Hearings','HR & Industrial Relations','MATTER','STAFF_APPROVED','HR-DISCIPLINARY-HEARINGS',30),('HR-CHAIRPERSON-SERVICES','Chairperson Services','HR & Industrial Relations','MATTER','STAFF_APPROVED','HR-CHAIRPERSON-SERVICES',40),('HR-GRIEVANCE-HEARINGS','Grievance Hearings','HR & Industrial Relations','MATTER','STAFF_APPROVED','HR-GRIEVANCE-HEARINGS',50),('HR-PERFORMANCE-MANAGEMENT','Performance Management','HR & Industrial Relations','MATTER','STAFF_APPROVED','HR-PERFORMANCE-MANAGEMENT',60),('HR-RETRENCHMENT-CONSULTING','Retrenchment Consulting','HR & Industrial Relations','MATTER','STAFF_APPROVED','HR-RETRENCHMENT-CONSULTING',70),('HR-CCMA-REPRESENTATION','CCMA Representation','HR & Industrial Relations','MATTER','STAFF_APPROVED','HR-CCMA-REPRESENTATION',80),('HR-BARGAINING-COUNCIL','Bargaining Council Matters','HR & Industrial Relations','MATTER','STAFF_APPROVED','HR-HEARING-REP-HOURLY',90),('HR-PAYROLL-ADVISORY','Payroll Advisory','HR & Industrial Relations','MATTER','STAFF_APPROVED','HR-PAYROLL-OUTSOURCING',100),('HR-LABOUR-COMPLIANCE-AUDIT','Labour Compliance Audits','HR & Industrial Relations','MATTER','STAFF_APPROVED','HR-HR-POLICIES',110),('HR-EMPLOYMENT-EQUITY','Employment Equity','HR & Industrial Relations','MATTER','STAFF_APPROVED','HR-HR-POLICIES',120),('HR-RECRUITMENT-ASSISTANCE','Recruitment Assistance','HR & Industrial Relations','MATTER','STAFF_APPROVED','PERM_OUTSOURCING',130),('HR-OUTSOURCING','HR Outsourcing','HR & Industrial Relations','MONTHLY','STAFF_APPROVED','HR-PAYROLL-OUTSOURCING',140),
('BUS-COMPANY-REGISTRATION','Company Registration','Business Compliance','MATTER','STAFF_APPROVED','BUS-COMPANY-SETUP',10),('BUS-CIPC-AMENDMENTS','CIPC Amendments','Business Compliance','MATTER','STAFF_APPROVED','BUS-DIRECTOR-ADDRESS-AMENDMENT',20),('BUSINESS-NAME-RESERVATIONS','Business Name Reservations','Business Compliance','MATTER','STAFF_APPROVED','BUSINESS-COMPLIANCE-RETAINER',30),('BUS-SARS-REGISTRATION','SARS Registration','Business Compliance','MATTER','STAFF_APPROVED','BUS-SARS-INCOME-TAX',40),('BUS-VAT-REGISTRATION','VAT Registration','Business Compliance','MATTER','STAFF_APPROVED','BUS-VAT-REGISTRATION',50),('BUS-PAYE-REGISTRATION','PAYE Registration','Business Compliance','MATTER','STAFF_APPROVED','BUS-PAYE-UIF-SDL',60),('BUS-UIF-REGISTRATION','UIF Registration','Business Compliance','MATTER','STAFF_APPROVED','BUS-UIF-REGISTRATION',70),('BUS-COIDA-REGISTRATION','COIDA Registration','Business Compliance','MATTER','STAFF_APPROVED','BUS-COIDA-REGISTRATION',80),('BUS-TAX-CLEARANCE','Tax Clearance','Business Compliance','MATTER','STAFF_APPROVED','BUS-TCS',90),('BUS-BANK-ACCOUNT','Business Bank Account Setup','Business Compliance','MATTER','STAFF_APPROVED','BUSINESS-COMPLIANCE-RETAINER',100),('BUS-COMPLIANCE-CERTIFICATES','Compliance Certificates','Business Compliance','MATTER','STAFF_APPROVED','BUSINESS-COMPLIANCE-RETAINER',110),('BUS-ANNUAL-RETURNS','Annual Returns','Business Compliance','MATTER','STAFF_APPROVED','BUS-CIPC-ANNUAL-RETURN',120),('BUS-DIRECTOR-AMENDMENTS','Director Amendments','Business Compliance','MATTER','STAFF_APPROVED','BUS-DIRECTOR-ADDRESS-AMENDMENT',130),('BUS-BUSINESS-CONSULTING','Business Consulting','Business Compliance','QUOTE','STAFF_APPROVED','BUSINESS-COMPLIANCE-RETAINER',140),
('LEGAL-ADVICE','Legal Advice','Legal Services','MATTER','STAFF_APPROVED','LEGAL_SERVICES',10),('LEGAL-CONTRACT-DRAFTING','Contract Drafting','Legal Services','MATTER','STAFF_APPROVED','LEGAL_SERVICES',20),('LEGAL-CONTRACT-VETTING','Contract Vetting','Legal Services','MATTER','STAFF_APPROVED','LEGAL_SERVICES',30),('LEGAL-COMMERCIAL-AGREEMENTS','Commercial Agreements','Legal Services','MATTER','STAFF_APPROVED','LEGAL_SERVICES',40),('LEGAL-SETTLEMENT-AGREEMENTS','Settlement Agreements','Legal Services','MATTER','STAFF_APPROVED','LEGAL_SERVICES',50),('LEGAL-POWER-OF-ATTORNEY','Power of Attorney','Legal Services','MATTER','STAFF_APPROVED','LEGAL_SERVICES',60),('LEGAL-AFFIDAVITS','Affidavits','Legal Services','MATTER','STAFF_APPROVED','LEGAL_SERVICES',70),('LEGAL-APPEAL-DRAFTING','Appeal Drafting','Legal Services','MATTER','STAFF_APPROVED','LEGAL_SERVICES',80),('LEGAL-MEDIATION','Mediation','Legal Services','MATTER','STAFF_APPROVED','LEGAL_SERVICES',90),('LEGAL-NEGOTIATIONS','Negotiations','Legal Services','MATTER','STAFF_APPROVED','LEGAL_SERVICES',100),('LEGAL-NOTARY','Notary Services','Legal Services','ONE_OFF','STAFF_APPROVED','NOTARY_MEDIATION',110),('LEGAL-LEGAL-OPINIONS','Legal Opinions','Legal Services','MATTER','STAFF_APPROVED','LEGAL_SERVICES',120),('LEGAL-CORPORATE-ADVISORY','Corporate Advisory','Legal Services','QUOTE','STAFF_APPROVED','LEGAL_SERVICES',130)
on conflict(service_code) do update set service_name=excluded.service_name,service_domain=excluded.service_domain,billing_model=excluded.billing_model,pricing_visibility=excluded.pricing_visibility,service_catalog_code=excluded.service_catalog_code,sort_order=excluded.sort_order,active=true,updated_at=now();
