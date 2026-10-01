-- Commercial service entitlement + financial lock layer for Isaacs & Partners.
create table if not exists public.client_service_entitlements (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 client_user_id uuid references public.profiles(id) on delete set null,
 service_code text not null,
 service_name text not null,
 billing_model text not null check (billing_model in ('MONTHLY','PER_EMPLOYEE_PAYSLIP','ONE_OFF','MATTER')),
 monthly_amount numeric(12,2) not null default 0,
 currency text not null default 'ZAR',
 status text not null default 'ACTIVE' check (status in ('ACTIVE','PAST_DUE','LOCKED','SUSPENDED','CANCELLED')),
 access_state text not null default 'ENABLED' check (access_state in ('ENABLED','READ_ONLY','LOCKED')),
 grace_days integer not null default 0 check (grace_days between 0 and 30),
 current_invoice_id uuid references public.invoices(id) on delete set null,
 current_period_start date,
 current_period_end date,
 next_billing_date date,
 locked_at timestamptz,
 lock_reason text,
 unlocked_at timestamptz,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(business_id,service_code)
);

create table if not exists public.client_service_billing_events (
 id uuid primary key default gen_random_uuid(),
 entitlement_id uuid not null references public.client_service_entitlements(id) on delete cascade,
 business_id uuid not null references public.businesses(id) on delete cascade,
 invoice_id uuid references public.invoices(id) on delete set null,
 event_type text not null check(event_type in ('INVOICE_ISSUED','PAYMENT_RECEIVED','PAYMENT_FAILED','PAST_DUE','LOCKED','UNLOCKED','WAIVED','ADJUSTED')),
 amount numeric(12,2) not null default 0,
 currency text not null default 'ZAR',
 period_start date,
 period_end date,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);

create index if not exists client_service_entitlements_business_idx on public.client_service_entitlements(business_id,status,access_state);
create index if not exists client_service_billing_events_entitlement_idx on public.client_service_billing_events(entitlement_id,created_at desc);

alter table public.client_service_entitlements enable row level security;
alter table public.client_service_billing_events enable row level security;

drop policy if exists client_service_entitlements_owner on public.client_service_entitlements;
create policy client_service_entitlements_owner on public.client_service_entitlements
for select to authenticated using (
 business_id in (select id from public.businesses where owner_user_id=auth.uid())
 or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('STAFF','SUPER_ADMIN'))
);

drop policy if exists client_service_billing_events_owner on public.client_service_billing_events;
create policy client_service_billing_events_owner on public.client_service_billing_events
for select to authenticated using (
 business_id in (select id from public.businesses where owner_user_id=auth.uid())
 or exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('STAFF','SUPER_ADMIN'))
);

create or replace function public.refresh_client_service_entitlement(p_entitlement_id uuid)
returns public.client_service_entitlements
language plpgsql
security definer
set search_path=public
as $$
declare e public.client_service_entitlements;
 inv public.invoices;
 paid numeric := 0;
 due numeric := 0;
 target text;
begin
 select * into e from public.client_service_entitlements where id=p_entitlement_id for update;
 if not found then raise exception 'SERVICE_ENTITLEMENT_NOT_FOUND'; end if;

 if e.current_invoice_id is not null then
   select * into inv from public.invoices where id=e.current_invoice_id;
   if found then
     due:=coalesce(inv.total,inv.amount,0);
     paid:=coalesce(inv.amount_paid,0);
     if inv.status='PAID' or paid >= due then
       target:='ENABLED';
     elsif coalesce(inv.due_date,inv.due_at::date) is not null
       and current_date > (coalesce(inv.due_date,inv.due_at::date) + e.grace_days) then
       target:='LOCKED';
     else
       target:='ENABLED';
     end if;
   else
     target:='LOCKED';
   end if;
 else
   target:=case when e.billing_model='ONE_OFF' then e.access_state else 'LOCKED' end;
 end if;

 update public.client_service_entitlements
 set access_state=target,
     status=case when target='LOCKED' then 'LOCKED' else 'ACTIVE' end,
     locked_at=case when target='LOCKED' and locked_at is null then now() else locked_at end,
     lock_reason=case when target='LOCKED' then coalesce(lock_reason,'Monthly Isaacs & Partners service invoice is unpaid.') else null end,
     unlocked_at=case when target='ENABLED' and access_state='LOCKED' then now() else unlocked_at end,
     updated_at=now()
 where id=e.id
 returning * into e;

 return e;
end $$;

create or replace function public.service_access_allowed(p_business_id uuid,p_service_code text)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare allowed boolean;
begin
 select exists(
   select 1 from public.client_service_entitlements
   where business_id=p_business_id
     and service_code=p_service_code
     and access_state='ENABLED'
     and status='ACTIVE'
 ) into allowed;
 return coalesce(allowed,false);
end $$;

create or replace function public.refresh_entitlement_for_invoice()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare x record;
begin
 for x in select id from public.client_service_entitlements where current_invoice_id=new.id loop
   perform public.refresh_client_service_entitlement(x.id);
 end loop;
 return new;
end $$;

drop trigger if exists trg_refresh_service_entitlement_invoice on public.invoices;
create trigger trg_refresh_service_entitlement_invoice
after insert or update of status,amount_paid,total,due_date,due_at on public.invoices
for each row execute function public.refresh_entitlement_for_invoice();

-- Payments are the financial source of truth for unlocking service access.
create or replace function public.refresh_entitlement_for_payment()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare x record;
begin
 for x in select id from public.client_service_entitlements where current_invoice_id=new.invoice_id loop
   perform public.refresh_client_service_entitlement(x.id);
 end loop;
 return new;
end $$;

drop trigger if exists trg_refresh_service_entitlement_payment on public.payments;
create trigger trg_refresh_service_entitlement_payment
after insert or update of status,amount on public.payments
for each row execute function public.refresh_entitlement_for_payment();

comment on table public.client_service_entitlements is 'Isaacs & Partners commercial entitlement layer. Payroll, SARS preparation and HR services are gated by their own paid financial entitlement; this does not control SARS itself.';
comment on function public.service_access_allowed(uuid,text) is 'Authoritative platform access gate for client services. A locked entitlement blocks the associated Isaacs & Partners module.';
