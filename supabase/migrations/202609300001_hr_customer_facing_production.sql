-- HR/IR customer-facing production service registration.
-- Eight public HR services share the governed commercial and human-review workflow.

insert into public.service_catalog(code,name,service_domain,description,pricing_mode,default_currency,tax_rate,active,metadata)
values
('HR-EMPLOYMENT-CONTRACTS','Employment Contracts','HR & Industrial Relations','Employment contract drafting, review and related HR contract support.','CUSTOM','ZAR',0,true,jsonb_build_object('source','HR_IR/customer-facing-service-matrix.json','pricing_status','STAFF_QUOTE_REQUIRED','human_service_delivery',true)),
('HR-HR-POLICIES','HR Policies','HR & Industrial Relations','Workplace HR policy drafting, review and implementation support.','CUSTOM','ZAR',0,true,jsonb_build_object('source','HR_IR/customer-facing-service-matrix.json','pricing_status','STAFF_QUOTE_REQUIRED','human_service_delivery',true)),
('HR-DISCIPLINARY-HEARINGS','Disciplinary Hearings','HR & Industrial Relations','Human-led disciplinary hearing preparation and support.','CUSTOM','ZAR',0,true,jsonb_build_object('source','HR_IR/customer-facing-service-matrix.json','pricing_status','STAFF_QUOTE_REQUIRED','human_service_delivery',true)),
('HR-CHAIRPERSON-SERVICES','Chairperson Services','HR & Industrial Relations','Human chairperson services for workplace disciplinary hearings.','CUSTOM','ZAR',0,true,jsonb_build_object('source','HR_IR/customer-facing-service-matrix.json','pricing_status','STAFF_QUOTE_REQUIRED','human_service_delivery',true)),
('HR-GRIEVANCE-HEARINGS','Grievance Hearings','HR & Industrial Relations','Human-led grievance hearing and workplace dispute support.','CUSTOM','ZAR',0,true,jsonb_build_object('source','HR_IR/customer-facing-service-matrix.json','pricing_status','STAFF_QUOTE_REQUIRED','human_service_delivery',true)),
('HR-PERFORMANCE-MANAGEMENT','Performance Management','HR & Industrial Relations','Human HR support for performance management and related documentation.','CUSTOM','ZAR',0,true,jsonb_build_object('source','HR_IR/customer-facing-service-matrix.json','pricing_status','STAFF_QUOTE_REQUIRED','human_service_delivery',true)),
('HR-RETRENCHMENT-CONSULTING','Retrenchment Consulting','HR & Industrial Relations','Human HR/IR support for retrenchment consultation and process planning.','CUSTOM','ZAR',0,true,jsonb_build_object('source','HR_IR/customer-facing-service-matrix.json','pricing_status','STAFF_QUOTE_REQUIRED','human_service_delivery',true)),
('HR-CCMA-REPRESENTATION','CCMA Representation','HR & Industrial Relations','Human HR/IR preparation and representation for CCMA matters.','CUSTOM','ZAR',0,true,jsonb_build_object('source','HR_IR/customer-facing-service-matrix.json','pricing_status','STAFF_QUOTE_REQUIRED','human_service_delivery',true))
on conflict(code) do update set name=excluded.name,service_domain=excluded.service_domain,description=excluded.description,pricing_mode=excluded.pricing_mode,active=true,metadata=public.service_catalog.metadata || excluded.metadata,updated_at=now();

insert into public.service_qualification_questions(service_code,question_key,question_text,input_type,required,sort_order)
values
('HR-EMPLOYMENT-CONTRACTS','customer_type','Is this request for an employer/business or an individual employee?','TEXT',true,10),
('HR-EMPLOYMENT-CONTRACTS','employment_relationship','What employment relationship or arrangement is involved?','TEXT',true,20),
('HR-EMPLOYMENT-CONTRACTS','new_or_review','Is this a new contract, a review, or a revision?','TEXT',true,30),
('HR-EMPLOYMENT-CONTRACTS','employee_count','How many employees are involved?','NUMBER',true,40),
('HR-EMPLOYMENT-CONTRACTS','role_or_category','What role or employee category is involved?','TEXT',true,50),
('HR-EMPLOYMENT-CONTRACTS','remuneration','What remuneration or salary arrangement applies?','TEXT',true,60),
('HR-EMPLOYMENT-CONTRACTS','working_hours','What working hours or schedule applies?','TEXT',false,70),
('HR-EMPLOYMENT-CONTRACTS','existing_contract','Do you already have an existing contract to review?','BOOLEAN',true,80),
('HR-EMPLOYMENT-CONTRACTS','urgency','What deadline or urgency applies?','TEXT',false,90),

('HR-HR-POLICIES','customer_type','Is this for an employer/business or an individual?','TEXT',true,10),
('HR-HR-POLICIES','policy_subject','Which HR policy or workplace subject is involved?','TEXT',true,20),
('HR-HR-POLICIES','employee_count','How many employees are covered?','NUMBER',true,30),
('HR-HR-POLICIES','existing_policy','Do you have an existing policy to review or replace?','BOOLEAN',true,40),
('HR-HR-POLICIES','business_context','Briefly describe the workplace or business context.','TEXT',true,50),
('HR-HR-POLICIES','urgency','What deadline or urgency applies?','TEXT',false,60),

('HR-DISCIPLINARY-HEARINGS','party_role','Are you contacting us as the employer, employee or representative?','TEXT',true,10),
('HR-DISCIPLINARY-HEARINGS','allegation_or_issue','What allegation or disciplinary issue is involved?','TEXT',true,20),
('HR-DISCIPLINARY-HEARINGS','incident_date','When did the relevant incident or conduct occur?','TEXT',true,30),
('HR-DISCIPLINARY-HEARINGS','hearing_date','Has a hearing date already been set?','TEXT',false,40),
('HR-DISCIPLINARY-HEARINGS','employee_count','How many employees are involved?','NUMBER',true,50),
('HR-DISCIPLINARY-HEARINGS','prior_action','Has any warning, suspension or other disciplinary action already occurred?','BOOLEAN',true,60),
('HR-DISCIPLINARY-HEARINGS','urgency','What is the next deadline or hearing date?','TEXT',true,70),

('HR-CHAIRPERSON-SERVICES','party_role','Are you contacting us as the employer, employee or representative?','TEXT',true,10),
('HR-CHAIRPERSON-SERVICES','hearing_type','What type of hearing is required?','TEXT',true,20),
('HR-CHAIRPERSON-SERVICES','hearing_date','When is the hearing scheduled?','TEXT',true,30),
('HR-CHAIRPERSON-SERVICES','employee_count','How many employees are involved?','NUMBER',true,40),
('HR-CHAIRPERSON-SERVICES','allegation_or_issue','What allegations or issues will the hearing address?','TEXT',true,50),
('HR-CHAIRPERSON-SERVICES','documents_available','Do you already have the hearing documents available?','BOOLEAN',true,60),
('HR-CHAIRPERSON-SERVICES','urgency','Are there any urgent deadlines or scheduling constraints?','TEXT',false,70),

('HR-GRIEVANCE-HEARINGS','party_role','Are you contacting us as the employer, employee or representative?','TEXT',true,10),
('HR-GRIEVANCE-HEARINGS','grievance_subject','What is the grievance about?','TEXT',true,20),
('HR-GRIEVANCE-HEARINGS','incident_date','When did the relevant issue occur?','TEXT',false,30),
('HR-GRIEVANCE-HEARINGS','hearing_date','Has an internal grievance hearing or meeting been scheduled?','TEXT',false,40),
('HR-GRIEVANCE-HEARINGS','internal_process_started','Has the grievance already been lodged or handled internally?','BOOLEAN',true,50),
('HR-GRIEVANCE-HEARINGS','urgency','What is the next deadline or urgency?','TEXT',false,60),

('HR-PERFORMANCE-MANAGEMENT','party_role','Are you contacting us as the employer, employee or representative?','TEXT',true,10),
('HR-PERFORMANCE-MANAGEMENT','performance_issue','What performance issue or concern is involved?','TEXT',true,20),
('HR-PERFORMANCE-MANAGEMENT','period_of_issue','How long has the performance concern been present?','TEXT',true,30),
('HR-PERFORMANCE-MANAGEMENT','targets_or_standard','What target, standard or job requirement applies?','TEXT',true,40),
('HR-PERFORMANCE-MANAGEMENT','prior_feedback','Has the employee previously received performance feedback or counselling?','BOOLEAN',true,50),
('HR-PERFORMANCE-MANAGEMENT','employee_count','How many employees are involved?','NUMBER',true,60),
('HR-PERFORMANCE-MANAGEMENT','urgency','What deadline or upcoming review applies?','TEXT',false,70),

('HR-RETRENCHMENT-CONSULTING','employer_headcount','How many employees does the employer currently have?','NUMBER',true,10),
('HR-RETRENCHMENT-CONSULTING','affected_employee_count','How many employees may be affected?','NUMBER',true,20),
('HR-RETRENCHMENT-CONSULTING','reason','What is the business or operational reason for the proposed retrenchment?','TEXT',true,30),
('HR-RETRENCHMENT-CONSULTING','consultation_started','Has any consultation already started?','BOOLEAN',true,40),
('HR-RETRENCHMENT-CONSULTING','proposed_timeline','What is the proposed timeline?','TEXT',true,50),
('HR-RETRENCHMENT-CONSULTING','union_or_representative','Are employees represented by a union or other representative?','BOOLEAN',true,60),
('HR-RETRENCHMENT-CONSULTING','urgency','What is the next deadline or intended decision date?','TEXT',true,70),

('HR-CCMA-REPRESENTATION','party_role','Are you contacting us as the employee, employer or representative?','TEXT',true,10),
('HR-CCMA-REPRESENTATION','dispute_type','What type of CCMA dispute is involved?','TEXT',true,20),
('HR-CCMA-REPRESENTATION','date_of_event_or_dismissal','What is the date of the relevant event or dismissal?','TEXT',true,30),
('HR-CCMA-REPRESENTATION','ccma_case_number','Do you have a CCMA or bargaining council case/reference number?','TEXT',false,40),
('HR-CCMA-REPRESENTATION','conciliation_date','Has a conciliation or hearing date been scheduled?','TEXT',false,50),
('HR-CCMA-REPRESENTATION','referral_status','Has the dispute already been referred or served?','TEXT',true,60),
('HR-CCMA-REPRESENTATION','representation_needed','What representation or preparation do you need?','TEXT',true,70),
('HR-CCMA-REPRESENTATION','urgency','What is the next deadline or hearing date?','TEXT',true,80)
on conflict(service_code,question_key) do update set question_text=excluded.question_text,input_type=excluded.input_type,required=excluded.required,sort_order=excluded.sort_order,active=true,updated_at=now();

drop policy if exists service_catalog_authenticated_read on public.service_catalog;
create policy service_catalog_authenticated_read on public.service_catalog
for select to authenticated using (active=true);

drop policy if exists client_estimates_client_select on public.client_estimates;
create policy client_estimates_client_select on public.client_estimates
for select to authenticated
using (
  client_user_id = auth.uid()
  or exists (
    select 1 from public.businesses b
    where b.id = client_estimates.business_id
      and b.owner_user_id = auth.uid()
  )
);

notify pgrst,'reload schema';
