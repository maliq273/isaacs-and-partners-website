-- Completely disable 30-minute response watchdog to prevent automated repetitive messaging
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('anthony-response-watchdog');
  end if;
exception
  when others then null;
end $$;

-- Set watchdog function to no-op so manual calls also return zero without sending any messages
create or replace function public.anthony_response_watchdog()
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  -- Close all open watchdog rows
  update public.anthony_response_watchdog
  set status = 'CLOSED', updated_at = now()
  where status in ('OPEN', 'WAITING_SUPER_ADMIN');

  return 0;
end;
$$;

-- Mark all active watchdog records as CLOSED
update public.anthony_response_watchdog
set status = 'CLOSED', updated_at = now()
where status in ('OPEN', 'WAITING_SUPER_ADMIN');

-- Unblock all stuck customer conversations so Anthony AI can answer them
update public.ai_conversations
set state = 'AI_ACTIVE', updated_at = now()
where state in ('AI_ESCALATED', 'approval_needed');
