-- ============================================================================
-- AI LIAISON CONTROL PLANE
-- Migration 005: Function Grant Hardening
--
-- Purpose:
--   1. Remove PUBLIC execution from privileged AI functions.
--   2. Remove anonymous execution from privileged AI functions.
--   3. Prevent authenticated users from directly calling the raw
--      ai_invoice_paid_amount() helper, which has no caller-level
--      authorization because it is intended as an internal helper.
--   4. Preserve authenticated execution for application RPCs whose function
--      bodies already enforce Super Admin / staff / client authorization.
--   5. Preserve service_role execution for trusted server-side AI workflows.
--
-- IMPORTANT:
--   Authorization remains enforced inside the SECURITY DEFINER functions.
--   This migration reduces the callable attack surface without changing
--   the existing AI liaison workflow.
-- ============================================================================

begin;

-- --------------------------------------------------------------------------
-- 1. Remove default PUBLIC execution from all AI liaison functions.
--
-- PostgreSQL represents PUBLIC in an ACL with an empty grantee.
-- REVOKE FROM PUBLIC is therefore required even where explicit grants
-- may also exist.
-- --------------------------------------------------------------------------

revoke execute on function public.ai_append_conversation_message(
    uuid, text, text, text, text, text, jsonb
) from public;

revoke execute on function public.ai_assert_matter_payment_gate(
    uuid, uuid, numeric
) from public;

revoke execute on function public.ai_assign_human_intervention(
    uuid, uuid
) from public;

revoke execute on function public.ai_book_appointment(
    uuid, uuid, timestamptz, timestamptz, text, text, uuid, text
) from public;

revoke execute on function public.ai_can_open_matter(
    uuid, uuid
) from public;

revoke execute on function public.ai_can_submit_matter(
    uuid, uuid
) from public;

revoke execute on function public.ai_invoice_paid_amount(
    uuid
) from public;

revoke execute on function public.ai_payment_gate(
    uuid, numeric
) from public;

revoke execute on function public.ai_record_event(
    uuid, text, jsonb, uuid
) from public;

revoke execute on function public.ai_relay_intervention_to_client(
    uuid, text
) from public;

revoke execute on function public.ai_staff_respond_to_intervention(
    uuid, text, boolean
) from public;

revoke execute on function public.ai_super_admin_respond_to_intervention(
    uuid, text, boolean
) from public;

revoke execute on function public.staff_ai_can(
    uuid, text
) from public;


-- --------------------------------------------------------------------------
-- 2. Explicitly remove anonymous execution.
-- --------------------------------------------------------------------------

revoke execute on function public.ai_append_conversation_message(
    uuid, text, text, text, text, text, jsonb
) from anon;

revoke execute on function public.ai_assert_matter_payment_gate(
    uuid, uuid, numeric
) from anon;

revoke execute on function public.ai_assign_human_intervention(
    uuid, uuid
) from anon;

revoke execute on function public.ai_book_appointment(
    uuid, uuid, timestamptz, timestamptz, text, text, uuid, text
) from anon;

revoke execute on function public.ai_can_open_matter(
    uuid, uuid
) from anon;

revoke execute on function public.ai_can_submit_matter(
    uuid, uuid
) from anon;

revoke execute on function public.ai_invoice_paid_amount(
    uuid
) from anon;

revoke execute on function public.ai_payment_gate(
    uuid, numeric
) from anon;

revoke execute on function public.ai_record_event(
    uuid, text, jsonb, uuid
) from anon;

revoke execute on function public.ai_relay_intervention_to_client(
    uuid, text
) from anon;

revoke execute on function public.ai_staff_respond_to_intervention(
    uuid, text, boolean
) from anon;

revoke execute on function public.ai_super_admin_respond_to_intervention(
    uuid, text, boolean
) from anon;

revoke execute on function public.staff_ai_can(
    uuid, text
) from anon;


-- --------------------------------------------------------------------------
-- 3. The raw payment-total helper must not be directly callable by
-- authenticated browser users.
--
-- ai_payment_gate() remains callable because it performs the required
-- invoice ownership / business ownership / staff assignment / Super Admin
-- authorization checks before using this helper internally.
-- --------------------------------------------------------------------------

revoke execute on function public.ai_invoice_paid_amount(
    uuid
) from authenticated;


-- --------------------------------------------------------------------------
-- 4. Preserve explicit service-role execution.
--
-- This makes the intended server-side boundary explicit rather than relying
-- on inherited/default privileges.
-- --------------------------------------------------------------------------

grant execute on function public.ai_append_conversation_message(
    uuid, text, text, text, text, text, jsonb
) to service_role;

grant execute on function public.ai_assert_matter_payment_gate(
    uuid, uuid, numeric
) to service_role;

grant execute on function public.ai_assign_human_intervention(
    uuid, uuid
) to service_role;

grant execute on function public.ai_book_appointment(
    uuid, uuid, timestamptz, timestamptz, text, text, uuid, text
) to service_role;

grant execute on function public.ai_can_open_matter(
    uuid, uuid
) to service_role;

grant execute on function public.ai_can_submit_matter(
    uuid, uuid
) to service_role;

grant execute on function public.ai_invoice_paid_amount(
    uuid
) to service_role;

grant execute on function public.ai_payment_gate(
    uuid, numeric
) to service_role;

grant execute on function public.ai_record_event(
    uuid, text, jsonb, uuid
) to service_role;

grant execute on function public.ai_relay_intervention_to_client(
    uuid, text
) to service_role;

grant execute on function public.ai_staff_respond_to_intervention(
    uuid, text, boolean
) to service_role;

grant execute on function public.ai_super_admin_respond_to_intervention(
    uuid, text, boolean
) to service_role;

grant execute on function public.staff_ai_can(
    uuid, text
) to service_role;


commit;