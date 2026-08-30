-- PR30 hardening: only assigned organisation documents are visible to a subject,
-- and active terms are automatically assigned when new staff, individuals or
-- businesses are created.

drop policy if exists organisation_documents_staff_select on public.organisation_documents;
create policy organisation_documents_staff_select on public.organisation_documents for select to authenticated using (
    is_active and exists (select 1 from public.organisation_terms_assignments a where a.document_id=organisation_documents.id and a.subject_type='STAFF' and a.subject_id=auth.uid())
);

drop policy if exists organisation_documents_client_select on public.organisation_documents;
create policy organisation_documents_client_select on public.organisation_documents for select to authenticated using (
    is_active and (
        exists (select 1 from public.organisation_terms_assignments a where a.document_id=organisation_documents.id and a.subject_type='INDIVIDUAL' and a.subject_id=auth.uid())
        or exists (select 1 from public.organisation_terms_assignments a join public.businesses b on b.id=a.subject_id where a.document_id=organisation_documents.id and a.subject_type='BUSINESS' and b.owner_user_id=auth.uid())
    )
);

create or replace function public.organisation_auto_route_profile()
returns trigger language plpgsql security definer set search_path=public as $$
begin
    if new.is_active and new.role::text='STAFF' then
        insert into public.organisation_terms_assignments(document_id,subject_type,subject_id,acknowledgement_status)
        select d.id,'STAFF',new.id,'REQUIRED' from public.organisation_documents d where d.is_active and d.audience in('STAFF','ALL') and current_date>=d.effective_from and (d.effective_to is null or current_date<=d.effective_to) on conflict do nothing;
    elsif new.is_active and new.role::text='INDIVIDUAL' then
        insert into public.organisation_terms_assignments(document_id,subject_type,subject_id,acknowledgement_status)
        select d.id,'INDIVIDUAL',new.id,case when d.is_terms_of_service then 'REQUIRED' else 'NOT_REQUIRED' end from public.organisation_documents d where d.is_active and d.audience in('INDIVIDUAL','CLIENT_ALL','ALL') and current_date>=d.effective_from and (d.effective_to is null or current_date<=d.effective_to) on conflict do nothing;
    end if;
    return new;
exception when others then return new;
end;
$$;

drop trigger if exists organisation_auto_route_profile on public.profiles;
create trigger organisation_auto_route_profile after insert or update of role,is_active on public.profiles for each row execute function public.organisation_auto_route_profile();

create or replace function public.organisation_auto_route_business()
returns trigger language plpgsql security definer set search_path=public as $$
begin
    if new.is_active then
        insert into public.organisation_terms_assignments(document_id,subject_type,subject_id,acknowledgement_status)
        select d.id,'BUSINESS',new.id,case when d.is_terms_of_service then 'REQUIRED' else 'NOT_REQUIRED' end from public.organisation_documents d where d.is_active and d.audience in('BUSINESS','CLIENT_ALL','ALL') and current_date>=d.effective_from and (d.effective_to is null or current_date<=d.effective_to) on conflict do nothing;
    end if;
    return new;
exception when others then return new;
end;
$$;

drop trigger if exists organisation_auto_route_business on public.businesses;
create trigger organisation_auto_route_business after insert or update of is_active on public.businesses for each row execute function public.organisation_auto_route_business();
