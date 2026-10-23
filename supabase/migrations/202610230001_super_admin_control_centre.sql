begin;
create table if not exists public.ap_vendors (
 id uuid primary key default gen_random_uuid(), vendor_name text not null, contact_name text, email text, phone text,
 registration_number text, vat_number text, payment_terms_days integer not null default 30 check(payment_terms_days between 0 and 365),
 bank_reference text, notes text, active boolean not null default true, created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index if not exists ap_vendors_name_uq on public.ap_vendors(lower(vendor_name));
create table if not exists public.ap_vendor_invoices (
 id uuid primary key default gen_random_uuid(), vendor_id uuid not null references public.ap_vendors(id) on delete restrict,
 supplier_invoice_number text not null, invoice_date date not null default current_date, due_date date not null,
 description text not null, currency text not null default 'ZAR' check(currency='ZAR'),
 subtotal numeric(14,2) not null check(subtotal>=0), tax_amount numeric(14,2) not null default 0 check(tax_amount>=0),
 total_amount numeric(14,2) generated always as (round(subtotal+tax_amount,2)) stored,
 status text not null default 'RECORDED' check(status in ('RECORDED','APPROVED','PART_PAID','PAID','DISPUTED','VOID')),
 attachment_path text, notes text, recorded_by uuid references auth.users(id) on delete set null,
 approved_by uuid references auth.users(id) on delete set null, approved_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(vendor_id,supplier_invoice_number)
);
create index if not exists ap_vendor_invoices_due_idx on public.ap_vendor_invoices(due_date,status);
create table if not exists public.ap_vendor_payments (
 id uuid primary key default gen_random_uuid(), vendor_invoice_id uuid not null references public.ap_vendor_invoices(id) on delete restrict,
 amount numeric(14,2) not null check(amount>0), payment_date date not null default current_date,
 payment_method text not null default 'BANK_TRANSFER', reference text not null, notes text,
 recorded_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), unique(reference)
);
create index if not exists ap_vendor_payments_invoice_idx on public.ap_vendor_payments(vendor_invoice_id,payment_date);
create table if not exists public.ap_vendor_audit (
 id bigint generated always as identity primary key, actor_user_id uuid references auth.users(id) on delete set null,
 action text not null, entity_type text not null, entity_id uuid, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists ap_vendor_audit_created_idx on public.ap_vendor_audit(created_at desc);
alter table public.ap_vendors enable row level security;
alter table public.ap_vendor_invoices enable row level security;
alter table public.ap_vendor_payments enable row level security;
alter table public.ap_vendor_audit enable row level security;
drop policy if exists ap_vendors_super_admin_all on public.ap_vendors;
create policy ap_vendors_super_admin_all on public.ap_vendors for all to authenticated using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN' and p.is_active)) with check(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN' and p.is_active));
drop policy if exists ap_vendor_invoices_super_admin_all on public.ap_vendor_invoices;
create policy ap_vendor_invoices_super_admin_all on public.ap_vendor_invoices for all to authenticated using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN' and p.is_active)) with check(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN' and p.is_active));
drop policy if exists ap_vendor_payments_super_admin_all on public.ap_vendor_payments;
create policy ap_vendor_payments_super_admin_all on public.ap_vendor_payments for all to authenticated using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN' and p.is_active)) with check(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN' and p.is_active));
drop policy if exists ap_vendor_audit_super_admin_read on public.ap_vendor_audit;
create policy ap_vendor_audit_super_admin_read on public.ap_vendor_audit for select to authenticated using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN' and p.is_active));
revoke insert,update,delete on public.ap_vendor_audit from authenticated;
grant select on public.ap_vendor_audit to authenticated;

create table if not exists public.anthony_memory_entries (
 id uuid primary key default gen_random_uuid(), title text not null, memory_text text not null,
 category text not null default 'WORKFLOW' check(category in ('PREFERENCE','WORKFLOW','PROJECT','GENERAL')),
 sensitivity text not null default 'INTERNAL' check(sensitivity in ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED')),
 grok_eligible boolean not null default false, active boolean not null default true,
 created_by uuid references auth.users(id) on delete set null, updated_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint anthony_memory_external_scope check(not grok_eligible or (sensitivity='INTERNAL' and category in ('PREFERENCE','WORKFLOW','GENERAL')))
);
create index if not exists anthony_memory_active_idx on public.anthony_memory_entries(active,category,updated_at desc);
create table if not exists public.anthony_memory_audit (
 id bigint generated always as identity primary key, memory_id uuid, actor_user_id uuid references auth.users(id) on delete set null,
 action text not null check(action in ('CREATE','UPDATE','ARCHIVE','GROK_REQUEST')), details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
alter table public.anthony_memory_entries enable row level security;
alter table public.anthony_memory_audit enable row level security;
drop policy if exists anthony_memory_super_admin_all on public.anthony_memory_entries;
create policy anthony_memory_super_admin_all on public.anthony_memory_entries for all to authenticated using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN' and p.is_active)) with check(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN' and p.is_active));
drop policy if exists anthony_memory_audit_super_admin_read on public.anthony_memory_audit;
create policy anthony_memory_audit_super_admin_read on public.anthony_memory_audit for select to authenticated using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN' and p.is_active));
revoke insert,update,delete on public.anthony_memory_audit from authenticated;
grant select on public.anthony_memory_audit to authenticated;

create table if not exists public.appointment_availability_slots (
 id uuid primary key default gen_random_uuid(), starts_at timestamptz not null, ends_at timestamptz not null,
 appointment_type text not null default 'CONSULTATION' check(appointment_type in ('CONSULTATION','HEARING','SITE_VISIT','MEETING','OTHER')),
 delivery_mode text not null default 'physical' check(delivery_mode in ('physical','online','phone')),
 public_label text not null default 'Appointment available', active boolean not null default true,
 booked_appointment_id uuid references public.appointments(id) on delete set null, created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), constraint appointment_slot_order check(ends_at>starts_at)
);
create table if not exists public.appointment_booking_requests (
 id uuid primary key default gen_random_uuid(), slot_id uuid not null references public.appointment_availability_slots(id) on delete restrict,
 service_id text not null, customer_name text not null, customer_email text not null, customer_phone text not null, notes text,
 status text not null default 'PENDING' check(status in ('PENDING','CONFIRMED','DECLINED','CANCELLED')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.appointment_availability_slots add column if not exists booking_request_id uuid references public.appointment_booking_requests(id) on delete set null;
create index if not exists appointment_slots_available_idx on public.appointment_availability_slots(active,starts_at) where booked_appointment_id is null and booking_request_id is null;
create index if not exists appointment_booking_requests_created_idx on public.appointment_booking_requests(created_at desc);
alter table public.appointment_availability_slots enable row level security;
alter table public.appointment_booking_requests enable row level security;
drop policy if exists appointment_slots_public_read on public.appointment_availability_slots;
create policy appointment_slots_public_read on public.appointment_availability_slots for select to anon,authenticated using(active=true and booked_appointment_id is null and booking_request_id is null and starts_at>now());
drop policy if exists appointment_slots_super_admin_all on public.appointment_availability_slots;
create policy appointment_slots_super_admin_all on public.appointment_availability_slots for all to authenticated using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN' and p.is_active)) with check(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN' and p.is_active));
drop policy if exists appointment_booking_requests_super_admin_all on public.appointment_booking_requests;
create policy appointment_booking_requests_super_admin_all on public.appointment_booking_requests for all to authenticated using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN' and p.is_active)) with check(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN' and p.is_active));
revoke all on public.appointment_booking_requests from anon,authenticated;
grant select,update on public.appointment_booking_requests to authenticated;
grant select on public.appointment_availability_slots to anon,authenticated;

create or replace function public.submit_public_booking_request(p_slot_id uuid,p_service_id text,p_customer_name text,p_customer_email text,p_customer_phone text,p_notes text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_slot public.appointment_availability_slots; v_request_id uuid; v_email text; v_domain text;
begin
 if length(trim(coalesce(p_customer_name,''))) not between 2 and 200 then raise exception 'A valid customer name is required.' using errcode='22023'; end if;
 v_email:=lower(trim(coalesce(p_customer_email,'')));
 v_domain:=split_part(v_email,'@',2);
 if length(v_email)>254 or position('@' in v_email)<2 or position('.' in v_domain)<2 or position(' ' in v_email)>0 then raise exception 'A valid email address is required.' using errcode='22023'; end if;
 if length(trim(coalesce(p_customer_phone,''))) not between 6 and 30 then raise exception 'A valid contact number is required.' using errcode='22023'; end if;
 if length(trim(coalesce(p_service_id,''))) not between 1 and 180 then raise exception 'Please select a service.' using errcode='22023'; end if;
 if length(coalesce(p_notes,''))>2000 then raise exception 'Notes are too long.' using errcode='22023'; end if;
 if exists(select 1 from public.appointment_booking_requests r where r.customer_email=v_email and r.created_at>now()-interval '10 minutes' and r.status='PENDING') then raise exception 'A recent request is already pending for this email address.' using errcode='23505'; end if;
 select * into v_slot from public.appointment_availability_slots where id=p_slot_id and active=true and starts_at>now() and booked_appointment_id is null and booking_request_id is null for update;
 if not found then raise exception 'This appointment slot is no longer available. Refresh the calendar.' using errcode='P0002'; end if;
 insert into public.appointment_booking_requests(slot_id,service_id,customer_name,customer_email,customer_phone,notes)
 values(p_slot_id,trim(p_service_id),trim(p_customer_name),v_email,trim(p_customer_phone),nullif(trim(coalesce(p_notes,'')),'')) returning id into v_request_id;
 update public.appointment_availability_slots set booking_request_id=v_request_id,updated_at=now() where id=p_slot_id;
 return jsonb_build_object('ok',true,'request_id',v_request_id,'status','PENDING','message','Your booking request has been received. The team will confirm the appointment.');
end $$;
revoke all on function public.submit_public_booking_request(uuid,text,text,text,text,text) from public;
grant execute on function public.submit_public_booking_request(uuid,text,text,text,text,text) to anon,authenticated;

create or replace function public.admin_decide_booking_request(p_request_id uuid,p_decision text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.appointment_booking_requests; s public.appointment_availability_slots; v_appointment_id uuid; v_decision text:=upper(trim(coalesce(p_decision,'')));
begin
 if not exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='SUPER_ADMIN' and p.is_active=true) then raise exception 'Active Super Admin access required.' using errcode='42501'; end if;
 if v_decision not in ('CONFIRMED','DECLINED') then raise exception 'Decision must be CONFIRMED or DECLINED.' using errcode='22023'; end if;
 select * into r from public.appointment_booking_requests where id=p_request_id for update;
 if not found or r.status<>'PENDING' then raise exception 'Pending booking request not found.' using errcode='P0002'; end if;
 select * into s from public.appointment_availability_slots where id=r.slot_id for update;
 if v_decision='CONFIRMED' then
  if s.id is null or s.starts_at<=now() or s.booked_appointment_id is not null then raise exception 'The requested slot is no longer available.' using errcode='P0002'; end if;
  insert into public.appointments(appointment_type,title,starts_at,ends_at,status,created_by,delivery_mode,booking_source,notes)
  values(s.appointment_type,'Public booking — '||r.customer_name,s.starts_at,s.ends_at,'SCHEDULED',auth.uid(),s.delivery_mode,'PUBLIC','Booking request '||r.id::text) returning id into v_appointment_id;
  update public.appointment_availability_slots set booked_appointment_id=v_appointment_id,active=false,updated_at=now() where id=s.id;
 else
  update public.appointment_availability_slots set booking_request_id=null,updated_at=now() where id=s.id and booking_request_id=r.id;
 end if;
 update public.appointment_booking_requests set status=v_decision,updated_at=now() where id=r.id;
 return jsonb_build_object('ok',true,'request_id',r.id,'status',v_decision,'appointment_id',v_appointment_id);
end $$;
revoke all on function public.admin_decide_booking_request(uuid,text) from public,anon;
grant execute on function public.admin_decide_booking_request(uuid,text) to authenticated;

create or replace view public.customer_statement_lines with (security_invoker=true) as
select i.id as invoice_id,i.individual_user_id,i.business_id,i.invoice_number,coalesce(i.issued_at::date,i.invoice_date) as transaction_date,
 coalesce(i.description,i.subject,'Invoice') as description,coalesce(i.total,i.amount,0)::numeric(14,2) as invoice_total,
 coalesce(p.paid_total,0)::numeric(14,2) as verified_paid,greatest(coalesce(i.total,i.amount,0)-coalesce(p.paid_total,0),0)::numeric(14,2) as balance_due,i.status as invoice_status,i.due_date
from public.invoices i left join (select invoice_id,sum(amount)::numeric(14,2) as paid_total from public.payments where status='COMPLETED' group by invoice_id) p on p.invoice_id=i.id
where i.status not in ('DRAFT','VOID');
grant select on public.customer_statement_lines to authenticated;

create or replace function public.audit_ap_vendor_change()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_action text;
begin
 v_id:=coalesce((to_jsonb(new)->>'id')::uuid,(to_jsonb(old)->>'id')::uuid);
 v_action:=case when tg_op='INSERT' then 'CREATE' when tg_op='UPDATE' then 'UPDATE' else 'DELETE' end;
 insert into public.ap_vendor_audit(actor_user_id,action,entity_type,entity_id,details) values(auth.uid(),v_action,tg_table_name,v_id,jsonb_build_object('operation',tg_op));
 return coalesce(new,old);
end $$;
drop trigger if exists ap_vendors_audit on public.ap_vendors;
create trigger ap_vendors_audit after insert or update or delete on public.ap_vendors for each row execute function public.audit_ap_vendor_change();
drop trigger if exists ap_vendor_invoices_audit on public.ap_vendor_invoices;
create trigger ap_vendor_invoices_audit after insert or update or delete on public.ap_vendor_invoices for each row execute function public.audit_ap_vendor_change();
drop trigger if exists ap_vendor_payments_audit on public.ap_vendor_payments;
create trigger ap_vendor_payments_audit after insert or update or delete on public.ap_vendor_payments for each row execute function public.audit_ap_vendor_change();

create or replace function public.audit_anthony_memory_change()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_action text;
begin
 v_id:=coalesce((to_jsonb(new)->>'id')::uuid,(to_jsonb(old)->>'id')::uuid);
 v_action:=case when tg_op='INSERT' then 'CREATE' when tg_op='UPDATE' and coalesce((to_jsonb(new)->>'active')::boolean,true)=false then 'ARCHIVE' when tg_op='UPDATE' then 'UPDATE' else 'ARCHIVE' end;
 insert into public.anthony_memory_audit(memory_id,actor_user_id,action,details) values(v_id,auth.uid(),v_action,jsonb_build_object('operation',tg_op,'category',coalesce(to_jsonb(new)->>'category',to_jsonb(old)->>'category')));
 return coalesce(new,old);
end $$;
drop trigger if exists anthony_memory_audit_trigger on public.anthony_memory_entries;
create trigger anthony_memory_audit_trigger after insert or update or delete on public.anthony_memory_entries for each row execute function public.audit_anthony_memory_change();
notify pgrst,'reload schema';
commit;
