-- Isaacs & Partners
-- PR49: AI Liaison Control Plane
-- Supabase is the authoritative state store for AI/client/staff liaison.
-- Super Admin always supersedes staff permissions and is mandatory in human review.

begin;

create table if not exists public.ai_conversations (
    id uuid primary key default gen_random_uuid(),
    client_user_id uuid references public.profiles(id) on delete set null,
    matter_id uuid references public.matters(id) on delete set null,
    chat_id text,
    phone_number text,
    channel text not null default 'WHATSAPP',
    state text not null default 'AI_ACTIVE',
    service_domain text,
    last_intent text,
    last_service text,
    facts jsonb not null default '{}'::jsonb,
    metadata jsonb not null default '{}'::jsonb,
    last_message_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint ai_conversations_state_check check (state in ('AI_ACTIVE','AI_ESCALATED','HUMAN_ACTIVE','HUMAN_RESOLVED','AI_RESUMED')),
    constraint ai_conversations_channel_check check (channel in ('WHATSAPP','PORTAL','EMAIL','OTHER'))
);
create unique index if not exists ai_conversations_chat_uidx on public.ai_conversations(chat_id) where chat_id is not null;
create index if not exists ai_conversations_client_idx on public.ai_conversations(client_user_id, updated_at desc);
create index if not exists ai_conversations_matter_idx on public.ai_conversations(matter_id, updated_at desc);

create table if not exists public.ai_conversation_messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
    sender_type text not null,
    sender_user_id uuid references public.profiles(id) on delete set null,
    direction text not null,
    channel text not null default 'WHATSAPP',
    body text not null,
    intent text,
    service_domain text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    constraint ai_conversation_messages_sender_check check (sender_type in ('CLIENT','AI','STAFF','SUPER_ADMIN','SYSTEM')),
    constraint ai_conversation_messages_direction_check check (direction in ('INBOUND','OUTBOUND','INTERNAL'))
);
create index if not exists ai_conversation_messages_conversation_idx on public.ai_conversation_messages(conversation_id, created_at);

create table if not exists public.staff_ai_permissions (
    id uuid primary key default gen_random_uuid(),
    staff_user_id uuid not null unique references public.profiles(id) on delete cascade,
    can_liaise_with_ai boolean not null default false,
    can_answer_ai_queries boolean not null default false,
    can_relay_to_clients boolean not null default false,
    can_handle_appointments boolean not null default false,
    can_provide_pricing boolean not null default false,
    can_approve_quotes boolean not null default false,
    can_handle_immigration boolean not null default false,
    can_handle_hr boolean not null default false,
    can_handle_business_compliance boolean not null default false,
    can_handle_legal boolean not null default false,
    is_active boolean not null default true,
    granted_by uuid references public.profiles(id) on delete set null,
    granted_at timestamptz not null default now(),
    updated_by uuid references public.profiles(id) on delete set null,
    updated_at timestamptz not null default now()
);
create index if not exists staff_ai_permissions_active_idx on public.staff_ai_permissions(staff_user_id, is_active);

create table if not exists public.staff_ai_permission_audit (
    id uuid primary key default gen_random_uuid(),
    staff_user_id uuid not null references public.profiles(id) on delete cascade,
    capability text not null,
    old_value boolean not null default false,
    new_value boolean not null default false,
    changed_by uuid not null references public.profiles(id) on delete restrict,
    changed_at timestamptz not null default now(),
    metadata jsonb not null default '{}'::jsonb
);
create index if not exists staff_ai_permission_audit_staff_idx on public.staff_ai_permission_audit(staff_user_id, changed_at desc);

create table if not exists public.human_interventions (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
    matter_id uuid references public.matters(id) on delete set null,
    client_user_id uuid references public.profiles(id) on delete set null,
    assigned_staff_id uuid references public.profiles(id) on delete set null,
    super_admin_required boolean not null default true,
    status text not null default 'PENDING',
    reason text not null,
    priority text not null default 'NORMAL',
    question text not null,
    ai_context jsonb not null default '{}'::jsonb,
    staff_response text,
    super_admin_response text,
    resolved_by uuid references public.profiles(id) on delete set null,
    resolved_at timestamptz,
    relayed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint human_interventions_status_check check (status in ('PENDING','ASSIGNED','STAFF_RESPONDED','SUPER_ADMIN_REVIEW','ANSWERED','RELAYED_TO_CLIENT','CLOSED')),
    constraint human_interventions_priority_check check (priority in ('LOW','NORMAL','HIGH','URGENT')),
    constraint human_interventions_super_admin_check check (super_admin_required = true)
);
create index if not exists human_interventions_status_idx on public.human_interventions(status, priority, created_at);
create index if not exists human_interventions_staff_idx on public.human_interventions(assigned_staff_id, status, updated_at desc);
create index if not exists human_interventions_client_idx on public.human_interventions(client_user_id, created_at desc);
create index if not exists human_interventions_conversation_idx on public.human_interventions(conversation_id, created_at desc);

create table if not exists public.ai_agent_events (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid references public.ai_conversations(id) on delete set null,
    matter_id uuid references public.matters(id) on delete set null,
    event_type text not null,
    actor_type text not null default 'AI',
    actor_user_id uuid references public.profiles(id) on delete set null,
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    constraint ai_agent_events_actor_check check (actor_type in ('AI','CLIENT','STAFF','SUPER_ADMIN','SYSTEM'))
);
create index if not exists ai_agent_events_conversation_idx on public.ai_agent_events(conversation_id, created_at desc);
create index if not exists ai_agent_events_matter_idx on public.ai_agent_events(matter_id, created_at desc);

create or replace function public.set_ai_liaison_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

drop trigger if exists ai_conversations_updated_at on public.ai_conversations;
create trigger ai_conversations_updated_at before update on public.ai_conversations for each row execute function public.set_ai_liaison_updated_at();
drop trigger if exists staff_ai_permissions_updated_at on public.staff_ai_permissions;
create trigger staff_ai_permissions_updated_at before update on public.staff_ai_permissions for each row execute function public.set_ai_liaison_updated_at();
drop trigger if exists human_interventions_updated_at on public.human_interventions;
create trigger human_interventions_updated_at before update on public.human_interventions for each row execute function public.set_ai_liaison_updated_at();

-- User-scoped Super Admin resolver. This is evaluated from authoritative profiles,
-- not browser metadata.
create or replace function public.is_super_admin_for_user(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1
        from public.profiles p
        where p.id = p_user_id
          and upper(p.role::text) = 'SUPER_ADMIN'
          and coalesce(p.is_active, true) = true
    );
$$;

create or replace function public.staff_ai_can(p_staff_user_id uuid, p_capability text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select public.is_super_admin_for_user(p_staff_user_id)
        or exists (
            select 1
            from public.staff_ai_permissions p
            join public.staff s on s.user_id = p.staff_user_id
            where p.staff_user_id = p_staff_user_id
              and p.is_active = true
              and s.is_active = true
              and case upper(p_capability)
                when 'LIAISE_WITH_AI' then p.can_liaise_with_ai
                when 'ANSWER_AI_QUERIES' then p.can_answer_ai_queries
                when 'RELAY_TO_CLIENTS' then p.can_relay_to_clients
                when 'HANDLE_APPOINTMENTS' then p.can_handle_appointments
                when 'PROVIDE_PRICING' then p.can_provide_pricing
                when 'APPROVE_QUOTES' then p.can_approve_quotes
                when 'HANDLE_IMMIGRATION' then p.can_handle_immigration
                when 'HANDLE_HR' then p.can_handle_hr
                when 'HANDLE_BUSINESS_COMPLIANCE' then p.can_handle_business_compliance
                when 'HANDLE_LEGAL' then p.can_handle_legal
                else false end
        );
$$;

alter table public.ai_conversations enable row level security;
alter table public.ai_conversation_messages enable row level security;
alter table public.staff_ai_permissions enable row level security;
alter table public.staff_ai_permission_audit enable row level security;
alter table public.human_interventions enable row level security;
alter table public.ai_agent_events enable row level security;

drop policy if exists ai_conversations_client_select on public.ai_conversations;
create policy ai_conversations_client_select on public.ai_conversations for select to authenticated
using (client_user_id = auth.uid() or public.is_super_admin());
drop policy if exists ai_conversations_staff_select on public.ai_conversations;
create policy ai_conversations_staff_select on public.ai_conversations for select to authenticated
using (public.is_super_admin() or (public.current_user_role() = 'STAFF'::app_role and public.has_staff_permission('view_communications') and (matter_id is null or public.staff_can_access_matter(matter_id, 'view_communications'))));
drop policy if exists ai_conversations_client_insert on public.ai_conversations;
create policy ai_conversations_client_insert on public.ai_conversations for insert to authenticated
with check (client_user_id = auth.uid());
drop policy if exists ai_conversations_staff_update on public.ai_conversations;
create policy ai_conversations_staff_update on public.ai_conversations for update to authenticated
using (public.is_super_admin() or (public.current_user_role() = 'STAFF'::app_role and public.has_staff_permission('manage_communications') and (matter_id is null or public.staff_can_access_matter(matter_id, 'manage_communications'))))
with check (public.is_super_admin() or (public.current_user_role() = 'STAFF'::app_role and public.has_staff_permission('manage_communications') and (matter_id is null or public.staff_can_access_matter(matter_id, 'manage_communications'))));

drop policy if exists ai_messages_authorised_select on public.ai_conversation_messages;
create policy ai_messages_authorised_select on public.ai_conversation_messages for select to authenticated
using (public.is_super_admin() or exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.client_user_id = auth.uid()) or (public.current_user_role() = 'STAFF'::app_role and public.has_staff_permission('view_communications')));

drop policy if exists staff_ai_permissions_self_select on public.staff_ai_permissions;
create policy staff_ai_permissions_self_select on public.staff_ai_permissions for select to authenticated
using (staff_user_id = auth.uid() or public.is_super_admin());
drop policy if exists staff_ai_permissions_super_admin_write on public.staff_ai_permissions;
create policy staff_ai_permissions_super_admin_write on public.staff_ai_permissions for all to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists staff_ai_permission_audit_super_admin_select on public.staff_ai_permission_audit;
create policy staff_ai_permission_audit_super_admin_select on public.staff_ai_permission_audit for select to authenticated
using (public.is_super_admin() or changed_by = auth.uid() or staff_user_id = auth.uid());

drop policy if exists human_interventions_authorised_select on public.human_interventions;
create policy human_interventions_authorised_select on public.human_interventions for select to authenticated
using (public.is_super_admin() or client_user_id = auth.uid() or assigned_staff_id = auth.uid() or (public.current_user_role() = 'STAFF'::app_role and public.has_staff_permission('view_communications') and (matter_id is null or public.staff_can_access_matter(matter_id, 'view_communications'))));
drop policy if exists human_interventions_authorised_update on public.human_interventions;
create policy human_interventions_authorised_update on public.human_interventions for update to authenticated
using (public.is_super_admin() or assigned_staff_id = auth.uid() or (public.current_user_role() = 'STAFF'::app_role and public.staff_ai_can(auth.uid(), 'ANSWER_AI_QUERIES') and assigned_staff_id is null))
with check (public.is_super_admin() or assigned_staff_id = auth.uid() or public.staff_ai_can(auth.uid(), 'ANSWER_AI_QUERIES'));

drop policy if exists ai_agent_events_authorised_select on public.ai_agent_events;
create policy ai_agent_events_authorised_select on public.ai_agent_events for select to authenticated
using (public.is_super_admin() or actor_user_id = auth.uid() or exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.client_user_id = auth.uid()) or (public.current_user_role() = 'STAFF'::app_role and public.has_staff_permission('view_communications')));

revoke all on public.ai_agent_events from anon, authenticated;
grant select on public.ai_agent_events to authenticated;
revoke all on public.ai_conversation_messages from anon, authenticated;
grant select on public.ai_conversation_messages to authenticated;
grant select on public.ai_conversations, public.staff_ai_permissions, public.staff_ai_permission_audit, public.human_interventions to authenticated;

-- Only Super Admin may mutate the AI authority matrix. Every changed capability
-- is written to the audit ledger.
create or replace function public.audit_staff_ai_permission_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_changed_by uuid := auth.uid();
begin
    if v_changed_by is null or not public.is_super_admin() then
        raise exception 'Only Super Admin may change AI liaison permissions.' using errcode = '42501';
    end if;

    if tg_op = 'INSERT' then
        insert into public.staff_ai_permission_audit(staff_user_id, capability, old_value, new_value, changed_by)
        values
        (new.staff_user_id,'LIAISE_WITH_AI',false,new.can_liaise_with_ai,v_changed_by),
        (new.staff_user_id,'ANSWER_AI_QUERIES',false,new.can_answer_ai_queries,v_changed_by),
        (new.staff_user_id,'RELAY_TO_CLIENTS',false,new.can_relay_to_clients,v_changed_by),
        (new.staff_user_id,'HANDLE_APPOINTMENTS',false,new.can_handle_appointments,v_changed_by),
        (new.staff_user_id,'PROVIDE_PRICING',false,new.can_provide_pricing,v_changed_by),
        (new.staff_user_id,'APPROVE_QUOTES',false,new.can_approve_quotes,v_changed_by),
        (new.staff_user_id,'HANDLE_IMMIGRATION',false,new.can_handle_immigration,v_changed_by),
        (new.staff_user_id,'HANDLE_HR',false,new.can_handle_hr,v_changed_by),
        (new.staff_user_id,'HANDLE_BUSINESS_COMPLIANCE',false,new.can_handle_business_compliance,v_changed_by),
        (new.staff_user_id,'HANDLE_LEGAL',false,new.can_handle_legal,v_changed_by);
        new.granted_by := coalesce(new.granted_by,v_changed_by);
        new.updated_by := v_changed_by;
        return new;
    end if;

    insert into public.staff_ai_permission_audit(staff_user_id, capability, old_value, new_value, changed_by)
    select new.staff_user_id, x.capability, x.old_value, x.new_value, v_changed_by
    from (values
      ('LIAISE_WITH_AI',old.can_liaise_with_ai,new.can_liaise_with_ai),
      ('ANSWER_AI_QUERIES',old.can_answer_ai_queries,new.can_answer_ai_queries),
      ('RELAY_TO_CLIENTS',old.can_relay_to_clients,new.can_relay_to_clients),
      ('HANDLE_APPOINTMENTS',old.can_handle_appointments,new.can_handle_appointments),
      ('PROVIDE_PRICING',old.can_provide_pricing,new.can_provide_pricing),
      ('APPROVE_QUOTES',old.can_approve_quotes,new.can_approve_quotes),
      ('HANDLE_IMMIGRATION',old.can_handle_immigration,new.can_handle_immigration),
      ('HANDLE_HR',old.can_handle_hr,new.can_handle_hr),
      ('HANDLE_BUSINESS_COMPLIANCE',old.can_handle_business_compliance,new.can_handle_business_compliance),
      ('HANDLE_LEGAL',old.can_handle_legal,new.can_handle_legal)
    ) x(capability,old_value,new_value)
    where x.old_value is distinct from x.new_value;
    new.updated_by := v_changed_by;
    return new;
end;
$$;

drop trigger if exists staff_ai_permission_audit_trigger on public.staff_ai_permissions;
create trigger staff_ai_permission_audit_trigger before insert or update on public.staff_ai_permissions
for each row execute function public.audit_staff_ai_permission_changes();

create or replace function public.create_human_intervention(
    p_conversation_id uuid,
    p_reason text,
    p_question text,
    p_priority text default 'NORMAL',
    p_assigned_staff_id uuid default null,
    p_matter_id uuid default null,
    p_client_user_id uuid default null,
    p_ai_context jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_id uuid;
    v_client uuid;
    v_matter uuid;
begin
    if auth.uid() is null then raise exception 'Authentication required.' using errcode = '42501'; end if;

    select c.client_user_id,c.matter_id into v_client,v_matter from public.ai_conversations c where c.id=p_conversation_id;
    v_client := coalesce(v_client,p_client_user_id);
    v_matter := coalesce(v_matter,p_matter_id);

    if not public.is_super_admin() and auth.uid() <> coalesce(v_client,auth.uid()) and not public.staff_ai_can(auth.uid(),'LIAISE_WITH_AI') then
        raise exception 'AI liaison authority required.' using errcode = '42501';
    end if;

    if p_assigned_staff_id is not null and (not public.staff_ai_can(p_assigned_staff_id,'LIAISE_WITH_AI') or not public.staff_ai_can(p_assigned_staff_id,'ANSWER_AI_QUERIES')) then
        raise exception 'Assigned staff member is not authorised to answer AI queries.' using errcode = '42501';
    end if;

    insert into public.human_interventions(conversation_id,matter_id,client_user_id,assigned_staff_id,super_admin_required,status,reason,priority,question,ai_context)
    values(p_conversation_id,v_matter,v_client,p_assigned_staff_id,true,case when p_assigned_staff_id is null then 'PENDING' else 'ASSIGNED' end,nullif(trim(p_reason),''),upper(coalesce(p_priority,'NORMAL')),nullif(trim(p_question),''),coalesce(p_ai_context,'{}'::jsonb))
    returning id into v_id;

    update public.ai_conversations set state='AI_ESCALATED',updated_at=now() where id=p_conversation_id;
    return v_id;
end;
$$;

revoke all on function public.create_human_intervention(uuid,text,text,text,uuid,uuid,uuid,jsonb) from public,anon;
grant execute on function public.create_human_intervention(uuid,text,text,text,uuid,uuid,uuid,jsonb) to authenticated,service_role;

comment on table public.staff_ai_permissions is 'Super Admin-controlled AI liaison authority matrix.';
comment on table public.staff_ai_permission_audit is 'Audit trail for Super Admin AI authority changes.';
comment on table public.human_interventions is 'Human escalation queue; Super Admin review is mandatory.';
comment on table public.ai_conversations is 'Authoritative AI conversation and handover state.';

commit;
