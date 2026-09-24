create table if not exists public.immigration_application_documents (
  id uuid primary key default gen_random_uuid(),
  matter_id uuid references public.matters(id) on delete set null,
  client_user_id uuid references auth.users(id) on delete set null,
  case_type text not null,
  template_path text not null,
  template_sha256 text,
  generated_path text,
  status text not null default 'DRAFT' check (status in ('DRAFT','GENERATED','NEEDS_REVIEW','APPROVED','REJECTED','SUBMITTED')),
  field_manifest jsonb not null default '[]'::jsonb,
  answers_snapshot jsonb not null default '{}'::jsonb,
  checklist jsonb not null default '[]'::jsonb,
  provenance jsonb not null default '{}'::jsonb,
  review_notes text,
  generated_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  generated_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists immigration_app_docs_matter_idx on public.immigration_application_documents(matter_id, created_at desc);
create index if not exists immigration_app_docs_client_idx on public.immigration_application_documents(client_user_id, created_at desc);
create index if not exists immigration_app_docs_status_idx on public.immigration_application_documents(status, updated_at desc);

alter table public.immigration_application_documents enable row level security;

drop policy if exists immigration_app_docs_super_admin on public.immigration_application_documents;
create policy immigration_app_docs_super_admin on public.immigration_application_documents
for all to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

insert into storage.buckets (id,name,public)
values ('immigration-generated','immigration-generated',false)
on conflict (id) do update set public=false;

drop policy if exists immigration_generated_super_admin on storage.objects;
create policy immigration_generated_super_admin on storage.objects
for all to authenticated
using (bucket_id='immigration-generated' and public.is_super_admin())
with check (bucket_id='immigration-generated' and public.is_super_admin());
