-- Isaacs & Partners
-- PR50 correction pass.
-- This migration follows 202609030002 and corrects its RPCs against the exact
-- PR49 column names while tightening client visibility of payment gates.

-- ---------------------------------------------------------------------------
-- Conversation messages: exact PR49 schema is sender_type/direction and has
-- sender_user_id, not role/created_by.
-- ---------------------------------------------------------------------------

create or replace function public.ai_append_conversation_message(
    p_conversation_id uuid,
    p_sender_type text,
    p_direction text,
    p_body text,
    p_intent text default null,
    p_service_domain text default null,
    p_metadata jsonb default '{}'::jsonb
) returns public.ai_conversation_messages
language plpgsql security definer set search_path=public
as $$
declare
    v_conversation public.ai_conversations;
    v_message public.ai_conversation_messages;
    v_user uuid := auth.uid();
    v_sender text := upper(trim(p_sender_type));
    v_direction text := upper(trim(p_direction));
begin
    if nullif(trim(p_body),'') is null then raise exception 'Message body is required.' using errcode='22023'; end if;
    if v_sender not in ('CLIENT','AI','STAFF','SUPER_ADMIN','SYSTEM') then raise exception 'Invalid sender type.' using errcode='22023'; end if;
    if v_direction not in ('INBOUND','OUTBOUND','INTERNAL') then raise exception 'Invalid message direction.' using errcode='22023'; end if;

    select * into v_conversation from public.ai_conversations where id=p_conversation_id;
    if v_conversation.id is null then raise exception 'Conversation not found.' using errcode='P0002'; end if;

    if v_sender='CLIENT' and v_conversation.client_user_id is distinct from v_user and not public.is_super_admin() then
        raise exception 'Conversation access denied.' using errcode='42501';
    end if;
    if v_sender in ('AI','SYSTEM') and not (auth.role()='service_role' or public.is_super_admin()) then
        raise exception 'Only the trusted server may create AI/system messages.' using errcode='42501';
    end if;
    if v_sender='STAFF' and not (public.is_super_admin() or (public.staff_ai_can(v_user,'LIAISE_WITH_AI') and public.staff_ai_can(v_user,'ANSWER_AI_QUERIES'))) then
        raise exception 'You are not authorised to message this AI conversation.' using errcode='42501';
    end if;
    if v_sender='SUPER_ADMIN' and not public.is_super_admin() and auth.role()<>'service_role' then
        raise exception 'Only Super Admin may create Super Admin messages.' using errcode='42501';
    end if;

    insert into public.ai_conversation_messages(
        conversation_id,sender_type,sender_user_id,direction,channel,body,intent,service_domain,metadata
    ) values (
        p_conversation_id,v_sender,v_user,v_direction,v_conversation.channel,trim(p_body),p_intent,p_service_domain,coalesce(p_metadata,'{}'::jsonb)
    ) returning * into v_message;

    update public.ai_conversations
       set last_intent=coalesce(p_intent,last_intent),
           service_domain=coalesce(p_service_domain,service_domain),
           last_message_at=now(), updated_at=now()
     where id=p_conversation_id;

    return v_message;
end;
$$;

revoke all on function public.ai_append_conversation_message(uuid,text,text,text,text,text,jsonb) from public;
grant execute on function public.ai_append_conversation_message(uuid,text,text,text,text,text,jsonb) to authenticated,service_role;

-- ---------------------------------------------------------------------------
-- Payment gate: clients may only evaluate invoices belonging to themselves;
-- staff/Super Admin/server may evaluate authorised operational invoices.
-- ---------------------------------------------------------------------------

create or replace function public.ai_payment_gate(
    p_invoice_id uuid,
    p_required_percent numeric default 50
) returns boolean
language plpgsql security definer set search_path=public
as $$
declare
    v_allowed boolean := false;
    v_amount numeric;
begin
    if p_required_percent not in (50,100) then raise exception 'Only 50% or 100% payment gates are supported.' using errcode='22023'; end if;

    select i.amount,
           (
             public.is_super_admin()
             or auth.role()='service_role'
             or i.individual_user_id=auth.uid()
             or exists(select 1 from public.businesses b where b.id=i.business_id and b.owner_user_id=auth.uid())
             or exists(
                 select 1 from public.assignments a
                 join public.staff s on s.id=a.staff_id
                 where a.matter_id=i.matter_id and a.status='ACTIVE'::assignment_status and s.user_id=auth.uid() and s.is_active=true
             )
           )
      into v_amount,v_allowed
      from public.invoices i
     where i.id=p_invoice_id;

    if not found or not v_allowed or coalesce(v_amount,0)<=0 then return false; end if;
    return public.ai_invoice_paid_amount(p_invoice_id) >= round(v_amount*p_required_percent/100.0,2);
end;
$$;
revoke all on function public.ai_payment_gate(uuid,numeric) from public;
grant execute on function public.ai_payment_gate(uuid,numeric) to authenticated,service_role;

-- ---------------------------------------------------------------------------
-- AI event actor identity: service-role events are AI/SYSTEM rather than a
-- misleading STAFF actor with a null user id.
-- ---------------------------------------------------------------------------

create or replace function public.ai_record_event(
    p_conversation_id uuid,
    p_event_type text,
    p_payload jsonb default '{}'::jsonb,
    p_matter_id uuid default null
) returns public.ai_agent_events
language plpgsql security definer set search_path=public
as $$
declare
    v_event public.ai_agent_events;
    v_actor_type text;
begin
    if not (auth.role()='service_role' or public.is_super_admin() or public.staff_ai_can(auth.uid(),'LIAISE_WITH_AI')) then
        raise exception 'Not authorised to record AI events.' using errcode='42501';
    end if;
    v_actor_type := case when auth.role()='service_role' then 'AI' when public.is_super_admin() then 'SUPER_ADMIN' else 'STAFF' end;
    insert into public.ai_agent_events(conversation_id,matter_id,event_type,actor_type,actor_user_id,payload)
    values(p_conversation_id,p_matter_id,trim(p_event_type),v_actor_type,auth.uid(),coalesce(p_payload,'{}'::jsonb))
    returning * into v_event;
    return v_event;
end;
$$;
revoke all on function public.ai_record_event(uuid,text,jsonb,uuid) from public;
grant execute on function public.ai_record_event(uuid,text,jsonb,uuid) to authenticated,service_role;

-- ---------------------------------------------------------------------------
-- Final payment gate remains authoritative and now inherits the secured
-- invoice ownership/assignment check above.
-- ---------------------------------------------------------------------------

create or replace function public.ai_can_submit_matter(p_matter_id uuid,p_invoice_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$
    select exists(
        select 1 from public.invoices i
        where i.id=p_invoice_id and i.matter_id=p_matter_id and public.ai_payment_gate(i.id,100)
    );
$$;
revoke all on function public.ai_can_submit_matter(uuid,uuid) from public;
grant execute on function public.ai_can_submit_matter(uuid,uuid) to authenticated,service_role;

create or replace function public.ai_can_open_matter(p_matter_id uuid,p_deposit_invoice_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$
    select exists(
        select 1 from public.invoices i
        where i.id=p_deposit_invoice_id and i.matter_id=p_matter_id and public.ai_payment_gate(i.id,50)
    );
$$;
revoke all on function public.ai_can_open_matter(uuid,uuid) from public;
grant execute on function public.ai_can_open_matter(uuid,uuid) to authenticated,service_role;
