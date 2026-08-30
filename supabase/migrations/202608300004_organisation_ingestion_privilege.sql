-- PR30: allow the privileged document ingestion worker to invoke routing
-- without weakening normal authenticated SUPER_ADMIN access.
create or replace function public.organisation_route_document(p_document_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare d public.organisation_documents%rowtype; n integer:=0; x integer:=0; privileged boolean:=false;
begin
 privileged := coalesce(auth.role(),'')='service_role';
 if not privileged and not public.is_super_admin() then raise exception 'SUPER_ADMIN access required'; end if;
 select * into d from public.organisation_documents where id=p_document_id;
 if not found then raise exception 'Organisation document not found'; end if;
 if d.audience in('STAFF','ALL') then
  insert into public.organisation_terms_assignments(document_id,subject_type,subject_id,acknowledgement_status)
  select d.id,'STAFF',p.id,'REQUIRED' from public.profiles p where p.is_active and p.role::text='STAFF' on conflict do nothing;
  get diagnostics x=row_count; n:=n+x;
 end if;
 if d.audience in('INDIVIDUAL','CLIENT_ALL','ALL') then
  insert into public.organisation_terms_assignments(document_id,subject_type,subject_id,acknowledgement_status)
  select d.id,'INDIVIDUAL',p.id,case when d.is_terms_of_service then 'REQUIRED' else 'NOT_REQUIRED' end from public.profiles p where p.is_active and p.role::text='INDIVIDUAL' on conflict do nothing;
  get diagnostics x=row_count; n:=n+x;
 end if;
 if d.audience in('BUSINESS','CLIENT_ALL','ALL') then
  insert into public.organisation_terms_assignments(document_id,subject_type,subject_id,acknowledgement_status)
  select d.id,'BUSINESS',b.id,case when d.is_terms_of_service then 'REQUIRED' else 'NOT_REQUIRED' end from public.businesses b where b.is_active on conflict do nothing;
  get diagnostics x=row_count; n:=n+x;
 end if;
 return n;
end; $$;
