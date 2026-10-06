-- Align repository migration with the live-compatible invoice state machine.
alter table public.invoices drop constraint if exists invoices_status_check;
alter table public.invoices add constraint invoices_status_check check (status in ('DRAFT','ISSUED','SENT','OVERDUE','PARTIALLY_PAID','PART_PAID','PAID','VOID','CANCELLED'));
comment on column public.invoices.status is 'Invoice lifecycle supports legacy ISSUED/PART_PAID compatibility; administrative terminal states are VOID and CANCELLED.';