-- PR30: Isaacs & Partners master organisation profile and policy/terms engine.
-- Supabase is the source of truth. Documents are stored in a private bucket;
-- extracted text is retained for deterministic routing and future AI ingestion.

create table if not exists public.organisation_profiles (
    id uuid primary key default gen_random_uuid(),
    legal_name text not null,
    trading_name text,
    entity_type text,
    registration_number text,
    cipc_number text,
    financial_year_end date,
    income_tax_number text,
    vat_registered boolean not null default false,
    vat_number text,
    vat_effective_date date,
    paye_registered boolean not null default false,
    uif_registered boolean not null default false,
    sdl_registered boolean not null default false,
    registered_address text,
    physical_address text,
    postal_address text,
    city text,
    province text,
    postal_code text,
    country text not null default 'South Africa',
    phone text,
    whatsapp text,
    email text,
    billing_email text,
    accounts_email text,
    website text,
    bank_name text,
    account_holder text,
    account_number text,
    account_type text,
    branch_code text,
    swift_code text,
    logo_url text,
    default_currency text not null default 'ZAR',
    default_vat_rate numeric(8,4) not null default 15,
    quote_prefix text not null default 'QUO-',
    invoice_prefix text not null default 'INV-',
    receipt_prefix text not null default 'REC-',
    credit_note_prefix text not null default 'CN-',
    debit_note_prefix text not null default 'DN-',
    quote_validity_days integer not null default 7,
    default_payment_terms text,
    default_invoice_notes text,
    default_terms_conditions text,
    is_active boolean not null default false,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create unique index if not exists organisation_profiles_one_active_idx on public.organisation_profiles(is_active) where is_active;

create table if not exists public.organisation_documents (
    id uuid primary key default gen_random_uuid(),
    organisation_profile_id uuid not null references public.organisation_profiles(id) on delete cascade,
    title text not null,
    category text not null,
    audience text not null default 'CLIENT_ALL',
    description text,
    file_name text not null,
    mime_type text,
    file_size bigint,
    storage_path text,
    content_hash text,
    extracted_text text,
    extraction_status text not null default 'PENDING',
    extraction_error text,
    is_terms_of_service boolean not null default false,
    version text not null default '1.0',
    effective_from date not null default current_date,
    effective_to date,
    is_active boolean not null default true,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint organisation_documents_category_check check (category in ('BUSINESS_OPERATION_MANUAL','CONFIDENTIALITY_NDA_NON_SOLICITATION','DEPOSIT_RETAINER_REPATRIATION_LIABILITY','EMPLOYER_UNDERTAKINGS','INTERNAL_REVENUE_ALLOCATION','MANDATE_AND_FEE','MATTER_OPENING_CLIENT_ALLOCATION','TERMS_OF_SERVICE','OTHER')),
    constraint organisation_documents_audience_check check (audience in ('STAFF','INDIVIDUAL','BUSINESS','CLIENT_ALL','ALL')),
    constraint organisation_documents_extraction_check check (extraction_status in ('PENDING','EXTRACTED','EXTRACTION_PENDING','FAILED'))
);
create index if not exists organisation_documents_active_idx on public.organisation_documents(organisation_profile_id,is_active,effective_from desc);
create index if not exists organisation_documents_audience_idx on public.organisation_documents(audience,is_active);

create table if not exists public.organisation_terms_assignments (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references public.organisation_documents(id) on delete cascade,
    subject_type text not null,
    subject_id uuid not null,
    delivery_status text not null default 'PENDING',
    acknowledgement_status text not null default 'REQUIRED',
    delivered_at timestamptz,
    viewed_at timestamptz,
    acknowledged_at timestamptz,
    acknowledged_by uuid references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(document_id,subject_type,subject_id),
    constraint organisation_terms_subject_check check (subject_type in ('STAFF','INDIVIDUAL','BUSINESS')),
    constraint organisation_terms_delivery_check check (delivery_status in ('PENDING','DELIVERED','FAILED')),
    constraint organisation_terms_ack_check check (acknowledgement_status in ('NOT_REQUIRED','REQUIRED','ACKNOWLEDGED','DECLINED'))
);
create index if not exists organisation_terms_subject_idx on public.organisation_terms_assignments(subject_type,subject_id,acknowledgement_status);

create or replace function public.organisation_route_document(p_document_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare d public.organisation_documents%rowtype; n integer:=0; x integer:=0;
begin
 if not public.is_super_admin() then raise exception 'SUPER_ADMIN access required'; end if;
 select * into d from public.organisation_documents where id=p_document_id;
 if not found then raise exception 'Organisation document not found'; end if;
 if d.audience in ('STAFF','ALL') then
  insert into public.organisation_terms_assignments(document_id,subject_type,subject_id,acknowledgement_status)
  select d.id,'STAFF',p.id,'REQUIRED' from public.profiles p where p.is_active and p.role::text='STAFF' on conflict do nothing;
  get diagnostics x=row_count; n:=n+x;
 end if;
 if d.audience in ('INDIVIDUAL','CLIENT_ALL','ALL') then
  insert into public.organisation_terms_assignments(document_id,subject_type,subject_id,acknowledgement_status)
  select d.id,'INDIVIDUAL',p.id,case when d.is_terms_of_service then 'REQUIRED' else 'NOT_REQUIRED' end from public.profiles p where p.is_active and p.role::text='INDIVIDUAL' on conflict do nothing;
  get diagnostics x=row_count; n:=n+x;
 end if;
 if d.audience in ('BUSINESS','CLIENT_ALL','ALL') then
  insert into public.organisation_terms_assignments(document_id,subject_type,subject_id,acknowledgement_status)
  select d.id,'BUSINESS',b.id,case when d.is_terms_of_service then 'REQUIRED' else 'NOT_REQUIRED' end from public.businesses b where b.is_active on conflict do nothing;
  get diagnostics x=row_count; n:=n+x;
 end if;
 return n;
end; $$;

create or replace function public.organisation_route_active_terms_to_subject(p_subject_type text,p_subject_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare n integer:=0;
begin
 if p_subject_type not in ('STAFF','INDIVIDUAL','BUSINESS') then raise exception 'Invalid subject type'; end if;
 if p_subject_type='STAFF' and not (public.is_super_admin() or public.current_user_role()='STAFF'::app_role) then raise exception 'Authorised staff required'; end if;
 if p_subject_type='INDIVIDUAL' and not (public.is_super_admin() or auth.uid()=p_subject_id) then raise exception 'Authorised client access required'; end if;
 if p_subject_type='BUSINESS' and not (public.is_super_admin() or exists(select 1 from public.businesses b where b.id=p_subject_id and b.owner_user_id=auth.uid())) then raise exception 'Authorised client access required'; end if;
 insert into public.organisation_terms_assignments(document_id,subject_type,subject_id,acknowledgement_status)
 select d.id,p_subject_type,p_subject_id,case when d.is_terms_of_service then 'REQUIRED' else 'NOT_REQUIRED' end
 from public.organisation_documents d where d.is_active and (d.audience='ALL' or d.audience='CLIENT_ALL' or d.audience=p_subject_type) and current_date>=d.effective_from and (d.effective_to is null or current_date<=d.effective_to) on conflict do nothing;
 get diagnostics n=row_count; return n;
end; $$;

insert into storage.buckets(id,name,public) values('organisation-documents','organisation-documents',false) on conflict(id) do nothing;

alter table public.organisation_profiles enable row level security;
alter table public.organisation_documents enable row level security;
alter table public.organisation_terms_assignments enable row level security;

drop policy if exists organisation_profiles_admin_all on public.organisation_profiles;
create policy organisation_profiles_admin_all on public.organisation_profiles for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
drop policy if exists organisation_profiles_staff_select on public.organisation_profiles;
create policy organisation_profiles_staff_select on public.organisation_profiles for select to authenticated using(public.current_user_role()='STAFF'::app_role and is_active);

drop policy if exists organisation_documents_admin_all on public.organisation_documents;
create policy organisation_documents_admin_all on public.organisation_documents for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
drop policy if exists organisation_documents_staff_select on public.organisation_documents;
create policy organisation_documents_staff_select on public.organisation_documents for select to authenticated using(public.current_user_role()='STAFF'::app_role and is_active and audience in('STAFF','ALL'));
drop policy if exists organisation_documents_client_select on public.organisation_documents;
create policy organisation_documents_client_select on public.organisation_documents for select to authenticated using(is_active and audience in('INDIVIDUAL','BUSINESS','CLIENT_ALL','ALL'));

drop policy if exists organisation_terms_admin_all on public.organisation_terms_assignments;
create policy organisation_terms_admin_all on public.organisation_terms_assignments for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());
drop policy if exists organisation_terms_staff_select on public.organisation_terms_assignments;
create policy organisation_terms_staff_select on public.organisation_terms_assignments for select to authenticated using(subject_type='STAFF' and subject_id=auth.uid());
drop policy if exists organisation_terms_individual_select on public.organisation_terms_assignments;
create policy organisation_terms_individual_select on public.organisation_terms_assignments for select to authenticated using(subject_type='INDIVIDUAL' and subject_id=auth.uid());
drop policy if exists organisation_terms_business_select on public.organisation_terms_assignments;
create policy organisation_terms_business_select on public.organisation_terms_assignments for select to authenticated using(subject_type='BUSINESS' and subject_id in(select b.id from public.businesses b where b.owner_user_id=auth.uid()));
drop policy if exists organisation_terms_ack_update on public.organisation_terms_assignments;
create policy organisation_terms_ack_update on public.organisation_terms_assignments for update to authenticated using((subject_type='INDIVIDUAL' and subject_id=auth.uid()) or (subject_type='BUSINESS' and subject_id in(select b.id from public.businesses b where b.owner_user_id=auth.uid())) or (subject_type='STAFF' and subject_id=auth.uid()) or public.is_super_admin()) with check((subject_type='INDIVIDUAL' and subject_id=auth.uid()) or (subject_type='BUSINESS' and subject_id in(select b.id from public.businesses b where b.owner_user_id=auth.uid())) or (subject_type='STAFF' and subject_id=auth.uid()) or public.is_super_admin());

drop policy if exists organisation_documents_storage_admin on storage.objects;
create policy organisation_documents_storage_admin on storage.objects for all to authenticated using(bucket_id='organisation-documents' and public.is_super_admin()) with check(bucket_id='organisation-documents' and public.is_super_admin());

comment on table public.organisation_profiles is 'Isaacs & Partners single source of truth for issuer, tax, banking and document defaults.';
comment on table public.organisation_documents is 'Authoritative business policies, terms and operational documents with audience routing.';
comment on table public.organisation_terms_assignments is 'Versioned distribution and acknowledgement state for applicable staff and clients.';
