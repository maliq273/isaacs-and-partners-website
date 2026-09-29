begin;
create table if not exists public.immigration_application_intakes(
 id uuid primary key default gen_random_uuid(),
 matter_id uuid not null references public.matters(id) on delete cascade,
 client_user_id uuid references auth.users(id) on delete set null,
 form_code text not null,
 form_version text not null,
 status text not null default 'IN_PROGRESS',
 answers jsonb not null default '{}'::jsonb,
 answer_states jsonb not null default '{}'::jsonb,
 document_checklist jsonb not null default '[]'::jsonb,
 progress jsonb not null default '{}'::jsonb,
 field_audit jsonb not null default '{}'::jsonb,
 current_question_key text,
 draft_document_id uuid references public.immigration_application_documents(id) on delete set null,
 audit_log jsonb not null default '[]'::jsonb,
 last_interaction_at timestamptz,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(matter_id,form_code)
);
create index if not exists immigration_application_intakes_client_idx on public.immigration_application_intakes(client_user_id);
create index if not exists immigration_application_intakes_matter_idx on public.immigration_application_intakes(matter_id);
create index if not exists immigration_application_intakes_status_idx on public.immigration_application_intakes(status);

alter table public.immigration_application_intakes enable row level security;
revoke all on public.immigration_application_intakes from anon,authenticated;
grant select,insert,update on public.immigration_application_intakes to authenticated;

drop policy if exists immigration_application_intakes_select on public.immigration_application_intakes;
create policy immigration_application_intakes_select on public.immigration_application_intakes for select to authenticated
using((select auth.uid())=client_user_id or public.is_super_admin() or ((select public.current_user_role())='STAFF'::public.app_role and public.staff_can_access_matter(matter_id,'view_matters')));

drop policy if exists immigration_application_intakes_insert on public.immigration_application_intakes;
create policy immigration_application_intakes_insert on public.immigration_application_intakes for insert to authenticated
with check((select auth.uid())=client_user_id and exists(select 1 from public.matters m where m.id=matter_id and m.individual_user_id=(select auth.uid())));

drop policy if exists immigration_application_intakes_update on public.immigration_application_intakes;
create policy immigration_application_intakes_update on public.immigration_application_intakes for update to authenticated
using((select auth.uid())=client_user_id or public.is_super_admin() or ((select public.current_user_role())='STAFF'::public.app_role and public.staff_can_access_matter(matter_id,'edit_matters')))
with check((select auth.uid())=client_user_id or public.is_super_admin() or ((select public.current_user_role())='STAFF'::public.app_role and public.staff_can_access_matter(matter_id,'edit_matters')));

alter table public.immigration_application_documents enable row level security;
drop policy if exists immigration_app_docs_client_select on public.immigration_application_documents;
create policy immigration_app_docs_client_select on public.immigration_application_documents for select to authenticated
using(client_user_id=(select auth.uid()) or public.is_super_admin() or ((select public.current_user_role())='STAFF'::public.app_role and public.staff_can_access_matter(matter_id,'view_matters')));
commit;