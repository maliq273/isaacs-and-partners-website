-- Restrict privileged service-access and costing RPCs to trusted execution.
-- Keep the explicitly public enquiry intake and authenticated request/snapshot APIs.
begin;

revoke all on function public.client_service_access_snapshot() from public, anon;
revoke all on function public.client_service_admin_snapshot() from public, anon;
revoke all on function public.client_service_request(uuid, text, text) from public, anon;
grant execute on function public.client_service_access_snapshot() to authenticated, service_role;
grant execute on function public.client_service_admin_snapshot() to authenticated, service_role;
grant execute on function public.client_service_request(uuid, text, text) to authenticated, service_role;

-- These functions can expose internal costing or mutate access/payment state.
-- They are called by trusted Edge Functions using the service-role client.
revoke all on function public.calculate_service_price(uuid, numeric) from public, anon, authenticated;
grant execute on function public.calculate_service_price(uuid, numeric) to service_role;

revoke all on function public.client_service_payment_verified(uuid, uuid) from public, anon, authenticated;
grant execute on function public.client_service_payment_verified(uuid, uuid) to service_role;

revoke all on function public.assert_client_service_access(uuid, text) from public, anon, authenticated;
revoke all on function public.ensure_payroll_service_entitlements(uuid) from public, anon, authenticated;
revoke all on function public.refresh_client_service_entitlement(uuid) from public, anon, authenticated;
revoke all on function public.service_access_allowed(uuid, text) from public, anon, authenticated;
grant execute on function public.assert_client_service_access(uuid, text) to service_role;
grant execute on function public.ensure_payroll_service_entitlements(uuid) to service_role;
grant execute on function public.refresh_client_service_entitlement(uuid) to service_role;
grant execute on function public.service_access_allowed(uuid, text) to service_role;

-- Trigger-only functions are not public RPC endpoints.
revoke all on function public.enforce_paystack_for_service_invoice() from public, anon, authenticated, service_role;
revoke all on function public.refresh_entitlement_for_invoice() from public, anon, authenticated, service_role;
revoke all on function public.refresh_entitlement_for_payment() from public, anon, authenticated, service_role;

notify pgrst, 'reload schema';
commit;
