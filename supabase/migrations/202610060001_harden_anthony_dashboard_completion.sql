-- Anthony-controlled customer dashboard completion.
-- Customers may save onboarding progress, but only the authenticated Anthony runtime
-- may transition a dashboard to COMPLETED.

create or replace function public.client_portal_save_dashboard_setup(
  p_profile_data jsonb,
  p_selected_service_codes text[],
  p_setup_step text default 'IN_PROGRESS',
  p_anthony_intro_seen boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := (select auth.uid());
  s public.client_dashboard_state;
  requested_step text := upper(coalesce(p_setup_step,'IN_PROGRESS'));
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if requested_step = 'COMPLETED' then
    raise exception 'Dashboard completion is controlled by Anthony server runtime.';
  end if;

  insert into public.client_dashboard_state(
    user_id, setup_status, setup_step, setup_started_at,
    setup_completed_at, anthony_intro_seen, profile_data,
    selected_service_codes, updated_at
  )
  values(
    uid, 'IN_PROGRESS', coalesce(nullif(p_setup_step,''),'IN_PROGRESS'), now(),
    null, p_anthony_intro_seen, coalesce(p_profile_data,'{}'::jsonb),
    coalesce(p_selected_service_codes,'{}'::text[]), now()
  )
  on conflict (user_id) do update set
    setup_status='IN_PROGRESS',
    setup_step=excluded.setup_step,
    setup_started_at=coalesce(client_dashboard_state.setup_started_at,excluded.setup_started_at),
    setup_completed_at=null,
    anthony_intro_seen=excluded.anthony_intro_seen,
    profile_data=excluded.profile_data,
    selected_service_codes=excluded.selected_service_codes,
    updated_at=now()
  returning * into s;

  return jsonb_build_object(
    'setup_status',s.setup_status,
    'setup_step',s.setup_step,
    'login_count',s.login_count,
    'profile_data',s.profile_data,
    'selected_service_codes',s.selected_service_codes,
    'anthony_intro_seen',s.anthony_intro_seen
  );
end;
$$;

revoke all on function public.client_portal_save_dashboard_setup(jsonb,text[],text,boolean) from public,anon;
grant execute on function public.client_portal_save_dashboard_setup(jsonb,text[],text,boolean) to authenticated;
