-- Isaacs & Partners
-- Canonical invoice status contract.
-- Supabase is the source of truth; this migration keeps fresh/rebuilt environments
-- aligned with the live financial state machine used by the dashboard and billing RPCs.

begin;

alter table if exists public.invoices
  drop constraint if exists invoices_status_check;

alter table if exists public.invoices
  add constraint invoices_status_check
  check (status in (
    'DRAFT',
    'ISSUED',
    'SENT',
    'OVERDUE',
    'PARTIALLY_PAID',
    'PART_PAID',
    'PAID',
    'VOID',
    'CANCELLED'
  ));

notify pgrst, 'reload schema';

commit;
