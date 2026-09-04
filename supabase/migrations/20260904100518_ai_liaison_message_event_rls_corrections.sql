-- ============================================================
-- AI LIAISON CONTROL PLANE
-- Migration 007
-- Message/Event RLS Authorization Corrections
--
-- Purpose:
--   Ensure staff access to AI conversation messages and AI
--   agent events follows the same matter-level authorization
--   already enforced on ai_conversations.
--
-- Security model:
--   - Super Admin: unrestricted
--   - Client: own conversation only
--   - Staff: requires view_communications AND matter access
--   - No changes to client ownership rules
--   - No changes to payment controls
--   - No changes to human intervention controls
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. AI CONVERSATION MESSAGES
-- ------------------------------------------------------------

drop policy if exists ai_messages_authorised_select
on public.ai_conversation_messages;

create policy ai_messages_authorised_select
on public.ai_conversation_messages
for select
to authenticated
using (
    public.is_super_admin()

    or exists (
        select 1
        from public.ai_conversations c
        where c.id = ai_conversation_messages.conversation_id
          and c.client_user_id = auth.uid()
    )

    or (
        public.current_user_role() = 'STAFF'::app_role
        and public.has_staff_permission('view_communications')
        and exists (
            select 1
            from public.ai_conversations c
            where c.id = ai_conversation_messages.conversation_id
              and (
                  c.matter_id is null
                  or public.staff_can_access_matter(
                      c.matter_id,
                      'view_communications'
                  )
              )
        )
    )
);


-- ------------------------------------------------------------
-- 2. AI AGENT EVENTS
-- ------------------------------------------------------------

drop policy if exists ai_agent_events_authorised_select
on public.ai_agent_events;

create policy ai_agent_events_authorised_select
on public.ai_agent_events
for select
to authenticated
using (
    public.is_super_admin()

    or ai_agent_events.actor_user_id = auth.uid()

    or exists (
        select 1
        from public.ai_conversations c
        where c.id = ai_agent_events.conversation_id
          and c.client_user_id = auth.uid()
    )

    or (
        public.current_user_role() = 'STAFF'::app_role
        and public.has_staff_permission('view_communications')
        and exists (
            select 1
            from public.ai_conversations c
            where c.id = ai_agent_events.conversation_id
              and (
                  c.matter_id is null
                  or public.staff_can_access_matter(
                      c.matter_id,
                      'view_communications'
                  )
              )
        )
    )
);


commit;