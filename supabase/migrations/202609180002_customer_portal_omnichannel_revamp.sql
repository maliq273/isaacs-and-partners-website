-- Customer portal omnichannel revamp. Extends existing operational tables; no duplicate customer tables.
alter table public.matters add column if not exists service_type text, add column if not exists portal_request_status text not null default 'submitted', add column if not exists portal_metadata jsonb not null default '{}'::jsonb;
alter table public.matters drop constraint if exists matters_portal_request_status_check;
alter table public.matters add constraint matters_portal_request_status_check check (portal_request_status in ('submitted','under_review','action_required','approved','completed'));
create index if not exists matters_portal_request_status_idx on public.matters(portal_request_status,updated_at desc);

alter table public.businesses add column if not exists vat_number text, add column if not exists bbbee_level integer, add column if not exists has_coida_letter boolean not null default false, add column if not exists compliance_updated_at timestamptz;
alter table public.businesses drop constraint if exists businesses_vat_number_check;
alter table public.businesses add constraint businesses_vat_number_check check (vat_number is null or vat_number ~ '^4[0-9]{9}$');
alter table public.businesses drop constraint if exists businesses_bbbee_level_check;
alter table public.businesses add constraint businesses_bbbee_level_check check (bbbee_level is null or bbbee_level between 1 and 8);

alter table public.appointments add column if not exists delivery_mode text not null default 'physical', add column if not exists meeting_link text, add column if not exists physical_address text, add column if not exists booking_source text not null default 'INTERNAL', add column if not exists customer_confirmed_at timestamptz;
alter table public.appointments drop constraint if exists appointments_delivery_mode_check;
alter table public.appointments add constraint appointments_delivery_mode_check check (delivery_mode in ('virtual','physical'));

alter table public.quotes add column if not exists customer_signature_name text, add column if not exists customer_signature_text text, add column if not exists customer_signed_at timestamptz, add column if not exists customer_signature_metadata jsonb not null default '{}'::jsonb;

create or replace function public.client_portal_queue_notification(p_recipient_user_id uuid,p_subject text,p_message text,p_metadata jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=''
as $$
declare v_auth uuid:=(select auth.uid()); c public.communication_contacts; m public.communication_messages; n uuid; meta jsonb:=coalesce(p_metadata,'{}'::jsonb);
begin
 if v_auth is null then raise exception 'Authentication required.' using errcode='42501'; end if;
 if p_recipient_user_id is distinct from v_auth and not public.is_super_admin() and current_user<>'service_role' then raise exception 'Notification recipient is outside caller scope.' using errcode='42501'; end if;
 select * into c from public.communication_contacts where user_id=p_recipient_user_id and is_active=true order by updated_at desc limit 1;
 if c.id is not null and coalesce(c.whatsapp_consent,true) then
  insert into public.communication_messages(customer_user_id,channel,direction,phone_number,chat_id,body,status,metadata) values(p_recipient_user_id,'WHATSAPP','OUTBOUND',c.phone_number,c.chat_id,trim(p_message),'QUEUED',jsonb_build_object('source','customer_portal','notification_subject',p_subject)||meta) returning * into m;
  insert into public.communication_outbox(message_id,session_id,chat_id,status,available_at) values(m.id,null,c.chat_id,'QUEUED',now());
  meta:=meta||jsonb_build_object('communication_message_id',m.id,'whatsapp_eligible',true);
  insert into public.notifications(recipient_user_id,channel,subject,message,status,provider,metadata) values(p_recipient_user_id,'WHATSAPP',p_subject,p_message,'PENDING','OPENWA',meta) returning id into n;
 else
  meta:=meta||jsonb_build_object('whatsapp_eligible',false);
  insert into public.notifications(recipient_user_id,channel,subject,message,status,provider,metadata) values(p_recipient_user_id,'IN_APP',p_subject,p_message,'SENT','SUPABASE',meta) returning id into n;
 end if;
 return n;
end $$;
revoke all on function public.client_portal_queue_notification(uuid,text,text,jsonb) from public,anon,authenticated;

create or replace function public.client_portal_create_service_request(p_service_type text,p_title text,p_description text default null,p_business_id uuid default null)
returns public.matters language plpgsql security definer set search_path=''
as $$
declare u uuid:=(select auth.uid()); m public.matters; b public.businesses;
begin
 if u is null then raise exception 'Authentication required.' using errcode='42501'; end if;
 if public.client_portal_access_status()<>'APPROVED' then raise exception 'Client portal access is not approved.' using errcode='42501'; end if;
 if nullif(trim(p_service_type),'') is null or nullif(trim(p_title),'') is null then raise exception 'Service type and title are required.' using errcode='22023'; end if;
 if p_business_id is not null then select * into b from public.businesses where id=p_business_id and owner_user_id=u; if b.id is null then raise exception 'Business is outside caller scope.' using errcode='42501'; end if; end if;
 insert into public.matters(individual_user_id,business_id,title,description,service_type,portal_request_status,portal_metadata,created_by)
 values(case when p_business_id is null then u end,p_business_id,trim(p_title),nullif(trim(p_description),''),trim(p_service_type),'submitted',jsonb_build_object('source','CUSTOMER_PORTAL'),u) returning * into m;
 perform public.client_portal_queue_notification(u,'Service request submitted',format('Your %s service request has been submitted and is now with Isaacs & Partners for review.',trim(p_service_type)),jsonb_build_object('type','SERVICE_REQUEST','matter_id',m.id));
 return m;
end $$;
revoke all on function public.client_portal_create_service_request(text,text,text,uuid) from public,anon;
grant execute on function public.client_portal_create_service_request(text,text,text,uuid) to authenticated;

create or replace function public.client_portal_update_business_compliance(p_business_id uuid,p_registered_name text,p_trading_name text default null,p_cipc_number text default null,p_sars_tax_number text default null,p_vat_number text default null,p_bbbee_level integer default null,p_has_coida_letter boolean default false)
returns public.businesses language plpgsql security definer set search_path=''
as $$
declare u uuid:=(select auth.uid()); b public.businesses;
begin
 if u is null then raise exception 'Authentication required.' using errcode='42501'; end if;
 select * into b from public.businesses where id=p_business_id and owner_user_id=u; if b.id is null then raise exception 'Business is outside caller scope.' using errcode='42501'; end if;
 if nullif(trim(p_registered_name),'') is null then raise exception 'Registered business name is required.' using errcode='22023'; end if;
 if p_cipc_number is not null and trim(p_cipc_number)!~'^[0-9]{4}/[0-9]{6}/[0-9]{2}$' then raise exception 'Invalid CIPC format. Expected YYYY/NNNNNN/NN.' using errcode='22023'; end if;
 if p_sars_tax_number is not null and trim(p_sars_tax_number)!~'^[0-9]{10}$' then raise exception 'Invalid SARS income tax number. Expected 10 digits.' using errcode='22023'; end if;
 if p_vat_number is not null and trim(p_vat_number)!~'^4[0-9]{9}$' then raise exception 'Invalid South African VAT number. Expected 10 digits beginning with 4.' using errcode='22023'; end if;
 if p_bbbee_level is not null and (p_bbbee_level<1 or p_bbbee_level>8) then raise exception 'B-BBEE level must be between 1 and 8.' using errcode='22023'; end if;
 update public.businesses set legal_name=trim(p_registered_name),trading_name=nullif(trim(p_trading_name),''),registration_number=coalesce(nullif(trim(p_cipc_number),''),registration_number),tax_number=coalesce(nullif(trim(p_sars_tax_number),''),tax_number),vat_number=nullif(trim(p_vat_number),''),bbbee_level=p_bbbee_level,has_coida_letter=coalesce(p_has_coida_letter,false),compliance_updated_at=now(),updated_at=now() where id=p_business_id returning * into b;
 perform public.client_portal_queue_notification(u,'RSA compliance profile updated','Your CIPC, SARS, VAT and B-BBEE compliance profile has been updated in the customer portal.',jsonb_build_object('type','BUSINESS_COMPLIANCE','business_id',p_business_id));
 return b;
end $$;
revoke all on function public.client_portal_update_business_compliance(uuid,text,text,text,text,text,integer,boolean) from public,anon;
grant execute on function public.client_portal_update_business_compliance(uuid,text,text,text,text,text,integer,boolean) to authenticated;

create or replace function public.client_portal_book_appointment(p_matter_id uuid,p_scheduled_time timestamptz,p_delivery_mode text,p_title text default 'Customer consultation')
returns public.appointments language plpgsql security definer set search_path=''
as $$
declare u uuid:=(select auth.uid()); m public.matters; a public.appointments; addr text; room text;
begin
 if u is null then raise exception 'Authentication required.' using errcode='42501'; end if;
 if public.client_portal_access_status()<>'APPROVED' then raise exception 'Client portal access is not approved.' using errcode='42501'; end if;
 if p_scheduled_time<=now() then raise exception 'Appointment time must be in the future.' using errcode='22023'; end if;
 if lower(trim(p_delivery_mode)) not in ('virtual','physical') then raise exception 'Appointment type must be virtual or physical.' using errcode='22023'; end if;
 select * into m from public.matters x where x.id=p_matter_id and (x.individual_user_id=u or exists(select 1 from public.businesses b where b.id=x.business_id and b.owner_user_id=u)); if m.id is null then raise exception 'Matter is outside caller scope.' using errcode='42501'; end if;
 if exists(select 1 from public.appointments x where x.starts_at=p_scheduled_time and x.status in ('SCHEDULED','CONFIRMED')) then raise exception 'That appointment slot is no longer available.' using errcode='40901'; end if;
 select physical_address into addr from public.organisation_profiles where is_active=true order by updated_at desc limit 1;
 room:='IsaacsPartners-'||replace(gen_random_uuid()::text,'-','');
 insert into public.appointments(matter_id,individual_user_id,business_id,appointment_type,title,starts_at,ends_at,status,location,created_by,delivery_mode,meeting_link,physical_address,booking_source)
 values(p_matter_id,m.individual_user_id,m.business_id,case when lower(trim(p_delivery_mode))='virtual' then 'VIRTUAL' else 'PHYSICAL' end,coalesce(nullif(trim(p_title),''),'Customer consultation'),p_scheduled_time,p_scheduled_time+interval '30 minutes','SCHEDULED',case when lower(trim(p_delivery_mode))='virtual' then null else addr end,u,lower(trim(p_delivery_mode)),case when lower(trim(p_delivery_mode))='virtual' then 'https://meet.jit.si/'||room end,case when lower(trim(p_delivery_mode))='physical' then addr end,'CUSTOMER_PORTAL') returning * into a;
 perform public.client_portal_queue_notification(u,'Appointment booked',format('Your %s appointment is booked for %s.',initcap(lower(trim(p_delivery_mode))),to_char(p_scheduled_time at time zone 'Africa/Johannesburg','DD Mon YYYY HH24:MI')),jsonb_build_object('type','APPOINTMENT','appointment_id',a.id,'actions',jsonb_build_array(jsonb_build_object('action','confirm_booking','appointment_id',a.id,'label','Confirm appointment')),'delivery_mode',a.delivery_mode,'meeting_link',a.meeting_link,'physical_address',a.physical_address));
 return a;
end $$;
revoke all on function public.client_portal_book_appointment(uuid,timestamptz,text,text) from public,anon;
grant execute on function public.client_portal_book_appointment(uuid,timestamptz,text,text) to authenticated;

create or replace function public.client_portal_confirm_appointment(p_appointment_id uuid)
returns public.appointments language plpgsql security definer set search_path=''
as $$
declare u uuid:=(select auth.uid()); a public.appointments;
begin
 select * into a from public.appointments x where x.id=p_appointment_id and (x.individual_user_id=u or exists(select 1 from public.businesses b where b.id=x.business_id and b.owner_user_id=u)); if a.id is null then raise exception 'Appointment is outside caller scope.' using errcode='42501'; end if;
 update public.appointments set status='CONFIRMED',customer_confirmed_at=now(),updated_at=now() where id=p_appointment_id returning * into a;
 perform public.client_portal_queue_notification(u,'Appointment confirmed','Your appointment has been confirmed in the customer portal.',jsonb_build_object('type','APPOINTMENT_CONFIRMED','appointment_id',p_appointment_id));
 return a;
end $$;
revoke all on function public.client_portal_confirm_appointment(uuid) from public,anon;
grant execute on function public.client_portal_confirm_appointment(uuid) to authenticated;

create or replace function public.client_portal_accept_quote(p_quote_id uuid,p_signature_name text,p_signature_text text)
returns public.quotes language plpgsql security definer set search_path=''
as $$
declare u uuid:=(select auth.uid()); q public.quotes;
begin
 if nullif(trim(p_signature_name),'') is null or nullif(trim(p_signature_text),'') is null then raise exception 'Digital signature name and signature confirmation are required.' using errcode='22023'; end if;
 select * into q from public.quotes x where x.id=p_quote_id and (x.individual_user_id=u or exists(select 1 from public.businesses b where b.id=x.business_id and b.owner_user_id=u)); if q.id is null then raise exception 'Quote is outside caller scope.' using errcode='42501'; end if;
 if upper(coalesce(q.delivery_status,'')) not in ('SENT','DELIVERED','VIEWED') and coalesce(q.customer_decision,'')<>'ACCEPTED' then raise exception 'This quote is not currently available for customer acceptance.' using errcode='40901'; end if;
 update public.quotes set customer_decision='ACCEPTED',accepted_at=coalesce(accepted_at,now()),customer_signature_name=trim(p_signature_name),customer_signature_text=trim(p_signature_text),customer_signed_at=now(),customer_signature_metadata=jsonb_build_object('source','CUSTOMER_PORTAL','signed_at',now()),updated_by=u,updated_at=now() where id=p_quote_id returning * into q;
 perform public.client_portal_queue_notification(u,'Quote accepted',format('Quote %s has been digitally accepted by %s.',coalesce(q.quote_number,q.reference_number,'the customer'),trim(p_signature_name)),jsonb_build_object('type','QUOTE_ACCEPTED','quote_id',p_quote_id));
 return q;
end $$;
revoke all on function public.client_portal_accept_quote(uuid,text,text) from public,anon;
grant execute on function public.client_portal_accept_quote(uuid,text,text) to authenticated;

create or replace function public.client_portal_submit_rfq(p_business_id uuid,p_subject text,p_scope text,p_items jsonb default '[]'::jsonb)
returns public.matters language plpgsql security definer set search_path=''
as $$
declare u uuid:=(select auth.uid()); b public.businesses; m public.matters;
begin
 select * into b from public.businesses where id=p_business_id and owner_user_id=u; if b.id is null then raise exception 'Business is outside caller scope.' using errcode='42501'; end if;
 insert into public.matters(business_id,title,description,service_type,portal_request_status,portal_metadata,created_by) values(p_business_id,trim(p_subject),trim(p_scope),'RFQ / Pricing Request','submitted',jsonb_build_object('source','CUSTOMER_PORTAL','rfq_items',coalesce(p_items,'[]'::jsonb)),u) returning * into m;
 perform public.client_portal_queue_notification(u,'Pricing request submitted','Your RFQ has been submitted. Isaacs & Partners will review the scope and prepare an authoritative pricing response.',jsonb_build_object('type','RFQ','matter_id',m.id,'business_id',p_business_id));
 return m;
end $$;
revoke all on function public.client_portal_submit_rfq(uuid,text,text,jsonb) from public,anon;
grant execute on function public.client_portal_submit_rfq(uuid,text,text,jsonb) to authenticated;

create or replace function public.customer_portal_dashboard_snapshot()
returns jsonb language plpgsql security invoker set search_path=''
as $portal$
declare u uuid:=(select auth.uid()); out jsonb;
begin
 if u is null then raise exception 'Authentication required.' using errcode='42501'; end if;
 select jsonb_build_object(
 'access_status',public.client_portal_access_status(),
 'profile',(select to_jsonb(p) from public.profiles p where p.id=u),
 'businesses',coalesce((select jsonb_agg(to_jsonb(b) order by b.updated_at desc) from public.businesses b where b.owner_user_id=u),'[]'::jsonb),
 'matters',coalesce((select jsonb_agg(to_jsonb(m) order by m.updated_at desc,m.created_at desc) from public.matters m where m.individual_user_id=u or exists(select 1 from public.businesses b where b.id=m.business_id and b.owner_user_id=u)),'[]'::jsonb),
 'documents',coalesce((select jsonb_agg(to_jsonb(d) order by d.updated_at desc,d.created_at desc) from public.documents d where d.individual_user_id=u or exists(select 1 from public.businesses b where b.id=d.business_id and b.owner_user_id=u) or exists(select 1 from public.matters m where m.id=d.matter_id and (m.individual_user_id=u or exists(select 1 from public.businesses b where b.id=m.business_id and b.owner_user_id=u)))),'[]'::jsonb),
 'client_documents',coalesce((select jsonb_agg(to_jsonb(cd) order by cd.updated_at desc,cd.created_at desc) from public.client_documents cd where cd.client_id=u),'[]'::jsonb),
 'appointments',coalesce((select jsonb_agg(to_jsonb(a) order by a.starts_at asc) from public.appointments a where (a.individual_user_id=u or exists(select 1 from public.businesses b where b.id=a.business_id and b.owner_user_id=u) or exists(select 1 from public.matters m where m.id=a.matter_id and (m.individual_user_id=u or exists(select 1 from public.businesses b where b.id=m.business_id and b.owner_user_id=u)))) and a.starts_at>=now()-interval '7 days'),'[]'::jsonb),
 'quotes',coalesce((select jsonb_agg(to_jsonb(q)||jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(qi) order by qi.item_order,qi.created_at) from public.quote_items qi where qi.quote_id=q.id),'[]'::jsonb)) order by q.created_at desc) from public.quotes q where q.individual_user_id=u or exists(select 1 from public.businesses b where b.id=q.business_id and b.owner_user_id=u)),'[]'::jsonb),
 'invoices',coalesce((select jsonb_agg(to_jsonb(i)||jsonb_build_object('authoritative_paid_amount',public.ai_invoice_paid_amount(i.id)) order by i.created_at desc) from public.invoices i where i.individual_user_id=u or exists(select 1 from public.businesses b where b.id=i.business_id and b.owner_user_id=u) or exists(select 1 from public.matters m where m.id=i.matter_id and (m.individual_user_id=u or exists(select 1 from public.businesses b where b.id=m.business_id and b.owner_user_id=u)))),'[]'::jsonb),
 'payments',coalesce((select jsonb_agg(to_jsonb(p) order by p.paid_at desc) from public.payments p where exists(select 1 from public.invoices i where i.id=p.invoice_id and (i.individual_user_id=u or exists(select 1 from public.businesses b where b.id=i.business_id and b.owner_user_id=u)))),'[]'::jsonb),
 'notifications',coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc) from public.notifications n where n.recipient_user_id=u),'[]'::jsonb),
 'whatsapp_messages',coalesce((select jsonb_agg(to_jsonb(cm) order by cm.created_at desc) from public.communication_messages cm where cm.customer_user_id=u and cm.channel='WHATSAPP'),'[]'::jsonb)
 ) into out;
 return out;
end $portal$;
revoke all on function public.customer_portal_dashboard_snapshot() from public,anon;
grant execute on function public.customer_portal_dashboard_snapshot() to authenticated;

create or replace function public.sync_whatsapp_notification_from_message()
returns trigger language plpgsql security definer set search_path=''
as $$
declare existing_id uuid; st text;
begin
 if new.customer_user_id is null or new.channel<>'WHATSAPP' then return new; end if;
 select id into existing_id from public.notifications where recipient_user_id=new.customer_user_id and metadata->>'communication_message_id'=new.id::text limit 1;
 if new.direction='INBOUND' and existing_id is null then
  insert into public.notifications(recipient_user_id,channel,subject,message,status,provider,provider_reference,metadata)
  values(new.customer_user_id,'WHATSAPP','New WhatsApp message',new.body,'RECEIVED','OPENWA',new.openwa_message_id,jsonb_build_object('communication_message_id',new.id,'direction','INBOUND','source','OPENWA'));
 end if;
 if new.direction='OUTBOUND' and coalesce(new.metadata->>'source','')<>'customer_portal' then
  if existing_id is null then
   st:=case when new.status in ('SENT','DELIVERED','READ') then new.status when new.status='FAILED' then 'FAILED' else 'PENDING' end;
   insert into public.notifications(recipient_user_id,channel,subject,message,status,provider,provider_reference,metadata)
   values(new.customer_user_id,'WHATSAPP',coalesce(new.metadata->>'notification_subject','WhatsApp message from Isaacs & Partners'),new.body,st,'OPENWA',new.openwa_message_id,jsonb_build_object('communication_message_id',new.id,'direction','OUTBOUND','source','OPENWA'));
  end if;
  update public.notifications set status=case when new.status in ('SENT','DELIVERED','READ','FAILED') then new.status else status end,provider_reference=coalesce(new.openwa_message_id,provider_reference),updated_at=now()
  where recipient_user_id=new.customer_user_id and metadata->>'communication_message_id'=new.id::text;
 end if;
 return new;
end $$;
drop trigger if exists trg_sync_whatsapp_notification on public.communication_messages;
create trigger trg_sync_whatsapp_notification after insert or update of status,openwa_message_id,body on public.communication_messages for each row execute function public.sync_whatsapp_notification_from_message();
revoke all on function public.sync_whatsapp_notification_from_message() from public,anon,authenticated;
grant execute on function public.sync_whatsapp_notification_from_message() to service_role;

do $$
declare t text;
begin
 foreach t in array array['notifications','matters','documents','client_documents','appointments','quotes','invoices','communication_messages'] loop
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
   execute format('alter publication supabase_realtime add table public.%I',t);
  end if;
 end loop;
end $$;