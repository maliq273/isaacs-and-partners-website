-- Restrict Anthony workflow SECURITY DEFINER functions to intended roles.
begin;
revoke execute on function public.anthony_create_pricing_request(uuid,uuid,uuid,text,text,text,jsonb) from public, anon;
grant execute on function public.anthony_create_pricing_request(uuid,uuid,uuid,text,text,text,jsonb) to authenticated, service_role;
revoke execute on function public.anthony_set_pricing_approval(uuid,numeric,text) from public, anon;
grant execute on function public.anthony_set_pricing_approval(uuid,numeric,text) to authenticated;
revoke execute on function public.anthony_verified_payment_event(uuid) from public, anon, authenticated;
grant execute on function public.anthony_verified_payment_event(uuid) to service_role;
revoke execute on function public.trg_anthony_payment_verified() from public, anon, authenticated;
revoke execute on function public.anthony_can_release_submission(uuid,uuid) from public, anon;
grant execute on function public.anthony_can_release_submission(uuid,uuid) to authenticated, service_role;
commit;
