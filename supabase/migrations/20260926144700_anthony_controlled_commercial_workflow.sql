-- Anthony Isaacs controlled client-service and commercial workflow.
-- Supabase is authoritative for pricing, payment verification and release gates.

begin;

create table if not exists public.anthony_pricing_requests (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid references public.profiles(id) on delete set null,
  matter_id uuid references public.matters(id) on delete set null,
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  service_domain text not null,
  service_code text,
  service_name text not null,
  requested_amount numeric(14,2),
  approved_amount numeric(14,2),
  currency text not null default 'ZAR',
  status text not null default 'PENDING',
  request_context jsonb not null default '{}'::jsonb,
  requested_by text not null default 'ANTHONY_ISAACS',
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anthony_pricing_status_check check (status in ('PENDING','APPROVED','REJECTED','CANCELLED'))
);

create index if not exists anthony_pricing_requests_status_idx on public.anthony_pricing_requests(status, created_at desc);
create index if not exists anthony_pricing_requests_client_idx on public.anthony_pricing_requests(client_user_id, created_at desc);

alter table public.anthony_pricing_requests enable row level security;
drop policy if exists anthony_pricing_select_authorised on public.anthony_pricing_requests;
create policy anthony_pricing_select_authorised on public.anthony_pricing_requests
for select to authenticated using (
  public.is_super_admin()
  or client_user_id = auth.uid()
  or exists (
    select 1 from public.matters m
    where m.id = anthony_pricing_requests.matter_id
      and (m.individual_user_id = auth.uid()
        or exists(select 1 from public.businesses b where b.id=m.business_id and b.owner_user_id=auth.uid()))
  )
);

create table if not exists public.anthony_workflow_state (
  id uuid primary key default gen_random_uuid(),
  client_user_id uuid references public.profiles(id) on delete set null,
  matter_id uuid references public.matters(id) on delete cascade,
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  quote_id uuid references public.quotes(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  state text not null default 'QUALIFICATION',
  application_started_at timestamptz,
  application_completed_at timestamptz,
  final_payment_verified_at timestamptz,
  submission_released_at timestamptz,
  release_status text not null default 'HELD_PENDING_FINAL_PAYMENT',
  required_question_keys jsonb not null default '[]'::jsonb,
  known_facts jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index if not exists anthony_workflow_matter_uidx on public.anthony_workflow_state(matter_id) where matter_id is not null;

alter table public.anthony_workflow_state enable row level security;
drop policy if exists anthony_workflow_select_authorised on public.anthony_workflow_state;
create policy anthony_workflow_select_authorised on public.anthony_workflow_state
for select to authenticated using (
  public.is_super_admin()
  or client_user_id = auth.uid()
  or exists (
    select 1 from public.matters m
    where m.id = anthony_workflow_state.matter_id
      and (m.individual_user_id = auth.uid()
        or exists(select 1 from public.businesses b where b.id=m.business_id and b.owner_user_id=auth.uid()))
  )
);

alter table public.client_documents
  add column if not exists commercial_release_status text not null default 'HELD_PENDING_FINAL_PAYMENT';

create or replace function public.anthony_create_pricing_request(
  p_client_user_id uuid,p_matter_id uuid,p_conversation_id uuid,
  p_service_domain text,p_service_code text,p_service_name text,
  p_context jsonb default '{}'::jsonb
) returns public.anthony_pricing_requests
language plpgsql security definer set search_path=public as $$
declare v_row public.anthony_pricing_requests;
begin
  if not (auth.role()='service_role' or public.is_super_admin() or public.staff_ai_can(auth.uid(),'LIAISE_WITH_AI')) then
    raise exception 'Not authorised to create Anthony pricing requests.' using errcode='42501';
  end if;
  insert into public.anthony_pricing_requests(
    client_user_id,matter_id,conversation_id,service_domain,service_code,service_name,request_context
  ) values (
    p_client_user_id,p_matter_id,p_conversation_id,upper(trim(p_service_domain)),
    nullif(trim(p_service_code),''),trim(p_service_name),coalesce(p_context,'{}'::jsonb)
  ) returning * into v_row;
  return v_row;
end;
$$;

revoke execute on function public.anthony_create_pricing_request(uuid,uuid,uuid,text,text,text,jsonb) from public, anon;
grant execute on function public.anthony_create_pricing_request(uuid,uuid,uuid,text,text,text,jsonb) to authenticated, service_role;

create or replace function public.anthony_set_pricing_approval(
  p_request_id uuid,p_approved_amount numeric,p_notes text default null
) returns public.anthony_pricing_requests
language plpgsql security definer set search_path=public as $$
declare v_row public.anthony_pricing_requests;
begin
  if not public.is_super_admin() then
    raise exception 'Only Super Admin may approve Anthony pricing.' using errcode='42501';
  end if;
  if coalesce(p_approved_amount,0) <= 0 then
    raise exception 'Approved pricing must be greater than zero.' using errcode='22023';
  end if;
  update public.anthony_pricing_requests
     set approved_amount=p_approved_amount,
         requested_amount=coalesce(requested_amount,p_approved_amount),
         status='APPROVED',approved_by=auth.uid(),approved_at=now(),
         notes=p_notes,updated_at=now()
   where id=p_request_id returning * into v_row;
  if v_row.id is null then raise exception 'Pricing request not found.' using errcode='P0002'; end if;
  return v_row;
end;
$$;

revoke execute on function public.anthony_set_pricing_approval(uuid,numeric,text) from public, anon;
grant execute on function public.anthony_set_pricing_approval(uuid,numeric,text) to authenticated;

create or replace function public.anthony_verified_payment_event(p_invoice_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_invoice public.invoices; v_paid numeric:=0; v_event text;
  v_percent numeric:=0; v_client uuid; v_matter uuid; v_conversation uuid;
  v_payload jsonb;
begin
  select * into v_invoice from public.invoices where id=p_invoice_id;
  if v_invoice.id is null then return jsonb_build_object('ok',false,'reason','invoice_not_found'); end if;

  select coalesce(sum(p.amount),0) into v_paid from public.payments p
   where p.invoice_id=p_invoice_id and p.status='COMPLETED';

  if coalesce(v_invoice.total,v_invoice.amount,0) <= 0 then
    return jsonb_build_object('ok',false,'reason','invalid_invoice_total');
  end if;

  v_percent:=round((v_paid/coalesce(v_invoice.total,v_invoice.amount))*100,2);
  v_client:=v_invoice.individual_user_id; v_matter:=v_invoice.matter_id;

  select c.id into v_conversation from public.ai_conversations c
   where c.matter_id=v_matter and c.client_user_id=v_client
   order by c.last_message_at desc nulls last,c.created_at desc limit 1;

  if v_paid >= coalesce(v_invoice.total,v_invoice.amount) then v_event:='FINAL_PAYMENT_VERIFIED';
  elsif v_paid >= coalesce(v_invoice.total,v_invoice.amount)*0.5 then v_event:='DEPOSIT_PAYMENT_VERIFIED';
  else v_event:='PARTIAL_PAYMENT_RECORDED'; end if;

  v_payload:=jsonb_build_object(
    'invoice_id',p_invoice_id,'matter_id',v_matter,'client_user_id',v_client,
    'verified_paid',v_paid,'invoice_total',coalesce(v_invoice.total,v_invoice.amount),
    'verified_percent',v_percent,
    'stage',case when v_paid >= coalesce(v_invoice.total,v_invoice.amount) then 'FINAL'
      when v_paid >= coalesce(v_invoice.total,v_invoice.amount)*0.5 then 'DEPOSIT' else 'PARTIAL' end
  );

  if v_event in ('DEPOSIT_PAYMENT_VERIFIED','FINAL_PAYMENT_VERIFIED') then
    insert into public.ai_agent_events(conversation_id,matter_id,event_type,actor_type,actor_user_id,payload)
    values(v_conversation,v_matter,v_event,'SYSTEM',null,v_payload);

    if v_client is not null then
      insert into public.notifications(recipient_user_id,channel,subject,message,status,provider,metadata)
      values(v_client,'PORTAL',
        case when v_event='FINAL_PAYMENT_VERIFIED' then 'Final payment verified' else '50% payment verified' end,
        case when v_event='FINAL_PAYMENT_VERIFIED'
          then 'Your final 50% payment has been verified. Your completed dossier is now authorised for the applicable submission stage.'
          else 'Your 50% initial payment has been verified. Your matter can now proceed to application preparation.' end,
        'PENDING','INTERNAL',v_payload);
    end if;

    if v_event='FINAL_PAYMENT_VERIFIED' and v_matter is not null then
      update public.client_documents set commercial_release_status='RELEASED_AFTER_FINAL_PAYMENT',updated_at=now()
       where matter_id=v_matter;
      update public.anthony_workflow_state set state='SUBMISSION_RELEASED',
        final_payment_verified_at=now(),submission_released_at=now(),
        release_status='RELEASED_AFTER_FINAL_PAYMENT',updated_at=now()
       where matter_id=v_matter;
    end if;
  end if;
  return v_payload || jsonb_build_object('ok',true,'event_type',v_event);
end;
$$;

revoke execute on function public.anthony_verified_payment_event(uuid) from public, anon, authenticated;
grant execute on function public.anthony_verified_payment_event(uuid) to service_role;

create or replace function public.trg_anthony_payment_verified()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='COMPLETED' and (tg_op='INSERT' or old.status is distinct from new.status) then
    perform public.anthony_verified_payment_event(new.invoice_id);
  end if;
  return new;
end;
$$;
revoke execute on function public.trg_anthony_payment_verified() from public, anon, authenticated;

drop trigger if exists trg_anthony_payment_verified on public.payments;
create trigger trg_anthony_payment_verified
after insert or update of status on public.payments
for each row execute function public.trg_anthony_payment_verified();

create or replace function public.anthony_can_release_submission(p_matter_id uuid,p_invoice_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.ai_can_submit_matter(p_matter_id,p_invoice_id);
$$;

revoke execute on function public.anthony_can_release_submission(uuid,uuid) from public, anon;
grant execute on function public.anthony_can_release_submission(uuid,uuid) to authenticated,service_role;

notify pgrst,'reload schema';
commit;
