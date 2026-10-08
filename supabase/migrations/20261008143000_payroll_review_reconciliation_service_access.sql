begin;

insert into public.service_catalog(code,name,service_domain,description,pricing_mode,default_currency,tax_rate,minimum_fee,active,metadata)
values
('HR-PAYROLL','Isaacs & Partners Payroll','HR & Industrial Relations','Controlled payroll processing, reconciliation and payslip service.','CUSTOM','ZAR',0,0,true,jsonb_build_object('system_module',true,'approval_required',true)),
('HR-SARS','Isaacs & Partners SARS Compliance','Business Compliance','Controlled SARS payroll/e@syFile preparation and compliance service.','CUSTOM','ZAR',0,0,true,jsonb_build_object('system_module',true,'approval_required',true))
on conflict(code) do update set name=excluded.name,service_domain=excluded.service_domain,description=excluded.description,active=true,metadata=public.service_catalog.metadata||excluded.metadata,updated_at=now();

create table if not exists public.hr_payroll_reviewers(
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 is_primary boolean not null default true,
 active boolean not null default true,
 assigned_by uuid references public.profiles(id),
 assigned_at timestamptz not null default now(),
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(business_id,user_id)
);
create unique index if not exists hr_payroll_reviewers_one_primary on public.hr_payroll_reviewers(business_id) where is_primary and active;

create table if not exists public.client_service_access_requests(
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 client_user_id uuid not null references public.profiles(id) on delete cascade,
 service_code text not null,
 status text not null default 'PENDING',
 requested_at timestamptz not null default now(),
 reviewed_by uuid references public.profiles(id),
 reviewed_at timestamptz,
 notes text,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(status in ('PENDING','APPROVED','REJECTED','CANCELLED'))
);
create unique index if not exists client_service_access_requests_pending_uq on public.client_service_access_requests(business_id,client_user_id,service_code) where status='PENDING';

alter table public.hr_payroll_reviewers enable row level security;
alter table public.client_service_access_requests enable row level security;

create or replace function public.ensure_payroll_service_entitlements(p_business_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare p public.hr_payroll_profiles;
begin
 select * into p from public.hr_payroll_profiles where business_id=p_business_id and active=true;
 if not found then return; end if;
 insert into public.client_service_entitlements
 (business_id,client_user_id,service_code,service_name,billing_model,monthly_amount,currency,grace_days,current_period_start,current_period_end,next_billing_date,status,access_state,metadata)
 values
 (p_business_id,(select owner_user_id from public.businesses where id=p_business_id),'HR-PAYROLL','Isaacs & Partners Payroll Service','MONTHLY',coalesce(p.payroll_monthly_fee,0),p.subscription_currency,0,date_trunc('month',current_date)::date,(date_trunc('month',current_date)+interval '1 month-1 day')::date,make_date(extract(year from current_date)::int,extract(month from current_date)::int,least(p.billing_day,28)),'LOCKED','LOCKED',jsonb_build_object('source','hr_payroll_profiles','super_admin_grant_required',true))
 on conflict(business_id,service_code) do update set monthly_amount=excluded.monthly_amount,currency=excluded.currency,client_user_id=coalesce(public.client_service_entitlements.client_user_id,excluded.client_user_id),updated_at=now();
 insert into public.client_service_entitlements
 (business_id,client_user_id,service_code,service_name,billing_model,monthly_amount,currency,grace_days,current_period_start,current_period_end,next_billing_date,status,access_state,metadata)
 values
 (p_business_id,(select owner_user_id from public.businesses where id=p_business_id),'HR-SARS','Isaacs & Partners SARS/e@syFile Preparation Service','MONTHLY',coalesce(p.sars_monthly_fee,0),p.subscription_currency,0,date_trunc('month',current_date)::date,(date_trunc('month',current_date)+interval '1 month-1 day')::date,make_date(extract(year from current_date)::int,extract(month from current_date)::int,least(p.billing_day,28)),'LOCKED','LOCKED',jsonb_build_object('source','hr_payroll_profiles','super_admin_grant_required',true))
 on conflict(business_id,service_code) do update set monthly_amount=excluded.monthly_amount,currency=excluded.currency,client_user_id=coalesce(public.client_service_entitlements.client_user_id,excluded.client_user_id),updated_at=now();
end $$;

create or replace function public.client_service_request(p_business_id uuid,p_service_code text,p_notes text default null)
returns public.client_service_access_requests language plpgsql security definer set search_path=public as $$
declare b public.businesses; s text; r public.client_service_access_requests;
begin
 if auth.uid() is null then raise exception 'Authentication required.' using errcode='42501'; end if;
 s:=trim(p_service_code);
 select * into b from public.businesses where id=p_business_id and is_active=true;
 if not found then raise exception 'Active business not found.' using errcode='P0002'; end if;
 if b.owner_user_id<>auth.uid() and not exists(select 1 from public.client_service_entitlements e where e.business_id=p_business_id and e.client_user_id=auth.uid()) then raise exception 'You are not authorised for this business.' using errcode='42501'; end if;
 if s not in ('HR-PAYROLL','HR-SARS') then raise exception 'This request endpoint is limited to Payroll and SARS modules.' using errcode='22023'; end if;
 if exists(select 1 from public.client_service_entitlements e where e.business_id=p_business_id and e.client_user_id=auth.uid() and e.service_code=s and e.status='ACTIVE' and e.access_state='ENABLED') then raise exception 'Service access is already enabled.'; end if;
 insert into public.client_service_access_requests(business_id,client_user_id,service_code,notes,metadata)
 values(p_business_id,auth.uid(),s,nullif(trim(p_notes),''),jsonb_build_object('requested_by',auth.uid()))
 on conflict do nothing returning * into r;
 if r.id is null then select * into r from public.client_service_access_requests where business_id=p_business_id and client_user_id=auth.uid() and service_code=s and status='PENDING' order by requested_at desc limit 1; end if;
 return r;
end $$;

create or replace function public.client_service_access_snapshot()
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare u uuid:=auth.uid(); r jsonb;
begin
 if u is null then raise exception 'Authentication required.' using errcode='42501'; end if;
 select jsonb_build_object('businesses',coalesce((select jsonb_agg(jsonb_build_object('business_id',b.id,'legal_name',b.legal_name,'trading_name',b.trading_name,'entitlements',coalesce((select jsonb_agg(to_jsonb(e) order by e.service_code) from public.client_service_entitlements e where e.business_id=b.id and (e.client_user_id=u or b.owner_user_id=u)),'[]'::jsonb),'requests',coalesce((select jsonb_agg(to_jsonb(x) order by x.requested_at desc) from public.client_service_access_requests x where x.business_id=b.id and x.client_user_id=u),'[]'::jsonb)) order by b.created_at desc) from public.businesses b where b.is_active and (b.owner_user_id=u or exists(select 1 from public.client_service_entitlements e where e.business_id=b.id and e.client_user_id=u))),'[]'::jsonb)) into r;
 return r;
end $$;

create or replace function public.payroll_reviewer_admin_snapshot()
returns jsonb language plpgsql security definer stable set search_path=public as $$
begin
 if not public.is_super_admin() then raise exception 'Only Super Admin may manage payroll reviewers.' using errcode='42501'; end if;
 return jsonb_build_object('businesses',coalesce((select jsonb_agg(jsonb_build_object('business_id',b.id,'legal_name',b.legal_name,'trading_name',b.trading_name,'owner_user_id',b.owner_user_id,'reviewers',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'user_id',r.user_id,'first_name',p.first_name,'last_name',p.last_name,'email',p.email,'phone',p.phone,'is_primary',r.is_primary,'active',r.active,'notes',r.notes) order by r.is_primary desc,p.last_name,p.first_name) from public.hr_payroll_reviewers r join public.profiles p on p.id=r.user_id where r.business_id=b.id and r.active),'[]'::jsonb)) order by b.created_at desc) from public.businesses b where b.is_active),'[]'::jsonb),'candidates',coalesce((select jsonb_agg(jsonb_build_object('user_id',p.id,'first_name',p.first_name,'last_name',p.last_name,'email',p.email,'role',p.role) order by p.role,p.last_name,p.first_name) from public.profiles p where p.is_active and p.role::text in ('BUSINESS','INDIVIDUAL','STAFF','SUPER_ADMIN')),'[]'::jsonb));
end $$;

create or replace function public.payroll_reviewer_set(p_business_id uuid,p_user_id uuid,p_notes text default null)
returns public.hr_payroll_reviewers language plpgsql security definer set search_path=public as $$
declare r public.hr_payroll_reviewers;
begin
 if not public.is_super_admin() then raise exception 'Only Super Admin may assign payroll reviewers.' using errcode='42501'; end if;
 if not exists(select 1 from public.businesses where id=p_business_id and is_active) then raise exception 'Active business not found.'; end if;
 if not exists(select 1 from public.profiles where id=p_user_id and is_active and role::text in ('BUSINESS','INDIVIDUAL','STAFF','SUPER_ADMIN')) then raise exception 'Active reviewer profile not found.'; end if;
 update public.hr_payroll_reviewers set is_primary=false,updated_at=now() where business_id=p_business_id and is_primary;
 insert into public.hr_payroll_reviewers(business_id,user_id,is_primary,active,assigned_by,assigned_at,notes) values(p_business_id,p_user_id,true,true,auth.uid(),now(),nullif(trim(p_notes),'')) on conflict(business_id,user_id) do update set is_primary=true,active=true,assigned_by=auth.uid(),assigned_at=now(),notes=excluded.notes,updated_at=now() returning * into r;
 return r;
end $$;

create or replace function public.client_service_admin_snapshot()
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare r jsonb;
begin
 if not public.is_super_admin() then raise exception 'Only Super Admin may manage client service access.' using errcode='42501'; end if;
 select jsonb_build_object('services',coalesce((select jsonb_agg(jsonb_build_object('code',s.code,'name',s.name,'service_domain',s.service_domain,'pricing_mode',s.pricing_mode,'currency',s.default_currency,'minimum_fee',s.minimum_fee,'active',s.active) order by s.service_domain,s.name) from public.service_catalog s where s.active=true),'[]'::jsonb),'clients',coalesce((select jsonb_agg(jsonb_build_object('user_id',p.id,'email',p.email,'first_name',p.first_name,'last_name',p.last_name,'role',p.role,'is_active',p.is_active,'businesses',coalesce((select jsonb_agg(jsonb_build_object('business_id',b.id,'legal_name',b.legal_name,'trading_name',b.trading_name,'entitlements',coalesce((select jsonb_agg(to_jsonb(e) order by e.service_name) from public.client_service_entitlements e where e.business_id=b.id),'[]'::jsonb),'access_requests',coalesce((select jsonb_agg(to_jsonb(x) order by x.requested_at desc) from public.client_service_access_requests x where x.business_id=b.id and x.client_user_id=p.id),'[]'::jsonb)) order by b.created_at desc) from public.businesses b where b.owner_user_id=p.id and b.is_active=true),'[]'::jsonb)) order by p.created_at desc) from public.profiles p where p.role::text in ('BUSINESS','INDIVIDUAL') and p.is_active=true),'[]'::jsonb)) into r;
 return r;
end $$;

create or replace function public.client_service_grant(p_business_id uuid,p_client_user_id uuid,p_service_code text,p_billing_model text default 'ONE_OFF',p_amount numeric default 0,p_grace_days integer default 0,p_notes text default null)
returns public.client_service_entitlements language plpgsql security definer set search_path=public as $$
declare s public.service_catalog; b public.businesses; p public.profiles; e public.client_service_entitlements;
begin
 if not public.is_super_admin() then raise exception 'Only Super Admin may grant client service access.' using errcode='42501'; end if;
 select * into b from public.businesses where id=p_business_id and is_active=true;if not found then raise exception 'Active business not found.';end if;
 select * into p from public.profiles where id=p_client_user_id and is_active=true;if not found or p.role::text not in ('BUSINESS','INDIVIDUAL') then raise exception 'Active client profile not found.';end if;
 if p.role::text='BUSINESS' and b.owner_user_id<>p_client_user_id then raise exception 'Business client does not own the selected business.';end if;
 select * into s from public.service_catalog where code=trim(p_service_code) and active=true;if not found then raise exception 'Selected service is not active in the service catalogue.';end if;
 insert into public.client_service_entitlements(business_id,client_user_id,service_code,service_name,billing_model,monthly_amount,currency,status,access_state,grace_days,metadata,updated_at)
 values(p_business_id,p_client_user_id,s.code,s.name,upper(coalesce(p_billing_model,'ONE_OFF')),coalesce(p_amount,0),s.default_currency,'ACTIVE','ENABLED',coalesce(p_grace_days,0),jsonb_build_object('source','SUPER_ADMIN_GRANT','granted_by',auth.uid(),'grant_notes',p_notes,'access_override',true),now())
 on conflict (business_id,service_code) do update set client_user_id=excluded.client_user_id,service_name=excluded.service_name,billing_model=excluded.billing_model,monthly_amount=excluded.monthly_amount,currency=excluded.currency,status='ACTIVE',access_state='ENABLED',grace_days=excluded.grace_days,lock_reason=null,unlocked_at=now(),metadata=public.client_service_entitlements.metadata || excluded.metadata,updated_at=now() returning * into e;
 update public.client_service_access_requests set status='APPROVED',reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now() where business_id=p_business_id and client_user_id=p_client_user_id and service_code=s.code and status='PENDING';
 return e;
end $$;

revoke all on function public.client_service_request(uuid,text,text) from public;
revoke all on function public.client_service_access_snapshot() from public;
revoke all on function public.payroll_reviewer_admin_snapshot() from public;
revoke all on function public.payroll_reviewer_set(uuid,uuid,text) from public;
grant execute on function public.client_service_request(uuid,text,text) to authenticated;
grant execute on function public.client_service_access_snapshot() to authenticated;
grant execute on function public.payroll_reviewer_admin_snapshot() to authenticated;
grant execute on function public.payroll_reviewer_set(uuid,uuid,text) to authenticated;
grant execute on function public.client_service_admin_snapshot() to authenticated;
grant execute on function public.client_service_grant(uuid,uuid,text,text,numeric,integer,text) to authenticated;

notify pgrst,'reload schema';
commit;