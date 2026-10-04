-- Promote an HR service-request matter to an operationally open matter only after
-- Anthony's verified 50% deposit event. Staff assignment remains permission-controlled.

create or replace function public.promote_hr_matter_after_deposit()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.event_type='DEPOSIT_PAYMENT_VERIFIED' and new.matter_id is not null then
    update public.matters
       set status='OPEN',
           portal_request_status='approved',
           updated_at=now()
     where id=new.matter_id
       and coalesce(service_type,'') like 'HR-%'
       and status in ('NEW','OPEN')
       and portal_request_status in ('submitted','under_review','approved');
  end if;
  return new;
end;
$$;

revoke execute on function public.promote_hr_matter_after_deposit() from public,anon,authenticated;

drop trigger if exists trg_promote_hr_matter_after_deposit on public.ai_agent_events;
create trigger trg_promote_hr_matter_after_deposit
after insert on public.ai_agent_events
for each row execute function public.promote_hr_matter_after_deposit();

notify pgrst,'reload schema';