-- Isaacs & Partners
-- Authority -> Permission -> Action Execution
-- Adds explicit action permissions to authority records so Super Admins can
-- remain the highest organisational authority while still being individually
-- constrained by the permissions granted to their authority record.

begin;

alter table public.authority_directory
  add column if not exists action_permissions jsonb not null default '{}'::jsonb;

create index if not exists authority_directory_action_permissions_gin_idx
  on public.authority_directory using gin (action_permissions);

create table if not exists public.authority_action_audit (
  id uuid primary key default gen_random_uuid(),
  authority_id uuid references public.authority_directory(id) on delete set null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_phone text,
  action text not null,
  target_type text,
  target_id text,
  request_text text,
  decision text not null,
  reason text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint authority_action_audit_decision_check check (decision in ('AUTHORISED','DENIED','EXECUTED','FAILED'))
);

create index if not exists authority_action_audit_authority_idx
  on public.authority_action_audit(authority_id, created_at desc);
create index if not exists authority_action_audit_actor_idx
  on public.authority_action_audit(actor_user_id, created_at desc);
create index if not exists authority_action_audit_action_idx
  on public.authority_action_audit(action, created_at desc);

alter table public.authority_action_audit enable row level security;

revoke all on public.authority_action_audit from anon, authenticated;
grant select on public.authority_action_audit to authenticated;

drop policy if exists authority_action_audit_super_admin_select on public.authority_action_audit;
create policy authority_action_audit_super_admin_select
on public.authority_action_audit
for select to authenticated
using (public.is_super_admin() or actor_user_id = auth.uid());

commit;
