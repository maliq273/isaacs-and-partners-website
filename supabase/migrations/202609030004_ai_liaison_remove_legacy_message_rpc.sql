-- Isaacs & Partners
-- Remove the obsolete 4-argument AI conversation message RPC.
-- Migration 202609030002 created this legacy overload before migration 003
-- established the canonical PR49-compatible 7-argument signature.
-- No application code should use the legacy p_role/p_body interface.

drop function if exists public.ai_append_conversation_message(uuid,text,text,jsonb);
