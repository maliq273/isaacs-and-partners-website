-- PR30 hardening: only assigned organisation documents are visible to a subject,
-- and active terms are automatically assigned when new staff, individuals or
-- businesses are created.

drop policy if exists organisation_documents_staff_select on public.organisation_documents;
create policy organisation_documents_staff_select on public.organisation_documents
for select to authenticated using (
    is_active and exists (
        select 1 from public.organisation_terms_assignments a
        where a.document_id = organisation_documents.id
          and a.subject_type = 'STAFF'
          and a.subject_id = auth.uid()
    )
);

drop policy if exists organisation_documents_client_select on public.organisation_documents;
create policy organisation_documents_client_select on public.organisation_documents
for select to authenticated using (
    is_active and (
        exists (
            select 1 from public.organisation_terms_assignments a
            where a.document_id = organisation_documents.id
              and a.subject_type = 'INDIVIDUAL'
              and a.subject_id = auth.uid()
        )
        or exists (
            select 1 from public.organisation_terms_assignments a
            join public.businesses b on b.id = a.subject_id
            where a.document_id = organisation_documents.id
              and a.subject_type = 'BUSINESS'
              and b.owner_user_id = auth.uid()
        )
    )
);

create or replace function public.organisation_auto_route_profile()
returns trigger language plpgsql security definer set search_path=public as $$
begin
    if new.is_active and new.role::text = 'STAFF' then
        perform public.organisation_route_active_terms_to_subject('STAFF',new.id);
    elsif new.is_active and new.role::text = 'INDIVIDUAL' then
        perform public.organisation_route_active_terms_to_subject('INDIVIDUAL',new.id);
    end if;
    return new;
exception when others then
    return new;
end;
$$;

drop trigger if exists organisation_auto_route_profile on public.profiles;
create trigger organisation_auto_route_profile after insert or update of role,is_active on public.profiles for each row execute function public.organisation_auto_route_profile();

create or replace function public.organisation_auto_route_business()
returns trigger language plpgsql security definer set search_path=public as $$
begin
    if new.is_active then perform public.organisation_route_active_terms_to_subject('BUSINESS',new.id); end if;
    return new;
exception when others then
    return new;
end;
$$;

drop trigger if exists organisation_auto_route_business on public.businesses;
create trigger organisation_auto_route_business after insert or update of is_active on public.businesses for each row execute function public.organisation_auto_route_business();
