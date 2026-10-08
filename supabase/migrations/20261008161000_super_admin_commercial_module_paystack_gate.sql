begin;

-- Commercial module assignments may belong to an individual client without a company.
alter table public.client_service_entitlements alter column business_id drop not null;
create unique index if not exists client_service_entitlements_individual_service_uq
on public.client_service_entitlements(client_user_id,service_code)
where business_id is null and client_user_id is not null;

update public.service_catalog
set pricing_mode=case
 when code in ('HR-PAYROLL','HR-SARS') then 'CUSTOM'
 when service_domain in ('IMMIGRATION','HR & Industrial Relations','HR','Business Compliance') then 'FIXED'
 else pricing_mode end,
 metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
   'commercial_controlled',true,
   'payment_provider','PAYSTACK',
   'release_requires_verified_payment',true,
   'billing_rule',case
     when code='HR-PAYROLL' then 'PER_EMPLOYEE_PAYSLIP'
     when code='HR-SARS' then 'MONTHLY'
     when service_domain in ('IMMIGRATION','HR & Industrial Relations','HR','Business Compliance') then 'INDIVIDUAL_SERVICE'
     else 'CUSTOM' end
 ),
 updated_at=now()
where active=true;

-- Super Admin assignment creates an invoice but never unlocks the service.
-- HR Payroll is per payslip; SARS is monthly; Immigration/HR docs/Business Compliance are individual service charges.
create or replace function public.client_service_grant(p_business_id uuid,p_client_user_id uuid,p_service_code text,p_billing_model text default 'ONE_OFF',p_amount numeric default 0,p_grace_days integer default 0,p_notes text default null)
returns public.client_service_entitlements language plpgsql security definer set search_path=public as $$
declare s public.service_catalog; b public.businesses; p public.profiles; e public.client_service_entitlements; inv public.invoices; v_amount numeric; v_model text;
begin
 if not public.is_super_admin() then raise exception 'Only Super Admin may grant client service access.'; end if;
 select * into p from public.profiles where id=p_client_user_id and is_active and role::text in ('BUSINESS','INDIVIDUAL'); if not found then raise exception 'Active client profile not found.'; end if;
 if p_business_id is not null then select * into b from public.businesses where id=p_business_id and is_active; if not found then raise exception 'Active business not found.'; end if; if p.role::text='BUSINESS' and b.owner_user_id<>p_client_user_id then raise exception 'Business client does not own the selected business.'; end if; end if;
 select * into s from public.service_catalog where code=trim(p_service_code) and active; if not found then raise exception 'Selected service is not active.'; end if;
 v_model:=case when s.code='HR-PAYROLL' then 'PER_EMPLOYEE_PAYSLIP' when s.code='HR-SARS' then 'MONTHLY' when s.service_domain in ('IMMIGRATION','HR & Industrial Relations','HR','Business Compliance') then 'ONE_OFF' else upper(coalesce(p_billing_model,'ONE_OFF')) end;
 v_amount:=coalesce(p_amount,0); if v_amount<=0 then raise exception 'A positive commercial amount is required. Every released service must have a Paystack-verified payment.'; end if;

 if p_business_id is null then
  select * into e from public.client_service_entitlements where business_id is null and client_user_id=p_client_user_id and service_code=s.code for update;
  if found then
   update public.client_service_entitlements set service_name=s.name,billing_model=v_model,monthly_amount=v_amount,currency=s.default_currency,status='ACTIVE',access_state='LOCKED',lock_reason='Awaiting Paystack payment verification.',metadata=metadata||jsonb_build_object('source','SUPER_ADMIN_ASSIGNMENT','granted_by',auth.uid(),'grant_notes',p_notes,'approval_state','APPROVED','payment_provider','PAYSTACK','payment_verified',false,'release_requires_verified_payment',true),updated_at=now() where id=e.id returning * into e;
  else
   insert into public.client_service_entitlements(business_id,client_user_id,service_code,service_name,billing_model,monthly_amount,currency,status,access_state,grace_days,metadata,updated_at) values(null,p_client_user_id,s.code,s.name,v_model,v_amount,s.default_currency,'ACTIVE','LOCKED',p_grace_days,jsonb_build_object('source','SUPER_ADMIN_ASSIGNMENT','granted_by',auth.uid(),'grant_notes',p_notes,'approval_state','APPROVED','payment_provider','PAYSTACK','payment_verified',false,'release_requires_verified_payment',true),now()) returning * into e;
  end if;
 else
  insert into public.client_service_entitlements(business_id,client_user_id,service_code,service_name,billing_model,monthly_amount,currency,status,access_state,grace_days,metadata,updated_at)
  values(p_business_id,p_client_user_id,s.code,s.name,v_model,v_amount,s.default_currency,'ACTIVE','LOCKED',p_grace_days,jsonb_build_object('source','SUPER_ADMIN_ASSIGNMENT','granted_by',auth.uid(),'grant_notes',p_notes,'approval_state','APPROVED','payment_provider','PAYSTACK','payment_verified',false,'release_requires_verified_payment',true),now())
  on conflict (business_id,service_code) do update set client_user_id=excluded.client_user_id,service_name=excluded.service_name,billing_model=excluded.billing_model,monthly_amount=excluded.monthly_amount,currency=excluded.currency,status='ACTIVE',access_state='LOCKED',lock_reason='Awaiting Paystack payment verification.',grace_days=excluded.grace_days,metadata=public.client_service_entitlements.metadata||excluded.metadata,updated_at=now() returning * into e;
 end if;

 insert into public.invoices(individual_user_id,business_id,description,amount,amount_paid,currency,status,due_at,issued_at,created_by,invoice_date,due_date,subject,subtotal,total,balance_due,customer_notes,terms_and_conditions,payment_stage)
 values(p_client_user_id,p_business_id,'Service assignment: '||s.name,v_amount,0,s.default_currency,'ISSUED',now()+interval '7 days',now(),auth.uid(),current_date,current_date+7,s.name,v_amount,v_amount,v_amount,'Access is released only after Paystack verifies payment.','All service payments are processed through Paystack. No service output or module access is released before verified payment.','AWAITING_PAYMENT') returning * into inv;
 update public.client_service_entitlements set current_invoice_id=inv.id,lock_reason='Awaiting Paystack payment verification.',metadata=metadata||jsonb_build_object('invoice_id',inv.id),updated_at=now() where id=e.id returning * into e;
 return e;
end $$;

create or replace function public.client_service_payment_verified(p_invoice_id uuid,p_payment_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare e public.client_service_entitlements; p public.payments;
begin
 select * into p from public.payments where id=p_payment_id and invoice_id=p_invoice_id and provider='PAYSTACK' and status='COMPLETED'; if not found then raise exception 'Paystack payment has not been verified.'; end if;
 update public.client_service_entitlements set access_state='ENABLED',unlocked_at=now(),lock_reason=null,metadata=metadata||jsonb_build_object('payment_verified',true,'payment_id',p.id,'verified_at',now()),updated_at=now() where current_invoice_id=p_invoice_id returning * into e;
 if not found then raise exception 'Service entitlement linked to this invoice was not found.'; end if;
 return jsonb_build_object('ok',true,'entitlement_id',e.id,'service_code',e.service_code,'access_state',e.access_state);
end $$;

create or replace function public.client_service_admin_snapshot()
returns jsonb language plpgsql security definer stable set search_path=public as $$
declare r jsonb;
begin
 if not public.is_super_admin() then raise exception 'Only Super Admin may manage client service access.' using errcode='42501'; end if;
 select jsonb_build_object(
 'services',coalesce((select jsonb_agg(jsonb_build_object('code',s.code,'name',s.name,'service_domain',s.service_domain,'pricing_mode',s.pricing_mode,'billing_rule',s.metadata->>'billing_rule','currency',s.default_currency,'minimum_fee',s.minimum_fee,'active',s.active) order by s.service_domain,s.name) from public.service_catalog s where s.active),'[]'::jsonb),
 'clients',coalesce((select jsonb_agg(jsonb_build_object('user_id',p.id,'email',p.email,'first_name',p.first_name,'last_name',p.last_name,'role',p.role,'is_active',p.is_active,'businesses',coalesce((select jsonb_agg(jsonb_build_object('business_id',b.id,'legal_name',b.legal_name,'trading_name',b.trading_name,'entitlements',coalesce((select jsonb_agg(to_jsonb(e) order by e.service_name) from public.client_service_entitlements e where e.business_id=b.id),'[]'::jsonb),'access_requests',coalesce((select jsonb_agg(to_jsonb(x) order by x.requested_at desc) from public.client_service_access_requests x where x.business_id=b.id and x.client_user_id=p.id),'[]'::jsonb)) from public.businesses b where b.owner_user_id=p.id and b.is_active),'[]'::jsonb),'individual_entitlements',coalesce((select jsonb_agg(to_jsonb(e) order by e.service_name) from public.client_service_entitlements e where e.business_id is null and e.client_user_id=p.id),'[]'::jsonb)) order by p.created_at desc) from public.profiles p where p.role::text in ('BUSINESS','INDIVIDUAL') and p.is_active),'[]'::jsonb));
 return r;
end $$;

create or replace function public.enforce_paystack_for_service_invoice()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 if exists(select 1 from public.client_service_entitlements e where e.current_invoice_id=new.invoice_id) and upper(coalesce(new.provider,''))<>'PAYSTACK' then
  raise exception 'Service invoices may only be paid through Paystack.' using errcode='42501';
 end if;
 return new;
end $$;
drop trigger if exists trg_service_invoice_paystack_only on public.payments;
create trigger trg_service_invoice_paystack_only before insert or update of provider on public.payments for each row execute function public.enforce_paystack_for_service_invoice();

revoke all on function public.client_service_grant(uuid,uuid,text,text,numeric,integer,text) from public;
grant execute on function public.client_service_grant(uuid,uuid,text,text,numeric,integer,text) to authenticated;
revoke all on function public.client_service_payment_verified(uuid,uuid) from public;
grant execute on function public.client_service_payment_verified(uuid,uuid) to authenticated;
notify pgrst,'reload schema';
commit;