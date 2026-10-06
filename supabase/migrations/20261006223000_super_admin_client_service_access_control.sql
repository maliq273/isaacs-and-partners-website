-- Super Admin client service entitlement control.
-- Profile editing and portal approval are separate from commercial service access.
-- This migration gives Super Admin an auditable grant/revoke/lock surface.

begin;

create or replace function public.client_service_admin_snapshot()
returns jsonb
language plpgsql
security definer
stable
set search_path=public
as $$
declare r jsonb;
begin
  if not public.is_super_admin() then raise exception 'Only Super Admin may manage client service access.' using errcode='42501'; end if;
  select jsonb_build_object(
    'services',coalesce((select jsonb_agg(jsonb_build_object('code',s.code,'name',s.name,'service_domain',s.service_domain,'pricing_mode',s.pricing_mode,'currency',s.default_currency,'minimum_fee',s.minimum_fee,'active',s.active) order by s.service_domain,s.name) from public.service_catalog s where s.active=true),'[]'::jsonb),
    'clients',coalesce((select jsonb_agg(jsonb_build_object('user_id',p.id,'email',p.email,'first_name',p.first_name,'last_name',p.last_name,'role',p.role,'is_active',p.is_active,'businesses',coalesce((select jsonb_agg(jsonb_build_object('business_id',b.id,'legal_name',b.legal_name,'trading_name',b.trading_name,'entitlements',coalesce((select jsonb_agg(to_jsonb(e) order by e.service_name) from public.client_service_entitlements e where e.business_id=b.id),'[]'::jsonb)) order by b.created_at desc) from public.businesses b where b.owner_user_id=p.id and b.is_active=true),'[]'::jsonb)) order by p.created_at desc) from public.profiles p where p.role::text in ('BUSINESS','INDIVIDUAL') and p.is_active=true),'[]'::jsonb)
  ) into r;
  return r;
end;
$$;

create or replace function public.client_service_grant(
  p_business_id uuid,
  p_client_user_id uuid,
  p_service_code text,
  p_billing_model text default 'ONE_OFF',
  p_amount numeric default 0,
  p_grace_days integer default 0,
  p_notes text default null
)
returns public.client_service_entitlements
language plpgsql
security definer
set search_path=public
as $$
declare s public.service_catalog; b public.businesses; p public.profiles; e public.client_service_entitlements;
begin
  if not public.is_super_admin() then raise exception 'Only Super Admin may grant client service access.' using errcode='42501'; end if;
  if p_business_id is null or p_client_user_id is null or nullif(trim(p_service_code),'') is null then raise exception 'Business, client and service are required.' using errcode='22023'; end if;
  select * into b from public.businesses where id=p_business_id and is_active=true;
  if not found then raise exception 'Active business not found.' using errcode='P0002'; end if;
  select * into p from public.profiles where id=p_client_user_id and is_active=true;
  if not found or p.role::text not in ('BUSINESS','INDIVIDUAL') then raise exception 'Active client profile not found.' using errcode='P0002'; end if;
  if p.role::text='BUSINESS' and b.owner_user_id<>p_client_user_id then raise exception 'Business client does not own the selected business.' using errcode='42501'; end if;
  select * into s from public.service_catalog where code=trim(p_service_code) and active=true;
  if not found then raise exception 'Selected service is not active in the service catalogue.' using errcode='22023'; end if;
  if upper(coalesce(p_billing_model,'ONE_OFF')) not in ('MONTHLY','PER_EMPLOYEE_PAYSLIP','ONE_OFF','MATTER') then raise exception 'Invalid billing model.' using errcode='22023'; end if;
  if coalesce(p_amount,0)<0 then raise exception 'Service amount cannot be negative.' using errcode='22023'; end if;
  if coalesce(p_grace_days,0) not between 0 and 30 then raise exception 'Grace days must be between 0 and 30.' using errcode='22023'; end if;

  insert into public.client_service_entitlements(business_id,client_user_id,service_code,service_name,billing_model,monthly_amount,currency,status,access_state,grace_days,metadata,updated_at)
  values(p_business_id,p_client_user_id,s.code,s.name,upper(coalesce(p_billing_model,'ONE_OFF')),coalesce(p_amount,0),s.default_currency,'ACTIVE','ENABLED',coalesce(p_grace_days,0),jsonb_build_object('source','SUPER_ADMIN_GRANT','granted_by',auth.uid(),'grant_notes',p_notes,'access_override',true),now())
  on conflict (business_id,service_code) do update set client_user_id=excluded.client_user_id,service_name=excluded.service_name,billing_model=excluded.billing_model,monthly_amount=excluded.monthly_amount,currency=excluded.currency,status='ACTIVE',access_state='ENABLED',grace_days=excluded.grace_days,lock_reason=null,unlocked_at=now(),metadata=public.client_service_entitlements.metadata || excluded.metadata,updated_at=now()
  returning * into e;
  return e;
end;
$$;

create or replace function public.client_service_revoke(p_entitlement_id uuid,p_reason text default null)
returns public.client_service_entitlements
language plpgsql
security definer
set search_path=public
as $$
declare e public.client_service_entitlements;
begin
  if not public.is_super_admin() then raise exception 'Only Super Admin may revoke client service access.' using errcode='42501'; end if;
  update public.client_service_entitlements set status='SUSPENDED',access_state='LOCKED',locked_at=now(),lock_reason=coalesce(nullif(trim(p_reason),''),'Access revoked by Super Admin.'),metadata=metadata || jsonb_build_object('revoked_by',auth.uid(),'revoked_at',now()),updated_at=now() where id=p_entitlement_id returning * into e;
  if not found then raise exception 'Service entitlement not found.' using errcode='P0002'; end if;
  return e;
end;
$$;

revoke all on function public.client_service_admin_snapshot() from public;
revoke all on function public.client_service_grant(uuid,uuid,text,text,numeric,integer,text) from public;
revoke all on function public.client_service_revoke(uuid,text) from public;
grant execute on function public.client_service_admin_snapshot() to authenticated;
grant execute on function public.client_service_grant(uuid,uuid,text,text,numeric,integer,text) to authenticated;
grant execute on function public.client_service_revoke(uuid,text) to authenticated;

notify pgrst,'reload schema';
commit;
