-- Anthony Response Watchdog & Approval Engine Updates
-- 1. Fix watchdog outbound response resolution matching
-- 2. Cap reminder escalations to stop endless loops
-- 3. Clean up legacy stuck watchdog records

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
  -- 1. Auto-close watchdog records that have received any real non-watchdog outbound WhatsApp message
  update public.anthony_response_watchdog w
  set status = 'RESPONDED',
      updated_at = now_utc
  where w.status in ('OPEN', 'WAITING_SUPER_ADMIN')
    and exists (
      select 1
      from public.communication_messages o
      join public.communication_messages m on m.id = w.inbound_message_id
      where o.channel = 'WHATSAPP'
        and o.direction = 'OUTBOUND'
        and (
          o.chat_id = m.chat_id
          or o.phone_number = m.phone_number
        )
        and o.created_at >= m.created_at
        and coalesce((o.metadata->>'watchdog_generated')::boolean, false) = false
    );

  -- 2. Close legacy/expired watchdog records older than 24 hours to prevent historical spam loops
  update public.anthony_response_watchdog
  set status = 'CLOSED',
      updated_at = now_utc
  where status in ('OPEN', 'WAITING_SUPER_ADMIN')
    and created_at < now_utc - interval '24 hours';

  -- 3. Insert new inbound messages from today
  insert into public.anthony_response_watchdog (
    inbound_message_id, chat_id, phone_number, calendar_date, next_due_at
  )
  select
    m.id, m.chat_id, m.phone_number, today_za, m.created_at + interval '30 minutes'
  from public.communication_messages m
  where m.channel = 'WHATSAPP'
    and m.direction = 'INBOUND'
    and coalesce(m.chat_id, '') <> ''
    and (m.created_at at time zone 'Africa/Johannesburg')::date = today_za
    and not exists (
      select 1 from public.anthony_response_watchdog w
      where w.inbound_message_id = m.id
    )
  on conflict (inbound_message_id) do nothing;

  -- 4. Process due records
  for row_in in
    select w.*, m.body inbound_body, m.customer_user_id,
           m.chat_id message_chat_id, m.phone_number message_phone
    from public.anthony_response_watchdog w
    join public.communication_messages m on m.id = w.inbound_message_id
    where w.status in ('OPEN', 'WAITING_SUPER_ADMIN')
      and w.next_due_at <= now_utc
      and w.calendar_date = today_za
      and w.reminder_count < 2
    order by w.next_due_at, w.created_at
    limit 100
  loop
    -- Double-check if an outbound message exists
    if exists (
      select 1
      from public.communication_messages o
      where o.channel = 'WHATSAPP'
        and o.direction = 'OUTBOUND'
        and (o.chat_id = row_in.message_chat_id or o.phone_number = row_in.message_phone)
        and o.created_at >= row_in.created_at
        and coalesce((o.metadata->>'watchdog_generated')::boolean, false) = false
    ) then
      update public.anthony_response_watchdog
      set status = 'RESPONDED', updated_at = now_utc
      where id = row_in.id;
      continue;
    end if;

    if row_in.status = 'OPEN' then
      customer_notice := 'Hi, this is Anthony Isaacs from Isaacs & Partners. I have received your enquiry and prepared the necessary details. I am currently awaiting confirmation from a Super Admin before finalizing. I will keep you updated shortly.';

      insert into public.communication_messages(
        customer_user_id, channel, direction, phone_number, chat_id, body, status, metadata
      ) values (
        row_in.customer_user_id, 'WHATSAPP', 'OUTBOUND', row_in.message_phone,
        row_in.message_chat_id, customer_notice, 'QUEUED',
        jsonb_build_object(
          'source', 'anthony-response-watchdog',
          'watchdog_generated', true,
          'source_message_id', row_in.inbound_message_id,
          'watchdog_type', 'customer_acknowledgement',
          'assistant_name', 'Anthony Isaacs'
        )
      ) returning id into customer_message_id;

      insert into public.communication_outbox(message_id, session_id, chat_id, status)
      values (customer_message_id, null, row_in.message_chat_id, 'QUEUED');

      update public.anthony_response_watchdog
      set status = 'WAITING_SUPER_ADMIN',
          reminder_count = reminder_count + 1,
          last_customer_notice_at = now_utc,
          last_escalated_at = now_utc,
          next_due_at = now_utc + interval '30 minutes',
          updated_at = now_utc
      where id = row_in.id;
    else
      admin_notice := 'Anthony Isaacs requires Super Admin authorization.' ||
        E'\n\nCustomer WhatsApp: ' || coalesce(row_in.message_phone, row_in.message_chat_id) ||
        E'\nIncoming message: "' || left(row_in.inbound_body, 1500) || '"' ||
        E'\nOriginal Message ID: ' || row_in.inbound_message_id::text ||
        E'\n\nCan I proceed? (Reply YES or NO)';

      for admin_row in
        select phone_number, full_name
        from public.authority_directory
        where is_active = true
          and upper(authority_role) = 'SUPER_ADMIN'
          and phone_number is not null
          and phone_number <> coalesce(row_in.message_phone, '')
      loop
        insert into public.communication_messages(
          channel, direction, phone_number, chat_id, body, status, metadata
        ) values (
          'WHATSAPP', 'OUTBOUND', admin_row.phone_number,
          admin_row.phone_number || '@c.us', admin_notice, 'QUEUED',
          jsonb_build_object(
            'source', 'anthony-response-watchdog',
            'watchdog_generated', true,
            'watchdog_type', 'super_admin_escalation',
            'source_message_id', row_in.inbound_message_id,
            'assistant_name', 'Anthony Isaacs',
            'recipient_super_admin', admin_row.full_name
          )
        ) returning id into admin_message_id;

        insert into public.communication_outbox(message_id, session_id, chat_id, status)
        values (admin_message_id, null, admin_row.phone_number || '@c.us', 'QUEUED');
      end loop;

      update public.anthony_response_watchdog
      set reminder_count = reminder_count + 1,
          last_escalated_at = now_utc,
          last_customer_notice_at = now_utc,
          next_due_at = now_utc + interval '120 minutes',
          status = case when reminder_count + 1 >= 2 then 'CLOSED' else 'WAITING_SUPER_ADMIN' end,
          updated_at = now_utc
      where id = row_in.id;
    end if;
    processed := processed + 1;
  end loop;

  return processed;
end;
$$;
