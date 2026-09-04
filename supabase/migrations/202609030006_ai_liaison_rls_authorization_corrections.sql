-- ============================================================
-- Isaacs & Partners
-- AI Liaison Control Plane
-- Migration 006
--
-- RLS / authorization corrections:
--   1. Require ANSWER_AI_QUERIES for staff intervention updates.
--   2. Restrict AI permission audit records to Super Admin.
--   3. Support canonical RELAY_TO_CLIENT capability name while
--      retaining RELAY_TO_CLIENTS as a backwards-compatible alias.
--
-- No data is deleted.
-- No existing application tables are reorganised.
-- ============================================================

begin;

-- ============================================================
-- 1. HUMAN INTERVENTION UPDATE AUTHORIZATION
--
-- Staff must have ANSWER_AI_QUERIES to update an intervention.
-- Assigned staff are no longer implicitly authorized merely
-- because they are assigned.
-- Super Admin remains unrestricted.
-- ============================================================

drop policy if exists human_interventions_authorised_update
on public.human_interventions;

create policy human_interventions_authorised_update
on public.human_interventions
as permissive
for update
to authenticated
using (
    public.is_super_admin()
    or (
        public.staff_ai_can(
            auth.uid(),
            'ANSWER_AI_QUERIES'
        )
        and (
            assigned_staff_id = auth.uid()
            or assigned_staff_id is null
        )
    )
)
with check (
    public.is_super_admin()
    or public.staff_ai_can(
        auth.uid(),
        'ANSWER_AI_QUERIES'
    )
);

-- ============================================================
-- 2. AI PERMISSION AUDIT
--
-- Permission changes are security-sensitive audit records.
-- Only Super Admin should be able to read the complete audit
-- history.
-- ============================================================

drop policy if exists staff_ai_permission_audit_super_admin_select
on public.staff_ai_permission_audit;

create policy staff_ai_permission_audit_super_admin_select
on public.staff_ai_permission_audit
as permissive
for select
to authenticated
using (
    public.is_super_admin()
);

-- ============================================================
-- 3. CANONICAL RELAY CAPABILITY
--
-- Application canonical capability:
--     RELAY_TO_CLIENT
--
-- Existing database implementation used:
--     RELAY_TO_CLIENTS
--
-- Support both so existing callers continue to work while the
-- singular canonical capability is adopted.
-- ============================================================

create or replace function public.staff_ai_can(
    p_staff_user_id uuid,
    p_capability text
)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
    select
        public.is_super_admin_for_user(p_staff_user_id)
        or exists (
            select 1
            from public.staff_ai_permissions p
            join public.staff s
                on s.user_id = p.staff_user_id
            where p.staff_user_id = p_staff_user_id
              and p.is_active = true
              and s.is_active = true
              and case upper(p_capability)
                    when 'LIAISE_WITH_AI'
                        then p.can_liaise_with_ai

                    when 'ANSWER_AI_QUERIES'
                        then p.can_answer_ai_queries

                    when 'RELAY_TO_CLIENT'
                        then p.can_relay_to_clients

                    -- Backwards-compatible alias.
                    when 'RELAY_TO_CLIENTS'
                        then p.can_relay_to_clients

                    when 'HANDLE_APPOINTMENTS'
                        then p.can_handle_appointments

                    when 'PROVIDE_PRICING'
                        then p.can_provide_pricing

                    when 'APPROVE_QUOTES'
                        then p.can_approve_quotes

                    when 'HANDLE_IMMIGRATION'
                        then p.can_handle_immigration

                    when 'HANDLE_HR'
                        then p.can_handle_hr

                    when 'HANDLE_BUSINESS_COMPLIANCE'
                        then p.can_handle_business_compliance

                    when 'HANDLE_LEGAL'
                        then p.can_handle_legal

                    else false
                  end
        );
$function$;

-- ============================================================
-- 4. FUNCTION EXECUTION HARDENING
--
-- staff_ai_can remains callable by authenticated application
-- code because the application uses it for authorization.
-- Anonymous execution remains disabled.
-- ============================================================

revoke execute
on function public.staff_ai_can(uuid, text)
from anon;

revoke execute
on function public.staff_ai_can(uuid, text)
from public;

grant execute
on function public.staff_ai_can(uuid, text)
to authenticated;

grant execute
on function public.staff_ai_can(uuid, text)
to service_role;

commit;