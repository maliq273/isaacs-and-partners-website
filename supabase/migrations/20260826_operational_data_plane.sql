-- Isaacs & Partners
-- Operational data plane
--
-- These tables remove the remaining dashboard placeholders. Supabase is the
-- source of truth; RLS is the final authorization boundary.

create table if not exists public.documents (
    id uuid primary key default gen_random_uuid(),
    matter_id uuid null references public.matters(id) on delete cascade,
    individual_user_id uuid null references public.profiles(id) on delete cascade,
    business_id uuid null references public.businesses(id) on delete cascade,
    document_type text not null,
    name text not null,
    storage_path text null,
    status text not null default 'OUTSTANDING',
    required boolean not null default true,
    reviewed boolean not null default false,
    uploaded_at timestamptz null,
    reviewed_at timestamptz null,
    reviewed_by uuid null references public.profiles(id) on delete set null,
    notes text null,
    created_by uuid null references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint documents_status_check check (status in ('OUTSTANDING','UPLOADED','UNDER_REVIEW','APPROVED','REJECTED','WAIVED')),
    constraint documents_owner_check check (matter_id is not null or individual_user_id is not null or business_id is not null)
);

create table if not exists public.appointments (
    id uuid primary key default gen_random_uuid(),
    matter_id uuid null references public.matters(id) on delete cascade,
    individual_user_id uuid null references public.profiles(id) on delete cascade,
    business_id uuid null references public.businesses(id) on delete cascade,
    assigned_staff_id uuid null references public.staff(id) on delete set null,
    appointment_type text not null default 'CONSULTATION',
    title text not null,
    starts_at timestamptz not null,
    ends_at timestamptz null,
    status text not null default 'SCHEDULED',
    location text null,
    notes text null,
    created_by uuid null references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint appointments_status_check check (status in ('SCHEDULED','CONFIRMED','COMPLETED','CANCELLED','NO_SHOW'))
);

create table if not exists public.tasks (
    id uuid primary key default gen_random_uuid(),
    matter_id uuid null references public.matters(id) on delete cascade,
    case_id uuid null references public.cases(id) on delete cascade,
    assigned_staff_id uuid not null references public.staff(id) on delete cascade,
    title text not null,
    description text null,
    status text not null default 'OPEN',
    priority text not null default 'NORMAL',
    due_at timestamptz null,
    completed_at timestamptz null,
    created_by uuid null references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint tasks_status_check check (status in ('OPEN','IN_PROGRESS','COMPLETED','CANCELLED')),
    constraint tasks_parent_check check (matter_id is not null or case_id is not null)
);

create table if not exists public.invoices (
    id uuid primary key default gen_random_uuid(),
    matter_id uuid null references public.matters(id) on delete set null,
    business_id uuid null references public.businesses(id) on delete set null,
    individual_user_id uuid null references public.profiles(id) on delete set null,
    invoice_number text unique,
    description text not null,
    amount numeric(14,2) not null default 0,
    amount_paid numeric(14,2) not null default 0,
    currency text not null default 'ZAR',
    status text not null default 'DRAFT',
    due_at timestamptz null,
    issued_at timestamptz null,
    paid_at timestamptz null,
    created_by uuid null references public.profiles(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint invoices_status_check check (status in ('DRAFT','ISSUED','PART_PAID','PAID','OVERDUE','CANCELLED')),
    constraint invoices_amount_check check (amount >= 0 and amount_paid >= 0 and amount_paid <= amount),
    constraint invoices_owner_check check (business_id is not null or individual_user_id is not null)
);

create table if not exists public.payments (
    id uuid primary key default gen_random_uuid(),
    invoice_id uuid not null references public.invoices(id) on delete cascade,
    amount numeric(14,2) not null,
    currency text not null default 'ZAR',
    payment_method text not null default 'OTHER',
    provider text null,
    provider_reference text null,
    status text not null default 'COMPLETED',
    paid_at timestamptz not null default now(),
    received_by uuid null references public.profiles(id) on delete set null,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint payments_status_check check (status in ('PENDING','COMPLETED','FAILED','REFUNDED')),
    constraint payments_amount_check check (amount > 0)
);

create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid(),
    recipient_user_id uuid not null references public.profiles(id) on delete cascade,
    channel text not null default 'IN_APP',
    subject text null,
    message text not null,
    status text not null default 'PENDING',
    read_at timestamptz null,
    provider text null,
    provider_reference text null,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint notifications_status_check check (status in ('PENDING','SENT','FAILED','READ')),
    constraint notifications_channel_check check (channel in ('IN_APP','EMAIL','WHATSAPP','SMS'))
);

-- The integration outbox must exist before operational-table triggers reference it.
create table if not exists public.integration_events (
    id uuid primary key default gen_random_uuid(),
    event_type text not null,
    entity_type text,
    entity_id uuid,
    operation text,
    source text,
    status text not null default 'PENDING',
    attempts integer not null default 0,
    available_at timestamptz not null default now(),
    processed_at timestamptz,
    last_error text,
    correlation_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists documents_matter_idx on public.documents(matter_id);
create index if not exists documents_individual_idx on public.documents(individual_user_id);
create index if not exists documents_business_idx on public.documents(business_id);
create index if not exists appointments_starts_idx on public.appointments(starts_at);
create index if not exists appointments_staff_idx on public.appointments(assigned_staff_id, starts_at);
create index if not exists tasks_staff_status_idx on public.tasks(assigned_staff_id, status, due_at);
create index if not exists invoices_matter_idx on public.invoices(matter_id);
create index if not exists invoices_business_idx on public.invoices(business_id);
create index if not exists invoices_individual_idx on public.invoices(individual_user_id);
create index if not exists payments_invoice_idx on public.payments(invoice_id, paid_at desc);
create index if not exists notifications_recipient_idx on public.notifications(recipient_user_id, created_at desc);
create index if not exists integration_events_status_available_idx on public.integration_events(status, available_at);
create index if not exists integration_events_created_at_idx on public.integration_events(created_at desc);

create or replace function public.set_operational_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

-- Durable outbox writer used by the operational triggers below.
create or replace function public.enqueue_integration_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.integration_events (
        event_type,
        entity_type,
        entity_id,
        operation,
        source,
        status,
        available_at,
        correlation_id
    ) values (
        lower(TG_TABLE_NAME || '.' || TG_OP),
        TG_TABLE_NAME,
        coalesce(NEW.id, OLD.id),
        TG_OP,
        'supabase',
        'PENDING',
        now(),
        gen_random_uuid()::text
    );
    return coalesce(NEW, OLD);
end;
$$;

revoke all on function public.enqueue_integration_event() from public;
grant execute on function public.enqueue_integration_event() to authenticated;

do $$
declare
    table_name text;
begin
    foreach table_name in array array['documents','appointments','tasks','invoices','payments','notifications'] loop
        execute format('drop trigger if exists operational_updated_at_%I on public.%I', table_name, table_name);
        execute format('create trigger operational_updated_at_%I before update on public.%I for each row execute function public.set_operational_updated_at()', table_name, table_name);
    end loop;
end $$;

do $$
declare
    table_name text;
begin
    foreach table_name in array array['documents','appointments','tasks','invoices','payments','notifications'] loop
        execute format('drop trigger if exists integration_event_%I on public.%I', table_name, table_name);
        execute format('create trigger integration_event_%I after insert or update or delete on public.%I for each row execute function public.enqueue_integration_event()', table_name, table_name);
    end loop;
end $$;

alter table public.documents enable row level security;
alter table public.appointments enable row level security;
alter table public.tasks enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.integration_events enable row level security;

-- Documents
 drop policy if exists documents_select_authorised on public.documents;
create policy documents_select_authorised on public.documents for select to authenticated using (
    public.is_super_admin()
    or individual_user_id = auth.uid()
    or business_id in (select b.id from public.businesses b where b.owner_user_id = auth.uid())
    or exists (select 1 from public.matters m where m.id = documents.matter_id and (
        m.individual_user_id = auth.uid()
        or m.business_id in (select b.id from public.businesses b where b.owner_user_id = auth.uid())
    ))
    or exists (select 1 from public.staff s join public.matters m on m.id = documents.matter_id where s.id in (select a.staff_id from public.assignments a where a.matter_id = m.id and a.status = 'ACTIVE'::assignment_status) and s.user_id = auth.uid())
);

drop policy if exists documents_admin_insert on public.documents;
create policy documents_admin_insert on public.documents for insert to authenticated with check (
    public.is_super_admin() or created_by = auth.uid()
);

drop policy if exists documents_admin_update on public.documents;
create policy documents_admin_update on public.documents for update to authenticated using (
    public.is_super_admin() or created_by = auth.uid()
) with check (
    public.is_super_admin() or created_by = auth.uid()
);

-- Appointments
 drop policy if exists appointments_select_authorised on public.appointments;
create policy appointments_select_authorised on public.appointments for select to authenticated using (
    public.is_super_admin()
    or individual_user_id = auth.uid()
    or business_id in (select b.id from public.businesses b where b.owner_user_id = auth.uid())
    or assigned_staff_id in (select s.id from public.staff s where s.user_id = auth.uid())
    or exists (select 1 from public.assignments a join public.staff s on s.id = a.staff_id where a.matter_id = appointments.matter_id and a.status = 'ACTIVE'::assignment_status and s.user_id = auth.uid())
);

drop policy if exists appointments_admin_insert on public.appointments;
create policy appointments_admin_insert on public.appointments for insert to authenticated with check (public.is_super_admin() or created_by = auth.uid());

drop policy if exists appointments_admin_update on public.appointments;
create policy appointments_admin_update on public.appointments for update to authenticated using (public.is_super_admin() or created_by = auth.uid()) with check (public.is_super_admin() or created_by = auth.uid());

-- Tasks
 drop policy if exists tasks_select_authorised on public.tasks;
create policy tasks_select_authorised on public.tasks for select to authenticated using (
    public.is_super_admin()
    or assigned_staff_id in (select s.id from public.staff s where s.user_id = auth.uid())
    or created_by = auth.uid()
);

drop policy if exists tasks_admin_insert on public.tasks;
create policy tasks_admin_insert on public.tasks for insert to authenticated with check (public.is_super_admin() or created_by = auth.uid());

drop policy if exists tasks_admin_update on public.tasks;
create policy tasks_admin_update on public.tasks for update to authenticated using (public.is_super_admin() or created_by = auth.uid() or assigned_staff_id in (select s.id from public.staff s where s.user_id = auth.uid())) with check (public.is_super_admin() or created_by = auth.uid() or assigned_staff_id in (select s.id from public.staff s where s.user_id = auth.uid()));

-- Invoices
 drop policy if exists invoices_select_authorised on public.invoices;
create policy invoices_select_authorised on public.invoices for select to authenticated using (
    public.is_super_admin()
    or individual_user_id = auth.uid()
    or business_id in (select b.id from public.businesses b where b.owner_user_id = auth.uid())
    or exists (select 1 from public.assignments a join public.staff s on s.id = a.staff_id where a.matter_id = invoices.matter_id and a.status = 'ACTIVE'::assignment_status and s.user_id = auth.uid())
);

drop policy if exists invoices_admin_insert on public.invoices;
create policy invoices_admin_insert on public.invoices for insert to authenticated with check (public.is_super_admin() or created_by = auth.uid());

drop policy if exists invoices_admin_update on public.invoices;
create policy invoices_admin_update on public.invoices for update to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- Payments
 drop policy if exists payments_select_authorised on public.payments;
create policy payments_select_authorised on public.payments for select to authenticated using (
    public.is_super_admin()
    or exists (select 1 from public.invoices i where i.id = payments.invoice_id and (
        i.individual_user_id = auth.uid()
        or i.business_id in (select b.id from public.businesses b where b.owner_user_id = auth.uid())
    ))
    or received_by = auth.uid()
);

drop policy if exists payments_admin_insert on public.payments;
create policy payments_admin_insert on public.payments for insert to authenticated with check (public.is_super_admin() or received_by = auth.uid());

drop policy if exists payments_admin_update on public.payments;
create policy payments_admin_update on public.payments for update to authenticated using (public.is_super_admin() or received_by = auth.uid()) with check (public.is_super_admin() or received_by = auth.uid());

-- Notifications
 drop policy if exists notifications_recipient_select on public.notifications;
create policy notifications_recipient_select on public.notifications for select to authenticated using (recipient_user_id = auth.uid() or public.is_super_admin());

drop policy if exists notifications_recipient_update on public.notifications;
create policy notifications_recipient_update on public.notifications for update to authenticated using (recipient_user_id = auth.uid() or public.is_super_admin()) with check (recipient_user_id = auth.uid() or public.is_super_admin());

drop policy if exists integration_events_admin_select on public.integration_events;
create policy integration_events_admin_select on public.integration_events for select to authenticated using (public.is_super_admin());

drop policy if exists integration_events_admin_write on public.integration_events;
create policy integration_events_admin_write on public.integration_events for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

grant select on public.documents, public.appointments, public.tasks, public.invoices, public.payments, public.notifications, public.integration_events to authenticated;

comment on table public.invoices is 'Authoritative invoice ledger controlled by Super Admin and exposed to authorised clients/staff.';
comment on table public.integration_events is 'Durable outbound event stream consumed by provider integrations.';
