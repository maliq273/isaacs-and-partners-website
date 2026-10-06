-- Align the live invoice state machine with the administrative invoice controller.
-- VOID is an audit-preserving terminal state; it is not a deletion.
alter table public.invoices drop constraint if exists invoices_status_check;
alter table public.invoices
  add constraint invoices_status_check
  check (status in ('DRAFT','SENT','OVERDUE','PARTIALLY_PAID','PAID','VOID','CANCELLED'));

comment on column public.invoices.status is
  'Invoice lifecycle: DRAFT -> SENT -> OVERDUE/PARTIALLY_PAID -> PAID; VOID and CANCELLED are terminal audit states.';
