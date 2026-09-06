-- Isaacs & Partners
-- Authenticated AI / client portal completion pass.
-- Completes the existing AI Liaison control plane without creating a second AI
-- engine or a second operational ledger.

begin;

create or replace function public.ensure_client_portal_access()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
    if upper(new.role::text)='CLIENT' then
        insert into public.client_portal_access(user_id,status) values(new.id,'PENDING') on conflict(user_id) do nothing;
    end if;
    return new;
end;
$$;

drop trigger if exists profiles_client_portal_access on public.profiles;
create trigger profiles_client_portal_access after insert or update of role on public.profiles for each row execute function public.ensure_client_portal_access();

insert into public.client_portal_access(user_id,status)
select p.id,'PENDING' from public.profiles p where upper(p.role::text)='CLIENT' on conflict(user_id) do nothing;

create or replace function public.ai_append_conversation_message(
    p_conversation_id uuid,p_sender_type text,p_direction text,p_body text,p_intent text default null,p_service_domain text default null,p_metadata jsonb default '{}'::jsonb
) returns public.ai_conversation_messages
language plpgsql security definer set search_path=public
as $$
declare v_conversation public.ai_conversations; v_message public.ai_conversation_messages; v_user uuid:=auth.uid(); v_sender text:=upper(trim(p_sender_type)); v_direction text:=upper(trim(p_direction)); v_existing_id uuid;
begin
    if nullif(trim(p_body),'') is null then raise exception 'Message body is required.' using errcode='22023'; end if;
    if v_sender not in ('CLIENT','AI','STAFF','SUPER_ADMIN','SYSTEM') then raise exception 'Invalid sender type.' using errcode='22023'; end if;
    if v_direction not in ('INBOUND','OUTBOUND','INTERNAL') then raise exception 'Invalid message direction.' using errcode='22023'; end if;
    select * into v_conversation from public.ai_conversations where id=p_conversation_id;
    if v_conversation.id is null then raise exception 'Conversation not found.' using errcode='P0002'; end if;

    if v_sender='CLIENT' then
        if v_user is null then raise exception 'Authenticated client identity is required.' using errcode='42501'; end if;
        if v_conversation.client_user_id is distinct from v_user and not public.is_super_admin() then raise exception 'Conversation access denied.' using errcode='42501'; end if;
        if not public.is_super_admin() and v_conversation.channel='PORTAL' and public.client_portal_access_status()<>'APPROVED' then raise exception 'Client portal access is not approved.' using errcode='42501'; end if;
        if not public.is_super_admin() and v_conversation.channel<>'PORTAL' then raise exception 'Client browser messages may only use the authenticated portal channel.' using errcode='42501'; end if;
        if p_metadata ? 'client_message_id' then
            select id into v_existing_id from public.ai_conversation_messages where conversation_id=p_conversation_id and sender_type='CLIENT' and metadata->>'client_message_id'=p_metadata->>'client_message_id' order by created_at asc limit 1;
            if v_existing_id is not null then select * into v_message from public.ai_conversation_messages where id=v_existing_id; return v_message; end if;
        end if;
    end if;

    if v_sender in ('AI','SYSTEM') and not (auth.role()='service_role' or public.is_super_admin()) then raise exception 'Only the trusted server may create AI/system messages.' using errcode='42501'; end if;
    if v_sender='STAFF' and not (public.is_super_admin() or (public.staff_ai_can(v_user,'LIAISE_WITH_AI') and public.staff_ai_can(v_user,'ANSWER_AI_QUERIES'))) then raise exception 'You are not authorised to message this AI conversation.' using errcode='42501'; end if;
    if v_sender='SUPER_ADMIN' and not public.is_super_admin() and auth.role()<>'service_role' then raise exception 'Only Super Admin may create Super Admin messages.' using errcode='42501'; end if;

    insert into public.ai_conversation_messages(conversation_id,sender_type,sender_user_id,direction,channel,body,intent,service_domain,metadata)
    values(p_conversation_id,v_sender,v_user,v_direction,v_conversation.channel,trim(p_body),p_intent,p_service_domain,coalesce(p_metadata,'{}'::jsonb)) returning * into v_message;
    update public.ai_conversations set last_intent=coalesce(p_intent,last_intent),service_domain=coalesce(p_service_domain,service_domain),last_message_at=now(),updated_at=now() where id=p_conversation_id;
    return v_message;
end;
$$;
revoke all on function public.ai_append_conversation_message(uuid,text,text,text,text,text,jsonb) from public;
grant execute on function public.ai_append_conversation_message(uuid,text,text,text,text,text,jsonb) to authenticated,service_role;

drop policy if exists ai_conversations_client_insert on public.ai_conversations;
create policy ai_conversations_client_insert on public.ai_conversations for insert to authenticated with check(client_user_id=auth.uid() and channel='PORTAL' and public.client_portal_access_status()='APPROVED');

create or replace function public.client_portal_dashboard_snapshot()
returns jsonb language plpgsql security definer stable set search_path=public
as $$
declare v_user uuid:=auth.uid(); v_status text; v_result jsonb;
begin
    if v_user is null then raise exception 'Authentication required.' using errcode='42501'; end if;
    v_status:=public.client_portal_access_status();
    select jsonb_build_object(
        'access_status',v_status,
        'profile',(select to_jsonb(p) from public.profiles p where p.id=v_user),
        'matters',coalesce((select jsonb_agg(to_jsonb(m) order by m.updated_at desc nulls last,m.created_at desc) from public.matters m where m.individual_user_id=v_user or exists(select 1 from public.businesses b where b.id=m.business_id and b.owner_user_id=v_user)),'[]'::jsonb),
        'documents',coalesce((select jsonb_agg(to_jsonb(d) order by d.updated_at desc nulls last,d.created_at desc) from public.documents d where d.individual_user_id=v_user or exists(select 1 from public.businesses b where b.id=d.business_id and b.owner_user_id=v_user) or exists(select 1 from public.matters m where m.id=d.matter_id and (m.individual_user_id=v_user or exists(select 1 from public.businesses b where b.id=m.business_id and b.owner_user_id=v_user)))),'[]'::jsonb),
        'appointments',coalesce((select jsonb_agg(to_jsonb(a) order by a.starts_at asc) from public.appointments a where a.starts_at>=now() and a.status in ('SCHEDULED','CONFIRMED') and (a.individual_user_id=v_user or exists(select 1 from public.businesses b where b.id=a.business_id and b.owner_user_id=v_user) or exists(select 1 from public.matters m where m.id=a.matter_id and (m.individual_user_id=v_user or exists(select 1 from public.businesses b where b.id=m.business_id and b.owner_user_id=v_user))))),'[]'::jsonb),
        'invoices',coalesce((select jsonb_agg(to_jsonb(i)||jsonb_build_object('authoritative_paid_amount',public.ai_invoice_paid_amount(i.id)) order by i.created_at desc) from public.invoices i where i.individual_user_id=v_user or exists(select 1 from public.businesses b where b.id=i.business_id and b.owner_user_id=v_user) or exists(select 1 from public.matters m where m.id=i.matter_id and (m.individual_user_id=v_user or exists(select 1 from public.businesses b where b.id=m.business_id and b.owner_user_id=v_user)))),'[]'::jsonb),
        'notifications',coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc) from public.notifications n where n.recipient_user_id=v_user),'[]'::jsonb),
        'conversations',coalesce((select jsonb_agg(to_jsonb(c) order by c.updated_at desc) from public.ai_conversations c where c.client_user_id=v_user),'[]'::jsonb)
    ) into v_result;
    return v_result;
end;
$$;
revoke all on function public.client_portal_dashboard_snapshot() from public;
grant execute on function public.client_portal_dashboard_snapshot() to authenticated;

create or replace function public.client_portal_admin_snapshot()
returns jsonb language plpgsql security definer stable set search_path=public
as $$
declare v_result jsonb;
begin
    if not public.is_super_admin() then raise exception 'Only Super Admin may view client portal approvals.' using errcode='42501'; end if;
    select jsonb_build_object(
        'pending_count',count(*) filter(where coalesce(c.status,'PENDING')='PENDING'),
        'approved_count',count(*) filter(where c.status='APPROVED'),
        'suspended_count',count(*) filter(where c.status='SUSPENDED'),
        'clients',coalesce(jsonb_agg(jsonb_build_object('user_id',p.id,'email',p.email,'first_name',p.first_name,'last_name',p.last_name,'phone',p.phone,'role',p.role,'is_active',p.is_active,'access',case when c.user_id is null then jsonb_build_object('status','PENDING') else to_jsonb(c) end) order by coalesce(c.updated_at,c.created_at) desc),'[]'::jsonb)
    ) into v_result
    from public.profiles p left join public.client_portal_access c on c.user_id=p.id where upper(p.role::text)='CLIENT';
    return v_result;
end;
$$;
revoke all on function public.client_portal_admin_snapshot() from public;
grant execute on function public.client_portal_admin_snapshot() to authenticated;

create or replace function public.ai_create_human_intervention(
    p_conversation_id uuid,p_matter_id uuid default null,p_client_user_id uuid default null,p_reason text default 'AI Liaison requested human review.',p_priority text default 'NORMAL',p_question text default '',p_ai_context jsonb default '{}'::jsonb
) returns public.human_interventions language plpgsql security definer set search_path=public
as $$
declare v_row public.human_interventions; v_conversation public.ai_conversations; v_client uuid; v_matter uuid;
begin
    if not(auth.role()='service_role' or public.is_super_admin()) then raise exception 'Only the trusted AI runtime may create human interventions.' using errcode='42501'; end if;
    select * into v_conversation from public.ai_conversations where id=p_conversation_id;
    if v_conversation.id is null then raise exception 'Conversation not found.' using errcode='P0002'; end if;
    v_client:=coalesce(p_client_user_id,v_conversation.client_user_id); v_matter:=coalesce(p_matter_id,v_conversation.matter_id);
    select * into v_row from public.human_interventions where conversation_id=p_conversation_id and status in('PENDING','ASSIGNED','STAFF_RESPONDED','SUPER_ADMIN_REVIEW') order by created_at desc limit 1;
    if v_row.id is not null then return v_row; end if;
    insert into public.human_interventions(conversation_id,matter_id,client_user_id,super_admin_required,status,reason,priority,question,ai_context) values(p_conversation_id,v_matter,v_client,true,'PENDING',coalesce(nullif(trim(p_reason),''),'AI requested human review.'),case when upper(p_priority) in('LOW','NORMAL','HIGH','URGENT') then upper(p_priority) else 'NORMAL' end,coalesce(nullif(trim(p_question),''),'The AI Liaison has requested authorised human review.'),coalesce(p_ai_context,'{}'::jsonb)) returning * into v_row;
    update public.ai_conversations set state='AI_ESCALATED',updated_at=now() where id=p_conversation_id;
    return v_row;
end;
$$;
revoke all on function public.ai_create_human_intervention(uuid,uuid,uuid,text,text,text,jsonb) from public;
grant execute on function public.ai_create_human_intervention(uuid,uuid,uuid,text,text,text,jsonb) to authenticated,service_role;

create or replace function public.ai_assign_human_intervention(p_intervention_id uuid,p_staff_user_id uuid default null)
returns public.human_interventions language plpgsql security definer set search_path=public
as $$
declare v_row public.human_interventions;
begin
    if not(public.is_super_admin() or(p_staff_user_id is not null and public.staff_ai_can(p_staff_user_id,'LIAISE_WITH_AI') and public.staff_ai_can(p_staff_user_id,'ANSWER_AI_QUERIES'))) then raise exception 'Staff member is not authorised to receive AI interventions.' using errcode='42501'; end if;
    update public.human_interventions set assigned_staff_id=p_staff_user_id,status='ASSIGNED',updated_at=now() where id=p_intervention_id and status in('PENDING','ASSIGNED','SUPER_ADMIN_REVIEW') returning * into v_row;
    if v_row.id is null then raise exception 'Intervention not found or is not assignable.' using errcode='P0002'; end if;
    update public.ai_conversations set state='HUMAN_ACTIVE',updated_at=now() where id=v_row.conversation_id;
    return v_row;
end;
$$;

create or replace function public.ai_staff_respond_to_intervention(p_intervention_id uuid,p_response text,p_resolve boolean default false)
returns public.human_interventions language plpgsql security definer set search_path=public
as $$
declare v_row public.human_interventions; v_user uuid:=auth.uid();
begin
    if nullif(trim(p_response),'') is null then raise exception 'A staff response is required.' using errcode='22023'; end if;
    if not public.is_super_admin() and not public.staff_ai_can(v_user,'ANSWER_AI_QUERIES') then raise exception 'You are not authorised to answer AI interventions.' using errcode='42501'; end if;
    select * into v_row from public.human_interventions where id=p_intervention_id for update;
    if v_row.id is null then raise exception 'Intervention not found.' using errcode='P0002'; end if;
    if not public.is_super_admin() and(v_row.assigned_staff_id is null or v_row.assigned_staff_id<>v_user) then raise exception 'This intervention is not assigned to you.' using errcode='42501'; end if;
    update public.human_interventions set staff_response=trim(p_response),status=case when p_resolve then 'ANSWERED' else 'STAFF_RESPONDED' end,resolved_by=case when p_resolve then v_user else resolved_by end,resolved_at=case when p_resolve then now() else resolved_at end,updated_at=now() where id=p_intervention_id returning * into v_row;
    update public.ai_conversations set state=case when p_resolve then 'HUMAN_RESOLVED' else 'HUMAN_ACTIVE' end,updated_at=now() where id=v_row.conversation_id;
    return v_row;
end;
$$;

create or replace function public.ai_super_admin_respond_to_intervention(p_intervention_id uuid,p_response text,p_resolve boolean default true)
returns public.human_interventions language plpgsql security definer set search_path=public
as $$
declare v_row public.human_interventions;
begin
    if not public.is_super_admin() then raise exception 'Only Super Admin may perform this action.' using errcode='42501'; end if;
    if nullif(trim(p_response),'') is null then raise exception 'A Super Admin response is required.' using errcode='22023'; end if;
    update public.human_interventions set staff_response=trim(p_response),status=case when p_resolve then 'ANSWERED' else 'SUPER_ADMIN_REVIEW' end,resolved_by=case when p_resolve then auth.uid() else resolved_by end,resolved_at=case when p_resolve then now() else resolved_at end,updated_at=now() where id=p_intervention_id and status in('PENDING','ASSIGNED','STAFF_RESPONDED','SUPER_ADMIN_REVIEW') returning * into v_row;
    if v_row.id is null then raise exception 'Intervention not found or cannot be answered.' using errcode='P0002'; end if;
    update public.ai_conversations set state=case when p_resolve then 'HUMAN_RESOLVED' else 'HUMAN_ACTIVE' end,updated_at=now() where id=v_row.conversation_id;
    return v_row;
end;
$$;

create or replace function public.ai_relay_intervention_to_client(p_intervention_id uuid,p_client_message text)
returns public.human_interventions language plpgsql security definer set search_path=public
as $$
declare v_row public.human_interventions;
begin
    if not public.is_super_admin() and not public.staff_ai_can(auth.uid(),'RELAY_TO_CLIENTS') then raise exception 'You are not authorised to relay AI intervention responses.' using errcode='42501'; end if;
    if nullif(trim(p_client_message),'') is null then raise exception 'Client relay message is required.' using errcode='22023'; end if;
    update public.human_interventions set status='RELAYED_TO_CLIENT',updated_at=now(),relayed_at=now(),ai_context=coalesce(ai_context,'{}'::jsonb)||jsonb_build_object('last_client_relay',trim(p_client_message),'last_client_relayed_at',now()) where id=p_intervention_id and status in('STAFF_RESPONDED','ANSWERED','SUPER_ADMIN_REVIEW') returning * into v_row;
    if v_row.id is null then raise exception 'Intervention is not ready for client relay.' using errcode='P0002'; end if;
    update public.ai_conversations set state='AI_RESUMED',updated_at=now() where id=v_row.conversation_id;
    return v_row;
end;
$$;
revoke all on function public.ai_assign_human_intervention(uuid,uuid) from public;
revoke all on function public.ai_staff_respond_to_intervention(uuid,text,boolean) from public;
revoke all on function public.ai_super_admin_respond_to_intervention(uuid,text,boolean) from public;
revoke all on function public.ai_relay_intervention_to_client(uuid,text) from public;
grant execute on function public.ai_assign_human_intervention(uuid,uuid) to authenticated,service_role;
grant execute on function public.ai_staff_respond_to_intervention(uuid,text,boolean) to authenticated,service_role;
grant execute on function public.ai_super_admin_respond_to_intervention(uuid,text,boolean) to authenticated,service_role;
grant execute on function public.ai_relay_intervention_to_client(uuid,text) to authenticated,service_role;

commit;
