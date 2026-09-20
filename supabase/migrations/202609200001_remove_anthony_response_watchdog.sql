-- Permanently remove the Anthony response watchdog and its 30-minute/new-calendar-day rule.
-- The watchdog was an SLA escalation experiment and is no longer part of the
-- production Anthony communication architecture.

do $$
declare r record;
begin
  for r in select jobid from cron.job where jobname='anthony-response-watchdog' loop
    perform cron.unschedule(r.jobid);
  end loop;
exception when undefined_table then
  null;
end $$;

drop function if exists public.anthony_response_watchdog();
drop table if exists public.anthony_response_watchdog cascade;
