-- Allow 'approval_needed' in ai_conversations state constraint
alter table public.ai_conversations drop constraint if exists ai_conversations_state_check;
alter table public.ai_conversations add constraint ai_conversations_state_check
  check (state in ('AI_ACTIVE','AI_ESCALATED','HUMAN_ACTIVE','HUMAN_RESOLVED','AI_RESUMED','approval_needed'));
