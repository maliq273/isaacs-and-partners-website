grant select,insert,update,delete on public.service_catalog,public.service_cost_components,public.service_pricing_rules,public.service_costing_workbooks to authenticated;
grant select on public.service_costing_summary to authenticated;
grant select on public.service_qualification_questions,public.client_estimates_public to authenticated;
alter view public.client_estimates_public set (security_invoker=true);
insert into public.service_costing_workbooks(template_key,name,formula_version,data,active) values
('TEMP_OUTSOURCING','Temporary Employee Outsourcing','2026-09-22.2','{"position":"","employee_rate":30.23,"rate_quantity":1,"uif_sdl_wca":5,"criminal_check":1,"medical_test":2,"ppe":1.5,"invoice_fee":5,"hr_admin":12.5,"service_fee":8,"nt_hours":0,"nt_rate":30.23,"ot_hours":0,"ot_multiplier":1.5,"sunday_hours":0,"sunday_multiplier":2,"retail_sunday":0,"public_holiday_hours":0,"public_holiday_multiplier":2,"tax":15}',true),
('PERM_OUTSOURCING','Permanent Outsourcing','2026-09-22.2','{"monthly_salary":0,"months":12,"service_percent":15}',true),
('FOREIGNER_EMPLOYMENT_OFFER','Foreigner Employment Offer / Retainer','2026-09-22.2','{"monthly_retainer":1250,"repatriation":10000,"months":1}',true),
('BUSINESS_COMPLIANCE','Business Compliance — Retainer + Individual Services','2026-09-22.2','{"retainer":1250,"cipc":0,"sars":0,"uif":0,"coida":0,"bank":0,"bbbee":0,"other":0,"tax":15}',true),
('IMMIGRATION','Immigration Market Benchmark & Quote Builder','2026-09-22.2','{"selected_service":"","professional_fee":0,"dha_fee":0,"vfs_fee":0,"saqa":0,"police_medical":0,"other_disbursements":0,"tax":15}',true)
on conflict(template_key) do update set name=excluded.name,formula_version=excluded.formula_version,data=excluded.data,active=true,updated_at=now();