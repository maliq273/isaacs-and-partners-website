-- Align the WhatsApp outbox seed status with the deployed communication_outbox CHECK constraint.
-- The canonical queued state is QUEUED, not PENDING.

create or replace function public.queue_openwa_message(
  p_chat_id text,
  p_body text,
  p_matter_id uuid default null,
  p_phone_number text default null
)
returns public.communication_messages
language plpgsql
security definer
set search_path=public
as $$
declare
  c public.communication_contacts;
  m public.communication_messages;
begin
  if not (public.is_super_admin() or public.has_staff_permission('manage_communications')) then
    raise exception 'Communication permission required';
  end if;

  select * into c
  from public.communication_contacts
  where chat_id=p_chat_id and is_active=true;

  if not found then
    raise exception 'Active WhatsApp contact not found';
  end if;

  insert into public.communication_messages(
    customer_user_id,matter_id,channel,direction,phone_number,chat_id,body,status,metadata
  )
  values(
    c.user_id,p_matter_id,'WHATSAPP','OUTBOUND',c.phone_number,c.chat_id,
    p_body,'QUEUED','{"source":"communications"}'::jsonb
  )
  returning * into m;

  insert into public.communication_outbox(
    message_id,session_id,chat_id,status,available_at
  )
  values(
    m.id,null,c.chat_id,'QUEUED',now()
  );

  return m;
end;
$$;

grant execute on function public.queue_openwa_message(text,text,uuid,text) to authenticated;
