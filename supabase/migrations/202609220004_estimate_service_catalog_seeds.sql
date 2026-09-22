insert into public.service_catalog(code,name,service_domain,description,pricing_mode,default_currency,tax_rate,minimum_fee,active,metadata) values
('IMMIGRATION','Immigration Services','IMMIGRATION','South African immigration, visas, permits, appeals and related support.','CUSTOM','ZAR',15,0,true,'{"estimate_engine":true}'),
('TEMP_OUTSOURCING','Temporary Staffing Outsourcing','HR','Temporary staffing and labour outsourcing with configurable NT/OT/Sunday/public-holiday rules.','CUSTOM','ZAR',15,0,true,'{"estimate_engine":true}'),
('PERM_OUTSOURCING','Permanent Placement Outsourcing','HR','Permanent recruitment/placement costing based on annual remuneration.','CUSTOM','ZAR',15,0,true,'{"estimate_engine":true}'),
('LEGAL_SERVICES','Legal Services','LEGAL','Legal drafting, advisory, contracts and dispute support.','CUSTOM','ZAR',15,0,true,'{"estimate_engine":true}'),
('NOTARY_MEDIATION','Notary & Mediation','LEGAL','Notarial outsourcing, mediation and structured resolution.','CUSTOM','ZAR',15,0,true,'{"estimate_engine":true}')
on conflict(code) do update set name=excluded.name,description=excluded.description,pricing_mode=excluded.pricing_mode,active=true,updated_at=now();
insert into public.service_qualification_questions(service_code,question_key,question_text,input_type,required,sort_order) values
('HR-PAYROLL-OUTSOURCING','monthly_salary','What is the total monthly employee salary/payroll value?','NUMBER',true,10),
('HR-PAYROLL-OUTSOURCING','employees','How many employees are included?','NUMBER',true,20),
('LEGAL_SERVICES','matter_type','What type of legal work do you need?','TEXT',true,10),
('LEGAL_SERVICES','complexity','Briefly describe the complexity and urgency.','TEXT',true,20),
('NOTARY_MEDIATION','matter_type','What document or dispute requires notarial/mediation support?','TEXT',true,10)
on conflict(service_code,question_key) do update set question_text=excluded.question_text,input_type=excluded.input_type,required=excluded.required,sort_order=excluded.sort_order,active=true,updated_at=now();