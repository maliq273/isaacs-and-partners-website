-- SARS BRS 25.3.0 registry hardening: semantic payroll layer -> exact SARS registry -> validation/export.
alter table public.sars_brs2530_source_code_dictionary
  add column if not exists field_type text,
  add column if not exists max_length integer,
  add column if not exists certificate_types text[] not null default ARRAY['IRP5','IT3(a)']::text[],
  add column if not exists effective_from_yoa integer,
  add column if not exists effective_to_yoa integer,
  add column if not exists is_main_code boolean not null default true,
  add column if not exists main_code text,
  add column if not exists semantic_keys text[] not null default '{}'::text[],
  add column if not exists mapping_policy jsonb not null default '{}'::jsonb,
  add column if not exists definition_status text not null default 'VERIFIED_CORE',
  add column if not exists source_document text not null default 'SARS_PAYE_BRS-PAYE-Employer-Reconciliation_V25.3.0_Jun-26',
  add column if not exists source_page integer;

create table if not exists public.sars_brs2530_component_registry (
 id uuid primary key default gen_random_uuid(),
 semantic_key text not null unique,
 label text not null,
 category text not null check(category in ('EARNING','ALLOWANCE','FRINGE_BENEFIT','DEDUCTION','EMPLOYER_CONTRIBUTION','TAX_CREDIT','LUMP_SUM','STATUTORY','INFORMATION')),
 description text,
 default_component_type text not null,
 mapping jsonb not null default '{}'::jsonb,
 client_config_schema jsonb not null default '{}'::jsonb,
 effective_from_yoa integer,
 effective_to_yoa integer,
 active boolean not null default true,
 version text not null default '25.3.0',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.sars_brs2530_consolidation_rules (
 id uuid primary key default gen_random_uuid(),
 sub_code text not null,
 main_code text not null,
 from_yoa integer,
 to_yoa integer,
 rule jsonb not null default '{}'::jsonb,
 source_document text not null default 'SARS_PAYE_BRS-PAYE-Employer-Reconciliation_V25.3.0_Jun-26',
 version text not null default '25.3.0',
 active boolean not null default true,
 unique(sub_code,main_code,version)
);

alter table public.hr_payroll_components
  add column if not exists semantic_key text,
  add column if not exists mapping_version text not null default '25.3.0',
  add column if not exists mapping_snapshot jsonb not null default '{}'::jsonb;

create index if not exists hr_payroll_components_semantic_idx on public.hr_payroll_components(business_id,employee_id,semantic_key,active);
create index if not exists sars_brs2530_dictionary_semantic_idx on public.sars_brs2530_source_code_dictionary using gin(semantic_keys);
create index if not exists sars_brs2530_component_registry_category_idx on public.sars_brs2530_component_registry(category,active);

alter table public.sars_brs2530_component_registry enable row level security;
alter table public.sars_brs2530_consolidation_rules enable row level security;

drop policy if exists "sars_brs2530_component_registry_read" on public.sars_brs2530_component_registry;
create policy "sars_brs2530_component_registry_read" on public.sars_brs2530_component_registry for select to authenticated using (active=true);

drop policy if exists "sars_brs2530_consolidation_rules_read" on public.sars_brs2530_consolidation_rules;
create policy "sars_brs2530_consolidation_rules_read" on public.sars_brs2530_consolidation_rules for select to authenticated using (active=true);

insert into public.sars_brs2530_component_registry
(semantic_key,label,category,description,default_component_type,mapping,client_config_schema,effective_from_yoa)
values
('BASIC_SALARY','Basic salary / wages','EARNING','Ordinary salary or wages.','EARNING','{"source_code":"3601","foreign_service_code":"3651","foreign_service_requires":true}'::jsonb,'{"amount":{"type":"number","required":true}}'::jsonb,2019),
('ANNUAL_BONUS','Annual bonus','EARNING','Annual or incentive payment.','EARNING','{"source_code":"3605","foreign_service_code":"3655"}'::jsonb,'{"amount":{"type":"number","required":true}}'::jsonb,2019),
('COMMISSION','Commission','EARNING','Commission based remuneration.','EARNING','{"source_code":"3606","foreign_service_code":"3656"}'::jsonb,'{"amount":{"type":"number","required":true}}'::jsonb,2019),
('OVERTIME','Overtime','EARNING','Overtime remuneration.','EARNING','{"source_code":"3607","foreign_service_code":"3657"}'::jsonb,'{"amount":{"type":"number","required":true}}'::jsonb,2020),
('INDEPENDENT_CONTRACTOR','Independent contractor remuneration','EARNING','Remuneration paid to an independent contractor.','EARNING','{"source_code":"3616","foreign_service_code":"3666"}'::jsonb,'{"amount":{"type":"number","required":true}}'::jsonb,2004),
('TRAVEL_ALLOWANCE','Travel allowance','ALLOWANCE','Travel allowance or advance for business travel.','ALLOWANCE','{"source_code":"3701","foreign_service_code":"3751"}'::jsonb,'{"amount":{"type":"number","required":true},"business_travel_percent":{"type":"number"}}'::jsonb,2019),
('REIMBURSIVE_TRAVEL','Reimbursive travel allowance','ALLOWANCE','Reimbursive travel amount requiring prescribed-rate treatment.','ALLOWANCE','{"source_code":"3702","foreign_service_code":"3752","excess_source_code":"3722","excess_requires_base":true}'::jsonb,'{"amount":{"type":"number","required":true},"business_km":{"type":"number"}}'::jsonb,2019),
('LOCAL_SUBSISTENCE','Local subsistence allowance','ALLOWANCE','Local subsistence allowance.','ALLOWANCE','{"source_code":"3703","foreign_service_code":"3753"}'::jsonb,'{"amount":{"type":"number","required":true}}'::jsonb,2019),
('HOUSING_ALLOWANCE','Housing / accommodation allowance','ALLOWANCE','Housing or accommodation-related allowance.','ALLOWANCE','{"source_code":"3714","foreign_service_code":"3764"}'::jsonb,'{"amount":{"type":"number","required":true}}'::jsonb,2019),
('MEDICAL_AID_EMPLOYER','Employer-paid medical aid contribution','FRINGE_BENEFIT','Medical aid contribution paid on behalf of an employee.','FRINGE_BENEFIT','{"source_code":"3810","foreign_service_code":"3860","nature_of_person":["A","B","C","M","N","R"]}'::jsonb,'{"amount":{"type":"number","required":true}}'::jsonb,2013),
('MEDICAL_SERVICES_EMPLOYER','Employer medical services cost','FRINGE_BENEFIT','Medical, dental, hospital, nursing or medicine costs incurred for an employee.','FRINGE_BENEFIT','{"source_code":"3813","foreign_service_code":"3863"}'::jsonb,'{"amount":{"type":"number","required":true}}'::jsonb,2013),
('GENERAL_FRINGE_BENEFIT','General fringe benefit','FRINGE_BENEFIT','Other fringe benefits not falling under a specific description.','FRINGE_BENEFIT','{"source_code":"3801","foreign_service_code":"3851"}'::jsonb,'{"amount":{"type":"number","required":true}}'::jsonb,2013),
('EMPLOYER_PENSION','Employer pension contribution','FRINGE_BENEFIT','Employer pension contribution taxable benefit where applicable.','EMPLOYER_CONTRIBUTION','{"source_code":"3817","foreign_service_code":"3867"}'::jsonb,'{"amount":{"type":"number","required":true}}'::jsonb,2017),
('EMPLOYER_PROVIDENT','Employer provident fund contribution','FRINGE_BENEFIT','Employer provident fund contribution taxable benefit where applicable.','EMPLOYER_CONTRIBUTION','{"source_code":"3825","foreign_service_code":"3875"}'::jsonb,'{"amount":{"type":"number","required":true}}'::jsonb,2017),
('EMPLOYER_RETIREMENT_ANNUITY','Employer retirement annuity contribution','FRINGE_BENEFIT','Employer retirement annuity contribution paid for the employee.','FRINGE_BENEFIT','{"source_code":"3828","foreign_service_code":"3878"}'::jsonb,'{"amount":{"type":"number","required":true}}'::jsonb,2017),
('BARGAINING_COUNCIL_BENEFIT','Bargaining council employer contribution benefit','FRINGE_BENEFIT','Taxable benefit from employer bargaining council contributions.','FRINGE_BENEFIT','{"source_code":"3833","foreign_service_code":"3883","requires_equal_source_code":"4584"}'::jsonb,'{"amount":{"type":"number","required":true}}'::jsonb,2020),
('LONG_SERVICE_CASH','Long service cash award','EARNING','Qualifying long service cash award; registry applies YoA exclusion thresholds.','EARNING','{"source_code":"3622","foreign_service_code":"3672","paired_source_code":"3835","thresholds":{"2026":5000,"2027":16000}}'::jsonb,'{"amount":{"type":"number","required":true},"service_years":{"type":"number","required":true}}'::jsonb,2023),
('LONG_SERVICE_BENEFIT','Long service benefit','FRINGE_BENEFIT','Qualifying long service benefit.','FRINGE_BENEFIT','{"source_code":"3835","foreign_service_code":"3885","paired_source_code":"3622","thresholds":{"2026":5000,"2027":16000}}'::jsonb,'{"amount":{"type":"number","required":true},"service_years":{"type":"number","required":true}}'::jsonb,2023),
('PENSION_EMPLOYEE','Employee pension contribution','DEDUCTION','Employee pension fund contribution.','DEDUCTION','{"source_code":"4001"}'::jsonb,'{"amount":{"type":"number","required":true}}'::jsonb,2019),
('PROVIDENT_EMPLOYEE','Employee provident fund contribution','DEDUCTION','Employee provident fund contribution.','DEDUCTION','{"source_code":"4003"}'::jsonb,'{"amount":{"type":"number","required":true}}'::jsonb,2019),
('MEDICAL_AID_EMPLOYEE','Employee medical aid contribution','DEDUCTION','Employee medical scheme contribution.','DEDUCTION','{"source_code":"4005","credit_source_code":"4116"}'::jsonb,'{"amount":{"type":"number","required":true}}'::jsonb,2019),
('RETIREMENT_ANNUITY_EMPLOYEE','Employee retirement annuity contribution','DEDUCTION','Employee retirement annuity fund contribution.','DEDUCTION','{"source_code":"4006"}'::jsonb,'{"amount":{"type":"number","required":true}}'::jsonb,2019),
('MEDICAL_CREDIT','Medical scheme fees tax credit','TAX_CREDIT','Medical scheme fees tax credit.','TAX_CREDIT','{"source_code":"4116"}'::jsonb,'{"amount":{"type":"number","required":true}}'::jsonb,2013),
('ADDITIONAL_MEDICAL_CREDIT','Additional medical expenses tax credit','TAX_CREDIT','Additional medical expenses tax credit.','TAX_CREDIT','{"source_code":"4120"}'::jsonb,'{"amount":{"type":"number","required":true}}'::jsonb,2017),
('LUMP_SUM_SEVERANCE','Severance benefit lump sum','LUMP_SUM','Qualifying severance benefit.','LUMP_SUM','{"source_code":"3901","foreign_service_code":"3951","tax_source_code":"4115"}'::jsonb,'{"amount":{"type":"number","required":true}}'::jsonb,2019),
('LUMP_SUM_RETIREMENT','Retirement fund lump sum','LUMP_SUM','Retirement/termination lump sum.','LUMP_SUM','{"source_code":"3915","tax_source_code":"4115"}'::jsonb,'{}'::jsonb,2008),
('LUMP_SUM_WITHDRAWAL','Retirement fund withdrawal lump sum','LUMP_SUM','Retirement fund withdrawal benefit.','LUMP_SUM','{"source_code":"3920","tax_source_code":"4115"}'::jsonb,'{}'::jsonb,2010),
('LUMP_SUM_SURPLUS','Living annuity / section 15C surplus lump sum','LUMP_SUM','Applicable retirement fund surplus/living annuity lump sum.','LUMP_SUM','{"source_code":"3921","tax_source_code":"4115"}'::jsonb,'{}'::jsonb,2010),
('LUMP_SUM_DEATH','Compensation in respect of death during employment','LUMP_SUM','Compensation fund lump sum on death during employment.','LUMP_SUM','{"source_code":"3922","tax_source_code":"4115","thresholds":{"2026":300000,"2027":800000}}'::jsonb,'{"amount":{"type":"number","required":true}}'::jsonb,2012),
('S11NA_RECOUPMENT','s11(nA) employee recoupment','DEDUCTION','Total amount repaid by employee for s11(nA) recoupment.','DEDUCTION','{"source_code":"4588"}'::jsonb,'{"amount":{"type":"number","required":true}}'::jsonb,2026),
('S11NB_RESTRAINT_RECOUPMENT','s11(nB) employee recoupment / restraint of trade','DEDUCTION','Total amount repaid by employee for s11(nB) recoupment.','DEDUCTION','{"source_code":"4589"}'::jsonb,'{"amount":{"type":"number","required":true}}'::jsonb,2026),
('UIF_EMPLOYEE','UIF employee contribution','STATUTORY','Employee UIF contribution.','STATUTORY','{"source_code":"4141","cents_required":true}'::jsonb,'{"amount":{"type":"number","required":true}}'::jsonb,2019),
('SDL_EMPLOYER','SDL employer contribution','STATUTORY','Employer SDL contribution.','STATUTORY','{"source_code":"4142","cents_required":true}'::jsonb,'{"amount":{"type":"number","required":true}}'::jsonb,2019),
('PAYE','PAYE employees tax','STATUTORY','Employees tax deducted.','STATUTORY','{"source_code":"4102","cents_required":true}'::jsonb,'{"amount":{"type":"number","required":true}}'::jsonb,2019)
on conflict (semantic_key) do update set label=excluded.label,description=excluded.description,mapping=excluded.mapping,client_config_schema=excluded.client_config_schema,effective_from_yoa=excluded.effective_from_yoa,updated_at=now();

insert into public.sars_brs2530_consolidation_rules(sub_code,main_code,from_yoa,to_yoa,rule)
values
('3603','3601',2010,2012,'{"reason":"incorporate into main salary/income"}'),
('3610','3601',2010,2012,'{"reason":"incorporate into main salary/income"}'),
('3604','3602',2010,null,'{"reason":"non-taxable pension consolidation"}'),
('3609','3602',2010,null,'{"reason":"non-taxable arbitration consolidation"}'),
('3612','3602',2010,null,'{"reason":"non-taxable annuity consolidation"}'),
('3607','3601',2010,2019,'{"reason":"overtime consolidation for historical YoA"}'),
('3803','3801',2010,2012,'{"reason":"fringe benefit consolidation"}'),
('3804','3801',2010,2012,'{"reason":"fringe benefit consolidation"}'),
('3807','3801',2010,2012,'{"reason":"fringe benefit consolidation"}'),
('3805','3801',2010,2012,'{"reason":"fringe benefit consolidation"}'),
('3806','3801',2010,2012,'{"reason":"fringe benefit consolidation"}'),
('3808','3801',2010,2012,'{"reason":"fringe benefit consolidation"}'),
('3809','3801',2010,2012,'{"reason":"fringe benefit consolidation"}'),
('3706','3713',2010,null,'{"reason":"allowance consolidation"}'),
('3710','3713',2010,null,'{"reason":"allowance consolidation"}'),
('3711','3713',2010,null,'{"reason":"allowance consolidation"}'),
('3712','3713',2010,null,'{"reason":"allowance consolidation"}'),
('3705','3714',2010,null,'{"reason":"allowance consolidation"}'),
('3709','3714',2010,null,'{"reason":"allowance consolidation"}'),
('3716','3714',2010,null,'{"reason":"allowance consolidation"}'),
('4004','4003',2010,null,'{"reason":"deduction consolidation"}'),
('3902','3920',2010,null,'{"reason":"historical lump sum consolidation"}'),
('3904','3920',2010,null,'{"reason":"historical lump sum consolidation"}'),
('3903','3915',2009,null,'{"reason":"historical lump sum consolidation"}'),
('3905','3915',2009,null,'{"reason":"historical lump sum consolidation"}')
on conflict (sub_code,main_code,version) do update set rule=excluded.rule,active=true;

update public.sars_brs2530_source_code_dictionary d
set field_type=case
 when d.code in ('2010','2027','2025','2036','2038','2064','2065','2066') then 'FT'
 when d.code in ('2015','2022','2024','2081','3015','3020','3026','3075','3076','3081','3234','4150','7006','7009') then 'A'
 else 'N'
end,
semantic_keys=coalesce(d.semantic_keys,'{}')
where version='25.3.0';

update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['BASIC_SALARY'] where code='3601' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['ANNUAL_BONUS'] where code='3605' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['COMMISSION'] where code='3606' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['OVERTIME'] where code='3607' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['TRAVEL_ALLOWANCE'] where code='3701' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['REIMBURSIVE_TRAVEL'] where code='3702' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['LOCAL_SUBSISTENCE'] where code='3703' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['HOUSING_ALLOWANCE'] where code='3714' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['GENERAL_FRINGE_BENEFIT'] where code='3801' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['MEDICAL_AID_EMPLOYER'] where code='3810' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['EMPLOYER_PENSION'] where code='3817' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['EMPLOYER_PROVIDENT'] where code='3825' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['EMPLOYER_RETIREMENT_ANNUITY'] where code='3828' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['LONG_SERVICE_CASH'] where code='3622' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['LONG_SERVICE_BENEFIT'] where code='3835' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['PENSION_EMPLOYEE'] where code='4001' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['PROVIDENT_EMPLOYEE'] where code='4003' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['MEDICAL_AID_EMPLOYEE'] where code='4005' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['RETIREMENT_ANNUITY_EMPLOYEE'] where code='4006' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['MEDICAL_CREDIT'] where code='4116' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['ADDITIONAL_MEDICAL_CREDIT'] where code='4120' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['LUMP_SUM_SEVERANCE'] where code='3901' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['LUMP_SUM_RETIREMENT'] where code='3915' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['LUMP_SUM_WITHDRAWAL'] where code='3920' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['LUMP_SUM_SURPLUS'] where code='3921' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['LUMP_SUM_DEATH'] where code='3922' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['S11NA_RECOUPMENT'] where code='4588' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['S11NB_RESTRAINT_RECOUPMENT'] where code='4589' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['PAYE'] where code='4102' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['UIF_EMPLOYEE'] where code='4141' and version='25.3.0';
update public.sars_brs2530_source_code_dictionary set semantic_keys=ARRAY['SDL_EMPLOYER'] where code='4142' and version='25.3.0';

comment on table public.sars_brs2530_component_registry is 'Client-facing semantic payroll concepts. Clients must never enter SARS source codes; runtime resolves these concepts through the versioned BRS registry.';
comment on table public.sars_brs2530_consolidation_rules is 'Versioned SARS BRS rationalisation/consolidation rules. Sub-codes are stored internally but are not exported when consolidation applies.';
