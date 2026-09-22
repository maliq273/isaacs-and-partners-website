-- Service Costing Centre: authoritative internal costing and pricing model
-- Applied to production Supabase on 2026-09-22.

create table if not exists public.service_catalog (
 id uuid primary key default gen_random_uuid(),
 code text not null unique,
 name text not null,
 service_domain text,
 description text,
 pricing_mode text not null default 'COST_PLUS' check (pricing_mode in ('FIXED','COST_PLUS','HOURLY','CUSTOM')),
 default_currency text not null default 'ZAR',
 tax_rate numeric(7,4) not null default 0,
 minimum_fee numeric(14,2) not null default 0,
 active boolean not null default true,
 metadata jsonb not null default '{}'::jsonb,
 created_by uuid,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.service_cost_components (
 id uuid primary key default gen_random_uuid(),
 service_id uuid not null references public.service_catalog(id) on delete cascade,
 component_name text not null,
 component_type text not null default 'INTERNAL' check (component_type in ('LABOUR','EXTERNAL','OVERHEAD','DISBURSEMENT','INTERNAL','OTHER')),
 unit text not null default 'FIXED',
 quantity numeric(14,4) not null default 1,
 unit_cost numeric(14,2) not null default 0,
 markup_percent numeric(9,4) not null default 0,
 billable boolean not null default true,
 active boolean not null default true,
 sort_order integer not null default 0,
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.service_pricing_rules (
 id uuid primary key default gen_random_uuid(),
 service_id uuid not null references public.service_catalog(id) on delete cascade,
 rule_name text not null,
 pricing_mode text not null default 'COST_PLUS' check (pricing_mode in ('FIXED','COST_PLUS','HOURLY','CUSTOM')),
 fixed_price numeric(14,2),
 markup_percent numeric(9,4) not null default 0,
 minimum_fee numeric(14,2) not null default 0,
 maximum_discount_percent numeric(9,4) not null default 0,
 active boolean not null default true,
 effective_from date not null default current_date,
 effective_to date,
 priority integer not null default 100,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create index if not exists idx_service_cost_components_service on public.service_cost_components(service_id,active,sort_order);
create index if not exists idx_service_pricing_rules_service on public.service_pricing_rules(service_id,active,priority,effective_from);

alter table public.service_catalog enable row level security;
alter table public.service_cost_components enable row level security;
alter table public.service_pricing_rules enable row level security;

drop policy if exists service_catalog_admin_all on public.service_catalog;
create policy service_catalog_admin_all on public.service_catalog for all to authenticated using (exists (select 1 from public.authority_directory a where a.user_id=auth.uid() and a.is_active=true and a.authority_role='SUPER_ADMIN')) with check (exists (select 1 from public.authority_directory a where a.user_id=auth.uid() and a.is_active=true and a.authority_role='SUPER_ADMIN'));

drop policy if exists service_cost_components_admin_all on public.service_cost_components;
create policy service_cost_components_admin_all on public.service_cost_components for all to authenticated using (exists (select 1 from public.authority_directory a where a.user_id=auth.uid() and a.is_active=true and a.authority_role='SUPER_ADMIN')) with check (exists (select 1 from public.authority_directory a where a.user_id=auth.uid() and a.is_active=true and a.authority_role='SUPER_ADMIN'));

drop policy if exists service_pricing_rules_admin_all on public.service_pricing_rules;
create policy service_pricing_rules_admin_all on public.service_pricing_rules for all to authenticated using (exists (select 1 from public.authority_directory a where a.user_id=auth.uid() and a.is_active=true and a.authority_role='SUPER_ADMIN')) with check (exists (select 1 from public.authority_directory a where a.user_id=auth.uid() and a.is_active=true and a.authority_role='SUPER_ADMIN'));

create or replace view public.service_costing_summary as
select s.id as service_id,s.code,s.name,s.service_domain,s.description,s.pricing_mode,s.default_currency,s.tax_rate,s.minimum_fee,s.active,
coalesce(sum(c.quantity*c.unit_cost) filter(where c.active),0)::numeric(14,2) as direct_cost,
coalesce(sum(c.quantity*c.unit_cost*(1+c.markup_percent/100)) filter(where c.active and c.billable),0)::numeric(14,2) as component_billable_total,
coalesce(max(r.fixed_price) filter(where r.active and r.pricing_mode='FIXED'),null)::numeric(14,2) as fixed_price,
coalesce(max(r.markup_percent) filter(where r.active),0)::numeric(9,4) as rule_markup_percent,
coalesce(max(r.minimum_fee) filter(where r.active),s.minimum_fee)::numeric(14,2) as effective_minimum_fee
from public.service_catalog s
left join public.service_cost_components c on c.service_id=s.id
left join public.service_pricing_rules r on r.service_id=s.id
group by s.id;

create or replace function public.calculate_service_price(p_service_id uuid,p_quantity numeric default 1)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s public.service_catalog; v_direct numeric:=0; v_billable numeric:=0; v_price numeric:=0; v_markup numeric:=0; v_fixed numeric; v_minimum numeric:=0;
begin
select * into s from public.service_catalog where id=p_service_id and active=true;
if not found then raise exception 'SERVICE_NOT_FOUND'; end if;
select coalesce(sum(quantity*unit_cost),0),coalesce(sum(quantity*unit_cost*(1+markup_percent/100)) filter(where billable),0) into v_direct,v_billable from public.service_cost_components where service_id=p_service_id and active=true;
select max(fixed_price),coalesce(max(markup_percent),0),coalesce(max(minimum_fee),s.minimum_fee) into v_fixed,v_markup,v_minimum from public.service_pricing_rules where service_id=p_service_id and active=true;
if s.pricing_mode='FIXED' and v_fixed is not null then v_price=v_fixed; else v_price=v_billable*(1+v_markup/100)*greatest(coalesce(p_quantity,1),0); end if;
v_price=greatest(v_price,v_minimum);
return jsonb_build_object('service_id',s.id,'code',s.code,'name',s.name,'currency',s.default_currency,'direct_cost',round(v_direct,2),'billable_component_total',round(v_billable,2),'markup_percent',v_markup,'minimum_fee',v_minimum,'price_before_tax',round(v_price,2),'tax_rate',s.tax_rate,'tax_amount',round(v_price*s.tax_rate/100,2),'total',round(v_price*(1+s.tax_rate/100),2));
end $$;

grant select on public.service_costing_summary to authenticated;
grant execute on function public.calculate_service_price(uuid,numeric) to authenticated;

-- Seed approved pricing anchors from the existing company pricing catalogue.
insert into public.service_catalog (code,name,service_domain,description,pricing_mode,default_currency,tax_rate,active,metadata) values
('CONSULTATION-PAID','Paid Consultation','Legal','Approved paid consultation rate.','FIXED','ZAR',0,true,jsonb_build_object('vat','EXCLUDED','source','app/data/service-pricing.json')),
('HR-HEARING-REP-HOURLY','HR / IR Hearing Representation','HR & Industrial Relations','Approved hourly hearing representation rate.','HOURLY','ZAR',0,true,jsonb_build_object('source','app/data/service-pricing.json')),
('HR-DOCUMENT-SUPPLIED','HR / IR Document Supplied','HR & Industrial Relations','Approved supplied-document rate.','FIXED','ZAR',0,true,jsonb_build_object('source','app/data/service-pricing.json')),
('BUSINESS-COMPLIANCE-RETAINER','Business Compliance Retainer','Business Compliance','Approved monthly base retainer.','FIXED','ZAR',0,true,jsonb_build_object('baseIncludedItems',3,'source','app/data/service-pricing.json')),
('HR-PAYROLL-OUTSOURCING','Payroll Outsourcing','HR & Industrial Relations','Percentage-based payroll outsourcing.','CUSTOM','ZAR',0,true,jsonb_build_object('formula','12.5_PERCENT_OF_MONTHLY_EMPLOYEE_SALARY','source','app/data/service-pricing.json')),
('HR-TEMP-STAFFING','Temporary Staffing','HR & Industrial Relations','Percentage-based temporary staffing.','CUSTOM','ZAR',0,true,jsonb_build_object('formula','23.5_PERCENT_OF_EMPLOYEE_HOURLY_RATE','source','app/data/service-pricing.json'))
on conflict(code) do update set name=excluded.name,service_domain=excluded.service_domain,description=excluded.description,pricing_mode=excluded.pricing_mode,metadata=excluded.metadata,updated_at=now();

insert into public.service_pricing_rules(service_id,rule_name,pricing_mode,fixed_price,active,priority,metadata)
select id,'Approved catalogue price','FIXED',1250,true,10,jsonb_build_object('vat','EXCLUDED') from public.service_catalog where code='CONSULTATION-PAID'
and not exists(select 1 from public.service_pricing_rules r where r.service_id=public.service_catalog.id and r.rule_name='Approved catalogue price');
insert into public.service_pricing_rules(service_id,rule_name,pricing_mode,fixed_price,active,priority)
select id,'Approved catalogue hourly rate','HOURLY',400,true,10 from public.service_catalog where code='HR-HEARING-REP-HOURLY'
and not exists(select 1 from public.service_pricing_rules r where r.service_id=public.service_catalog.id and r.rule_name='Approved catalogue hourly rate');
insert into public.service_pricing_rules(service_id,rule_name,pricing_mode,fixed_price,active,priority)
select id,'Approved catalogue document rate','FIXED',150,true,10 from public.service_catalog where code='HR-DOCUMENT-SUPPLIED'
and not exists(select 1 from public.service_pricing_rules r where r.service_id=public.service_catalog.id and r.rule_name='Approved catalogue document rate');
insert into public.service_pricing_rules(service_id,rule_name,pricing_mode,fixed_price,active,priority,metadata)
select id,'Approved catalogue monthly retainer','FIXED',1250,true,10,jsonb_build_object('baseIncludedItems',3) from public.service_catalog where code='BUSINESS-COMPLIANCE-RETAINER'
and not exists(select 1 from public.service_pricing_rules r where r.service_id=public.service_catalog.id and r.rule_name='Approved catalogue monthly retainer');