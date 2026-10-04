-- Make the HR customer evidence contract available to the live portal matter.
-- The service catalogue remains the operational source; HR_IR JSON is the test contract.
update public.service_catalog s
set metadata = s.metadata || jsonb_build_object('evidence_requirements',
 case s.code
 when 'HR-EMPLOYMENT-CONTRACTS' then jsonb_build_array('existing_contract','job_description_or_role_details','remuneration_details','workplace_policies_if_relevant')
 when 'HR-HR-POLICIES' then jsonb_build_array('existing_policy','relevant_contracts','organisation_details','existing_procedures_if_any')
 when 'HR-DISCIPLINARY-HEARINGS' then jsonb_build_array('employment_contract','disciplinary_code_or_policy','notice_to_attend','warnings_or_prior_records','allegation_evidence','witness_details')
 when 'HR-CHAIRPERSON-SERVICES' then jsonb_build_array('notice_to_attend','disciplinary_code_or_policy','allegations','employee_response','witness_details','prior_warnings_if_any')
 when 'HR-GRIEVANCE-HEARINGS' then jsonb_build_array('written_grievance','employment_contract','relevant_policy','correspondence','supporting_evidence','witness_details')
 when 'HR-PERFORMANCE-MANAGEMENT' then jsonb_build_array('employment_contract','job_description','performance_plan_or_targets','review_records','prior_feedback','relevant_policy')
 when 'HR-RETRENCHMENT-CONSULTING' then jsonb_build_array('business_reason_and_supporting_information','headcount_information','affected_roles','alternatives_considered','consultation_documents','selection_criteria','proposed_timeline','severance_information')
 when 'HR-CCMA-REPRESENTATION' then jsonb_build_array('ccma_referral','proof_of_service','employment_contract','disciplinary_or_grievance_records','dismissal_or_decision_documents','correspondence','witness_details','hearing_notice')
 else coalesce(s.metadata->'evidence_requirements','[]'::jsonb)
 end)
where s.code like 'HR-%';

create or replace function public.client_portal_create_service_request(p_service_type text,p_title text,p_description text default null,p_business_id uuid default null)
returns public.matters language plpgsql security definer set search_path=''
as $$
declare u uuid:=(select auth.uid()); m public.matters; b public.businesses; svc public.service_catalog;
begin
 if u is null then raise exception 'Authentication required.' using errcode='42501'; end if;
 if public.client_portal_access_status()<>'APPROVED' then raise exception 'Client portal access is not approved.' using errcode='42501'; end if;
 if nullif(trim(p_service_type),'') is null or nullif(trim(p_title),'') is null then raise exception 'Service type and title are required.' using errcode='22023'; end if;
 select * into svc from public.service_catalog where code=trim(p_service_type) and active=true limit 1;
 if svc.id is null then raise exception 'Selected service is not available.' using errcode='22023'; end if;
 if p_business_id is not null then select * into b from public.businesses where id=p_business_id and owner_user_id=u; if b.id is null then raise exception 'Business is outside caller scope.' using errcode='42501'; end if; end if;
 insert into public.matters(individual_user_id,business_id,title,description,service_type,portal_request_status,portal_metadata,created_by)
 values(case when p_business_id is null then u end,p_business_id,trim(p_title),nullif(trim(p_description),''),trim(p_service_type),'submitted',
 jsonb_build_object('source','CUSTOMER_PORTAL','customer_facing_service',svc.name,'evidence_requirements',coalesce(svc.metadata->'evidence_requirements','[]'::jsonb),'evidence_status','OUTSTANDING'),u)
 returning * into m;
 perform public.client_portal_queue_notification(u,'Service request submitted',format('Your %s service request has been submitted and is now with Isaacs & Partners for review.',svc.name),jsonb_build_object('type','SERVICE_REQUEST','matter_id',m.id,'evidence_requirements',coalesce(svc.metadata->'evidence_requirements','[]'::jsonb)));
 return m;
end $$;

revoke all on function public.client_portal_create_service_request(text,text,text,uuid) from public,anon;
grant execute on function public.client_portal_create_service_request(text,text,text,uuid) to authenticated;
notify pgrst,'reload schema';