-- Anthony response watchdog
-- Every inbound WhatsApp message is tracked until it receives a real response.
-- Watchdog-generated acknowledgements do not close the response requirement.
create table if not exists public.anthony_response_watchdog (
  id uuid primary key default gen_random_uuid(),
  inbound_message_id uuid not null unique references public.communication_messages(id) on delete cascade,
  chat_id text not null,
  phone_number text,
  calendar_date date not null,
  status text not null default 'OPEN',
  reminder_count integer not null default 0,
  next_due_at timestamptz not null,
  last_escalated_at timestamptz,
  last_customer_notice_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anthony_response_watchdog_status_chk
    check (status in ('OPEN','WAITING_SUPER_ADMIN','RESPONDED','CLOSED'))
);

create index if not exists anthony_response_watchdog_due_idx
  on public.anthony_response_watchdog(status,next_due_at);

create index if not exists anthony_response_watchdog_chat_idx
  on public.anthony_response_watchdog(chat_id,created_at);

alter table public.anthony_response_watchdog enable row level security;

drop policy if exists anthony_response_watchdog_super_admin on public.anthony_response_watchdog;
create policy anthony_response_watchdog_super_admin
  on public.anthony_response_watchdog
  for select to authenticated
  using (public.is_super_admin());

create or replace function public.anthony_response_watchdog()
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  now_utc timestamptz := now();
  now_za timestamp := now_utc at time zone 'Africa/Johannesburg';
  today_za date := now_za::date;
  row_in record;
  admin_row record;
  customer_notice text;
  admin_notice text;
  customer_message_id uuid;
  admin_message_id uuid;
  processed integer := 0;
begin
  insert into public.anthony_response_watchdog (
    inbound_message_id,chat_id,phone_number,calendar_date,next_due_at
  )
  select
    m.id,m.chat_id,m.phone_number,today_za,m.created_at+interval '30 minutes'
  from public.communication_messages m
  where m.channel='WHATSAPP'
    and m.direction='INBOUND'
    and coalesce(m.chat_id,'')<>''
    and (m.created_at at time zone 'Africa/Johannesburg')::date=today_za
    and not exists (
      select 1 from public.anthony_response_watchdog w
      where w.inbound_message_id=m.id
    )
  on conflict (inbound_message_id) do nothing;

  for row_in in
    select w.*,m.body inbound_body,m.customer_user_id,
           m.chat_id message_chat_id,m.phone_number message_phone
    from public.anthony_response_watchdog w
    join public.communication_messages m on m.id=w.inbound_message_id
    where w.status in ('OPEN','WAITING_SUPER_ADMIN')
      and w.next_due_at<=now_utc
      and w.calendar_date=today_za
    order by w.next_due_at,w.created_at
    limit 200
  loop
    if exists (
      select 1
      from public.communication_messages o
      where o.channel='WHATSAPP'
        and o.direction='OUTBOUND'
        and o.chat_id=row_in.message_chat_id
        and o.metadata->>'source_message_id'=row_in.inbound_message_id::text
        and coalesce((o.metadata->>'watchdog_generated')::boolean,false)=false
    ) then
      update public.anthony_response_watchdog
      set status='RESPONDED',updated_at=now_utc
      where id=row_in.id;
      continue;
    end if;

    if row_in.status='OPEN' then
      customer_notice='Hi, this is Anthony Isaacs from Isaacs & Partners. I have received your message and I am attending to it. I may need confirmation from a Super Admin before I can give you a final answer. I will keep this matter active and will update you as soon as possible.';

      insert into public.communication_messages(
        customer_user_id,channel,direction,phone_number,chat_id,body,status,metadata
      ) values(
        row_in.customer_user_id,'WHATSAPP','OUTBOUND',row_in.message_phone,
        row_in.message_chat_id,customer_notice,'QUEUED',
        jsonb_build_object(
          'source','anthony-response-watchdog',
          'watchdog_generated',true,
          'source_message_id',row_in.inbound_message_id,
          'watchdog_type','customer_acknowledgement',
          'assistant_name','Anthony Isaacs'
        )
      ) returning id into customer_message_id;

      insert into public.communication_outbox(message_id,session_id,chat_id,status)
      values(customer_message_id,null,row_in.message_chat_id,'QUEUED');

      update public.anthony_response_watchdog
      set status='WAITING_SUPER_ADMIN',reminder_count=reminder_count+1,
          last_customer_notice_at=now_utc,last_escalated_at=now_utc,
          next_due_at=now_utc+interval '30 minutes',updated_at=now_utc
      where id=row_in.id;
    else
      admin_notice='Anthony Isaacs requires Super Admin input. An incoming WhatsApp message has remained without a final response for 30 minutes. Please review and provide Anthony with the response/action required.'||
        E'\n\nCustomer WhatsApp: '||coalesce(row_in.message_phone,row_in.message_chat_id)||
        E'\nIncoming message: '||left(row_in.inbound_body,2000)||
        E'\nOriginal message ID: '||row_in.inbound_message_id::text;

      for admin_row in
        select phone_number,full_name
        from public.authority_directory
        where is_active=true
          and upper(authority_role)='SUPER_ADMIN'
          and phone_number is not null
          and phone_number<>coalesce(row_in.message_phone,'')
      loop
        insert into public.communication_messages(
          channel,direction,phone_number,chat_id,body,status,metadata
        ) values(
          'WHATSAPP','OUTBOUND',admin_row.phone_number,
          admin_row.phone_number||'@c.us',admin_notice,'QUEUED',
          jsonb_build_object(
            'source','anthony-response-watchdog',
            'watchdog_generated',true,
            'watchdog_type','super_admin_escalation',
            'source_message_id',row_in.inbound_message_id,
            'assistant_name','Anthony Isaacs',
            'recipient_super_admin',admin_row.full_name
          )
        ) returning id into admin_message_id;

        insert into public.communication_outbox(message_id,session_id,chat_id,status)
        values(admin_message_id,null,admin_row.phone_number||'@c.us','QUEUED');
      end loop;

      customer_notice='Anthony Isaacs here. I am still actively handling your message. I am waiting for confirmation from a Super Admin before I can provide the final response, and your message remains open.';

      insert into public.communication_messages(
        customer_user_id,channel,direction,phone_number,chat_id,body,status,metadata
      ) values(
        row_in.customer_user_id,'WHATSAPP','OUTBOUND',row_in.message_phone,
        row_in.message_chat_id,customer_notice,'QUEUED',
        jsonb_build_object(
          'source','anthony-response-watchdog',
          'watchdog_generated',true,
          'source_message_id',row_in.inbound_message_id,
          'watchdog_type','customer_waiting_update',
          'assistant_name','Anthony Isaacs'
        )
      ) returning id into customer_message_id;

      insert into public.communication_outbox(message_id,session_id,chat_id,status)
      values(customer_message_id,null,row_in.message_chat_id,'QUEUED');

      update public.anthony_response_watchdog
      set reminder_count=reminder_count+1,last_escalated_at=now_utc,
          last_customer_notice_at=now_utc,next_due_at=now_utc+interval '30 minutes',
          updated_at=now_utc
      where id=row_in.id;
    end if;
    processed:=processed+1;
  end loop;
  return processed;
end;
$$;

revoke all on function public.anthony_response_watchdog() from public,anon,authenticated;

select cron.schedule(
  'anthony-response-watchdog',
  '* * * * *',
  $$select public.anthony_response_watchdog();$$
);