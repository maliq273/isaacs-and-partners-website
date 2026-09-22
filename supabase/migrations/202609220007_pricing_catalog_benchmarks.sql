-- 2026-09-22: full editable service pricing catalogue and researched benchmarks.
-- Idempotent seed for the Super Admin Service Costing Centre.

with pricing(code,name,domain,description,mode,tax,minfee,benchmark,market_low,market_high,notes) as (
values
('IMM-VISITOR-TEMP','Visitor / Temporary Residence Assistance','IMMIGRATION','Immigration professional-fee benchmark; official/VFS/third-party costs separate.','FIXED',15,0,16500,8000,25000,'RESEARCHED_BENCHMARK'),
('IMM-CRITICAL-SKILLS','Critical Skills Work Visa','IMMIGRATION','Professional-fee benchmark; DHA/VFS/SAQA/professional-body costs separate.','FIXED',15,0,30000,15000,45000,'RESEARCHED_BENCHMARK'),
('IMM-GENERAL-WORK','General Work Visa','IMMIGRATION','Professional-fee benchmark; DHA/VFS/third-party costs separate.','FIXED',15,0,30000,15000,45000,'RESEARCHED_BENCHMARK'),
('IMM-ICT','ICT / Intra-Company Transfer','IMMIGRATION','Professional-fee benchmark; complexity varies.','FIXED',15,0,30000,15500,80000,'RESEARCHED_BENCHMARK_PLUS'),
('IMM-CORPORATE-CSV','Corporate Visa / CSV','IMMIGRATION','Professional-fee benchmark; government/VFS costs separate.','FIXED',15,0,35000,20000,50000,'RESEARCHED_BENCHMARK_PLUS'),
('IMM-PERM-RESIDENCE','Permanent Residence','IMMIGRATION','Professional-fee benchmark; DHA/VFS/document costs separate.','FIXED',15,0,40000,20000,60000,'RESEARCHED_BENCHMARK_PLUS'),
('IMM-SPOUSAL-RELATIVE','Spousal / Relative Visa','IMMIGRATION','Professional-fee benchmark; official fees may differ by route.','FIXED',15,0,20000,10000,30000,'RESEARCHED_BENCHMARK'),
('IMM-RENEWAL-EXTENSION','Visa Renewal / Extension','IMMIGRATION','Routine professional-fee benchmark; complexity can increase fee.','FIXED',15,0,10000,5000,15000,'RESEARCHED_BENCHMARK'),
('IMM-REFUSAL-APPEAL','Refusal Appeal / Reapplication','IMMIGRATION','Professional-fee benchmark; scope depends on refusal reasons.','FIXED',15,0,19000,8000,30000,'RESEARCHED_BENCHMARK'),
('IMM-HIGH-COURT-REVIEW','High Court Immigration Review','IMMIGRATION','Litigation/professional-fee benchmark; counsel and disbursements can vary.','FIXED',15,0,155000,60000,250000,'RESEARCHED_BENCHMARK'),
('IMM-SECTION-22','Section 22','IMMIGRATION','Custom pricing. Use the immigration workbook and case-specific costing.','CUSTOM',15,0,0,null,null,'CUSTOM_CASE_PRICING'),
('IMM-SECTION-24','Section 24','IMMIGRATION','Custom pricing. Use the immigration workbook and case-specific costing.','CUSTOM',15,0,0,null,null,'CUSTOM_CASE_PRICING'),
('BUS-COMPANY-SETUP','Private Company Registration / Setup','Business Compliance','Professional handling benchmark; CIPC statutory fees may be separate.','FIXED',15,0,1000,790,1250,'RESEARCHED_BENCHMARK'),
('BUS-CIPC-ANNUAL-RETURN','CIPC Annual Return','Business Compliance','Provider fee benchmark; CIPC statutory fee varies by turnover.','FIXED',15,0,320,190,450,'RESEARCHED_BENCHMARK_PLUS'),
('BUS-BENEFICIAL-OWNERSHIP','Beneficial Ownership Filing','Business Compliance','Provider benchmark; filing requirements vary.','FIXED',15,0,370,150,590,'RESEARCHED_BENCHMARK'),
('BUS-DIRECTOR-ADDRESS-AMENDMENT','Director / Address Amendment','Business Compliance','Provider benchmark; CIPC fee may be separate.','FIXED',15,0,450,250,650,'RESEARCHED_BENCHMARK'),
('BUS-SARS-INCOME-TAX','Income Tax / SARS Registration','Business Compliance','Provider benchmark.','FIXED',15,0,425,350,500,'RESEARCHED_BENCHMARK'),
('BUS-TCS','Tax Clearance / TCS Assistance','Business Compliance','Provider benchmark; depends on compliance condition.','FIXED',15,0,820,350,1290,'RESEARCHED_BENCHMARK'),
('BUS-VAT-REGISTRATION','VAT Registration','Business Compliance','Provider benchmark; complexity varies.','FIXED',15,0,1920,850,2990,'RESEARCHED_BENCHMARK'),
('BUS-PAYE-UIF-SDL','PAYE / UIF / SDL Registration','Business Compliance','Provider benchmark; bundled registrations vary.','FIXED',15,0,1570,650,2490,'RESEARCHED_BENCHMARK'),
('BUS-UIF-REGISTRATION','UIF Registration','Business Compliance','Provider benchmark.','FIXED',15,0,950,650,1250,'RESEARCHED_BENCHMARK'),
('BUS-COIDA-REGISTRATION','COIDA Registration','Business Compliance','Provider benchmark; industry/workforce complexity matters.','FIXED',15,0,2145,790,3500,'RESEARCHED_BENCHMARK'),
('BUS-LETTER-GOOD-STANDING','Letter of Good Standing','Business Compliance','Provider benchmark.','FIXED',15,0,545,400,690,'RESEARCHED_BENCHMARK'),
('BUS-BBBEE-AFFIDAVIT','B-BBEE Affidavit / Assistance','Business Compliance','Provider benchmark; EME/QSE status and certification route may differ.','FIXED',15,0,370,350,390,'RESEARCHED_BENCHMARK'),
('BUS-CSD','CSD Registration','Business Compliance','Provider benchmark.','FIXED',15,0,620,490,750,'RESEARCHED_BENCHMARK'),
('BUS-GOVERNANCE-POLICY-PACK','Governance / Policy Pack','Business Compliance','Scope-dependent professional benchmark.','FIXED',15,0,4000,3500,4500,'RESEARCHED_BENCHMARK'),
('BUS-SHAREHOLDERS-AGREEMENT','Shareholders Agreement','Business Compliance','Document-scope dependent benchmark.','FIXED',15,0,2500,2500,2500,'RESEARCHED_BENCHMARK'),
('BUS-SLA-SERVICE-AGREEMENT','SLA / Service Agreement','Business Compliance','Scope-dependent professional benchmark.','FIXED',15,0,1375,1250,1500,'RESEARCHED_BENCHMARK')
),
upserted as (
insert into public.service_catalog(code,name,service_domain,description,pricing_mode,default_currency,tax_rate,minimum_fee,active,metadata)
select code,name,domain,description,mode,'ZAR',tax,minfee,true,
jsonb_build_object('pricing_status','BENCHMARK','market_range_low',market_low,'market_range_high',market_high,'starting_benchmark',benchmark,'notes',notes,'editable_in_admin',true,'benchmark_year',2026)
from pricing
on conflict(code) do update set
name=excluded.name,service_domain=excluded.service_domain,description=excluded.description,pricing_mode=excluded.pricing_mode,
tax_rate=excluded.tax_rate,minimum_fee=excluded.minimum_fee,active=true,
metadata=public.service_catalog.metadata || excluded.metadata,updated_at=now()
returning id,code
)
select count(*) from upserted;

delete from public.service_pricing_rules r
using public.service_catalog c
where r.service_id=c.id
and c.code in ('IMM-VISITOR-TEMP','IMM-CRITICAL-SKILLS','IMM-GENERAL-WORK','IMM-ICT','IMM-CORPORATE-CSV','IMM-PERM-RESIDENCE','IMM-SPOUSAL-RELATIVE','IMM-RENEWAL-EXTENSION','IMM-REFUSAL-APPEAL','IMM-HIGH-COURT-REVIEW');

insert into public.service_pricing_rules(service_id,rule_name,pricing_mode,fixed_price,markup_percent,minimum_fee,maximum_discount_percent,active,effective_from,priority,metadata)
select id,'2026 research starting benchmark','FIXED',
case code
 when 'IMM-VISITOR-TEMP' then 16500
 when 'IMM-CRITICAL-SKILLS' then 30000
 when 'IMM-GENERAL-WORK' then 30000
 when 'IMM-ICT' then 30000
 when 'IMM-CORPORATE-CSV' then 35000
 when 'IMM-PERM-RESIDENCE' then 40000
 when 'IMM-SPOUSAL-RELATIVE' then 20000
 when 'IMM-RENEWAL-EXTENSION' then 10000
 when 'IMM-REFUSAL-APPEAL' then 19000
 when 'IMM-HIGH-COURT-REVIEW' then 155000
end,0,0,0,true,current_date,10,
metadata || jsonb_build_object('rule_type','RESEARCHED_MARKET_BENCHMARK','editable_in_admin',true)
from public.service_catalog
where code in ('IMM-VISITOR-TEMP','IMM-CRITICAL-SKILLS','IMM-GENERAL-WORK','IMM-ICT','IMM-CORPORATE-CSV','IMM-PERM-RESIDENCE','IMM-SPOUSAL-RELATIVE','IMM-RENEWAL-EXTENSION','IMM-REFUSAL-APPEAL','IMM-HIGH-COURT-REVIEW');

update public.service_catalog
set metadata=metadata || case code
 when 'HR-PAYROLL-OUTSOURCING' then jsonb_build_object('pricing_basis','12.5% of monthly employee salary','pricing_status','APPROVED_ANCHOR','editable_in_admin',true)
 when 'HR-TEMP-STAFFING' then jsonb_build_object('pricing_basis','23.5% of employee hourly rate','pricing_status','APPROVED_ANCHOR','editable_in_admin',true)
 when 'PERM_OUTSOURCING' then jsonb_build_object('pricing_basis','15% of annual salary','pricing_status','APPROVED_ANCHOR','editable_in_admin',true)
 when 'TEMP_OUTSOURCING' then jsonb_build_object('pricing_basis','Workbook-driven commercial costing','pricing_status','APPROVED_ANCHOR','editable_in_admin',true)
 else '{}'::jsonb end,
updated_at=now()
where code in ('HR-PAYROLL-OUTSOURCING','HR-TEMP-STAFFING','PERM_OUTSOURCING','TEMP_OUTSOURCING');
