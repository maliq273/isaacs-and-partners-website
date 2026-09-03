-- Isaacs & Partners
-- AI Liaison Control Plane hardening
--
-- Purpose:
--   1. Make human-intervention state changes server-controlled.
--   2. Enforce authorised staff/Super Admin responses.
--   3. Provide safe AI conversation/message RPCs.
--   4. Provide appointment booking through staff IDs.
--   5. Enforce quote/deposit/final-payment gates for matter workflows.
--
-- This migration deliberately reuses the existing matters, quotes, invoices,
-- payments, appointments and staff tables. It does not create parallel ledgers.

create or replace function public.ai_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select public.is_super_admin();
$$;

revoke all on function public.ai_is_super_admin() from public;
grant execute on function public.ai_is_super_admin() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Human intervention: controlled response/assignment lifecycle
-- ---------------------------------------------------------------------------

create or replace function public.ai_assign_human_intervention(
    p_intervention_id uuid,
    p_staff_user_id uuid default null
)
returns public.human_interventions
language plpgsql
security definer
set search_path = public
as $$
declare
    v_row public.human_interventions;
begin
    if not (public.is_super_admin() or public.staff_ai_can(p_staff_user_id, 'LIAISE_WITH_AI') and public.staff_ai_can(p_staff_user_id, 'ANSWER_AI_QUERIES')) then
        raise exception 'Staff member is not authorised to receive AI interventions.' using errcode = '42501';
    end if;

    update public.human_interventions
       set assigned_staff_id = p_staff_user_id,
           status = 'ASSIGNED',
           updated_at = now()
     where id = p_intervention_id
       and status in ('PENDING','ASSIGNED','SUPER_ADMIN_REVIEW')
    returning * into v_row;

    if v_row.id is null then
        raise exception 'Intervention not found or is not assignable.' using errcode = 'P0002';
    end if;

    return v_row;
end;
$$;

create or replace function public.ai_staff_respond_to_intervention(
    p_intervention_id uuid,
    p_response text,
    p_resolve boolean default false
)
returns public.human_interventions
language plpgsql
security definer
set search_path = public
as $$
declare
    v_row public.human_interventions;
    v_user uuid := auth.uid();
    v_staff_id uuid;
begin
    if nullif(trim(p_response), '') is null then
        raise exception 'A staff response is required.' using errcode = '22023';
    end if;

    select s.id into v_staff_id
      from public.staff s
     where s.user_id = v_user
       and s.is_active = true
     limit 1;

    if not public.is_super_admin() and not public.staff_ai_can(v_user, 'ANSWER_AI_QUERIES') then
        raise exception 'You are not authorised to answer AI interventions.' using errcode = '42501';
    end if;

    select * into v_row
      from public.human_interventions
     where id = p_intervention_id
     for update;

    if v_row.id is null then
        raise exception 'Intervention not found.' using errcode = 'P0002';
    end if;

    if not public.is_super_admin()
       and (v_row.assigned_staff_id is null or v_row.assigned_staff_id <> v_user) then
        raise exception 'This intervention is not assigned to you.' using errcode = '42501';
    end if;

    update public.human_interventions
       set staff_response = trim(p_response),
           status = case when p_resolve then 'ANSWERED' else 'STAFF_RESPONDED' end,
           resolved_by = case when p_resolve then v_user else resolved_by end,
           resolved_at = case when p_resolve then now() else resolved_at end,
           updated_at = now()
     where id = p_intervention_id
     returning * into v_row;

    return v_row;
end;
$$;

create or replace function public.ai_super_admin_respond_to_intervention(
    p_intervention_id uuid,
    p_response text,
    p_resolve boolean default true
)
returns public.human_interventions
language plpgsql
security definer
set search_path = public
as $$
declare
    v_row public.human_interventions;
begin
    if not public.is_super_admin() then
        raise exception 'Only Super Admin may perform this action.' using errcode = '42501';
    end if;

    if nullif(trim(p_response), '') is null then
        raise exception 'A Super Admin response is required.' using errcode = '22023';
    end if;

    update public.human_interventions
       set staff_response = trim(p_response),
           status = case when p_resolve then 'ANSWERED' else 'SUPER_ADMIN_REVIEW' end,
           resolved_by = case when p_resolve then auth.uid() else resolved_by end,
           resolved_at = case when p_resolve then now() else resolved_at end,
           updated_at = now()
     where id = p_intervention_id
       and status in ('PENDING','ASSIGNED','STAFF_RESPONDED','SUPER_ADMIN_REVIEW')
    returning * into v_row;

    if v_row.id is null then
        raise exception 'Intervention not found or cannot be answered.' using errcode = 'P0002';
    end if;

    return v_row;
end;
$$;

create or replace function public.ai_relay_intervention_to_client(
    p_intervention_id uuid,
    p_client_message text
)
returns public.human_interventions
language plpgsql
security definer
set search_path = public
as $$
declare
    v_row public.human_interventions;
begin
    if not public.is_super_admin() and not public.staff_ai_can(auth.uid(), 'RELAY_TO_CLIENT') then
        raise exception 'You are not authorised to relay AI intervention responses.' using errcode = '42501';
    end if;

    if nullif(trim(p_client_message), '') is null then
        raise exception 'Client relay message is required.' using errcode = '22023';
    end if;

    update public.human_interventions
       set status = 'RELAYED_TO_CLIENT',
           updated_at = now(),
           ai_context = coalesce(ai_context, '{}'::jsonb) || jsonb_build_object(
               'last_client_relay', trim(p_client_message),
               'last_client_relayed_at', now()
           )
     where id = p_intervention_id
       and status in ('STAFF_RESPONDED','ANSWERED','SUPER_ADMIN_REVIEW')
    returning * into v_row;

    if v_row.id is null then
        raise exception 'Intervention is not ready for client relay.' using errcode = 'P0002';
    end if;

    return v_row;
end;
$$;

revoke all on function public.ai_assign_human_intervention(uuid,uuid) from public;
revoke all on function public.ai_staff_respond_to_intervention(uuid,text,boolean) from public;
revoke all on function public.ai_super_admin_respond_to_intervention(uuid,text,boolean) from public;
revoke all on function public.ai_relay_intervention_to_client(uuid,text) from public;
grant execute on function public.ai_assign_human_intervention(uuid,uuid) to authenticated, service_role;
grant execute on function public.ai_staff_respond_to_intervention(uuid,text,boolean) to authenticated, service_role;
grant execute on function public.ai_super_admin_respond_to_intervention(uuid,text,boolean) to authenticated, service_role;
grant execute on function public.ai_relay_intervention_to_client(uuid,text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- AI conversation/message persistence
-- ---------------------------------------------------------------------------

create or replace function public.ai_append_conversation_message(
    p_conversation_id uuid,
    p_role text,
    p_body text,
    p_metadata jsonb default '{}'::jsonb
)
returns public.ai_conversation_messages
language plpgsql
security definer
set search_path = public
as $$
declare
    v_conversation public.ai_conversations;
    v_message public.ai_conversation_messages;
    v_user uuid := auth.uid();
begin
    if nullif(trim(p_body), '') is null then
        raise exception 'Message body is required.' using errcode = '22023';
    end if;

    if p_role not in ('USER','AI','STAFF','SYSTEM') then
        raise exception 'Invalid AI conversation message role.' using errcode = '22023';
    end if;

    select * into v_conversation
      from public.ai_conversations
     where id = p_conversation_id;

    if v_conversation.id is null then
        raise exception 'Conversation not found.' using errcode = 'P0002';
    end if;

    if p_role = 'USER' and v_conversation.client_user_id <> v_user and not public.is_super_admin() then
        raise exception 'Conversation access denied.' using errcode = '42501';
    end if;

    if p_role in ('AI','SYSTEM') and not (public.is_super_admin() or auth.role() = 'service_role') then
        raise exception 'Only the trusted server may create AI/system messages.' using errcode = '42501';
    end if;

    if p_role = 'STAFF' and not (public.is_super_admin() or public.staff_ai_can(v_user, 'LIAISE_WITH_AI')) then
        raise exception 'You are not authorised to message this AI conversation.' using errcode = '42501';
    end if;

    insert into public.ai_conversation_messages (conversation_id, role, body, metadata, created_by)
    values (p_conversation_id, p_role, trim(p_body), coalesce(p_metadata, '{}'::jsonb), v_user)
    returning * into v_message;

    update public.ai_conversations
       set updated_at = now()
     where id = p_conversation_id;

    return v_message;
end;
$$;

revoke all on function public.ai_append_conversation_message(uuid,text,text,jsonb) from public;
grant execute on function public.ai_append_conversation_message(uuid,text,text,jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Appointment creation: staff IDs are resolved explicitly.
-- ---------------------------------------------------------------------------

create or replace function public.ai_book_appointment(
    p_client_user_id uuid,
    p_staff_user_id uuid,
    p_starts_at timestamptz,
    p_ends_at timestamptz,
    p_title text,
    p_appointment_type text default 'CONSULTATION',
    p_matter_id uuid default null,
    p_notes text default null
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
    v_staff_id uuid;
    v_appointment public.appointments;
begin
    if not (public.is_super_admin() or public.staff_ai_can(auth.uid(), 'HANDLE_APPOINTMENTS')) then
        raise exception 'You are not authorised to book appointments.' using errcode = '42501';
    end if;

    select s.id into v_staff_id
      from public.staff s
     where s.user_id = p_staff_user_id
       and s.is_active = true
     limit 1;

    if v_staff_id is null then
        raise exception 'Selected staff member is inactive or does not exist.' using errcode = 'P0002';
    end if;

    if p_starts_at >= p_ends_at then
        raise exception 'Appointment start must be before appointment end.' using errcode = '22023';
    end if;

    if exists (
        select 1 from public.appointments a
        where a.assigned_staff_id = v_staff_id
          and a.status in ('SCHEDULED','CONFIRMED')
          and a.starts_at < p_ends_at
          and coalesce(a.ends_at, a.starts_at + interval '1 hour') > p_starts_at
    ) then
        raise exception 'Selected staff member is unavailable for that time.' using errcode = '23P01';
    end if;

    insert into public.appointments (
        matter_id, individual_user_id, assigned_staff_id, appointment_type,
        title, starts_at, ends_at, status, notes, created_by
    )
    values (
        p_matter_id, p_client_user_id, v_staff_id, p_appointment_type,
        trim(p_title), p_starts_at, p_ends_at, 'SCHEDULED', p_notes, auth.uid()
    )
    returning * into v_appointment;

    return v_appointment;
end;
$$;

revoke all on function public.ai_book_appointment(uuid,uuid,timestamptz,timestamptz,text,text,uuid,text) from public;
grant execute on function public.ai_book_appointment(uuid,uuid,timestamptz,timestamptz,text,text,uuid,text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Commercial/payment gates
-- ---------------------------------------------------------------------------

create or replace function public.ai_invoice_paid_amount(p_invoice_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
    select coalesce(sum(p.amount), 0)::numeric
      from public.payments p
     where p.invoice_id = p_invoice_id
       and p.status = 'COMPLETED';
$$;

revoke all on function public.ai_invoice_paid_amount(uuid) from public;
grant execute on function public.ai_invoice_paid_amount(uuid) to authenticated, service_role;

create or replace function public.ai_payment_gate(
    p_invoice_id uuid,
    p_required_percent numeric default 50
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
          from public.invoices i
         where i.id = p_invoice_id
           and i.amount > 0
           and public.ai_invoice_paid_amount(i.id) >= round(i.amount * p_required_percent / 100.0, 2)
    );
$$;

revoke all on function public.ai_payment_gate(uuid,numeric) from public;
grant execute on function public.ai_payment_gate(uuid,numeric) to authenticated, service_role;

create or replace function public.ai_can_open_matter(
    p_matter_id uuid,
    p_deposit_invoice_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.invoices i
        where i.id = p_deposit_invoice_id
          and i.matter_id = p_matter_id
          and public.ai_payment_gate(i.id, 50)
    );
$$;

revoke all on function public.ai_can_open_matter(uuid,uuid) from public;
grant execute on function public.ai_can_open_matter(uuid,uuid) to authenticated, service_role;

create or replace function public.ai_can_submit_matter(
    p_matter_id uuid,
    p_invoice_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.invoices i
        where i.id = p_invoice_id
          and i.matter_id = p_matter_id
          and public.ai_payment_gate(i.id, 100)
    );
$$;

revoke all on function public.ai_can_submit_matter(uuid,uuid) from public;
grant execute on function public.ai_can_submit_matter(uuid,uuid) to authenticated, service_role;

-- Controlled matter-opening check. This does not mutate the matter; the
-- existing matter workflow remains authoritative for status changes.
create or replace function public.ai_assert_matter_payment_gate(
    p_matter_id uuid,
    p_invoice_id uuid,
    p_required_percent numeric default 50
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if not (public.is_super_admin() or auth.role() = 'service_role') then
        raise exception 'Only authorised server/Super Admin may assert the matter payment gate.' using errcode = '42501';
    end if;

    if p_required_percent not in (50,100) then
        raise exception 'Only 50%% or 100%% payment gates are supported.' using errcode = '22023';
    end if;

    if not exists (
        select 1 from public.invoices i
         where i.id = p_invoice_id
           and i.matter_id = p_matter_id
           and public.ai_payment_gate(i.id, p_required_percent)
    ) then
        raise exception 'Payment gate has not been satisfied.' using errcode = '42501';
    end if;
end;
$$;

revoke all on function public.ai_assert_matter_payment_gate(uuid,uuid,numeric) from public;
grant execute on function public.ai_assert_matter_payment_gate(uuid,uuid,numeric) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Auditable AI event helper
-- ---------------------------------------------------------------------------

create or replace function public.ai_record_event(
    p_conversation_id uuid,
    p_event_type text,
    p_payload jsonb default '{}'::jsonb,
    p_matter_id uuid default null
)
returns public.ai_agent_events
language plpgsql
security definer
set search_path = public
as $$
declare
    v_event public.ai_agent_events;
begin
    if not (public.is_super_admin() or auth.role() = 'service_role' or public.staff_ai_can(auth.uid(), 'LIAISE_WITH_AI')) then
        raise exception 'Not authorised to record AI events.' using errcode = '42501';
    end if;

    insert into public.ai_agent_events (conversation_id, matter_id, event_type, payload, created_by)
    values (p_conversation_id, p_matter_id, trim(p_event_type), coalesce(p_payload, '{}'::jsonb), auth.uid())
    returning * into v_event;

    return v_event;
end;
$$;

revoke all on function public.ai_record_event(uuid,text,jsonb,uuid) from public;
grant execute on function public.ai_record_event(uuid,text,jsonb,uuid) to authenticated, service_role;

-- Helpful indexes for the new control-plane operations.
create index if not exists human_interventions_status_priority_idx
    on public.human_interventions(status, priority, created_at);
create index if not exists human_interventions_assigned_staff_idx
    on public.human_interventions(assigned_staff_id, status, created_at);
create index if not exists ai_agent_events_conversation_created_idx
    on public.ai_agent_events(conversation_id, created_at desc);
create index if not exists ai_conversation_messages_conversation_created_idx
    on public.ai_conversation_messages(conversation_id, created_at);

comment on function public.ai_staff_respond_to_intervention(uuid,text,boolean)
    is 'Authorised staff response boundary for AI human-intervention workflows.';
comment on function public.ai_super_admin_respond_to_intervention(uuid,text,boolean)
    is 'Super Admin override/response boundary for AI human-intervention workflows.';
comment on function public.ai_can_open_matter(uuid,uuid)
    is 'Returns true only when the linked matter invoice has verified completed payments of at least 50 percent.';
comment on function public.ai_can_submit_matter(uuid,uuid)
    is 'Returns true only when the linked matter invoice has verified completed payments of at least 100 percent.';
