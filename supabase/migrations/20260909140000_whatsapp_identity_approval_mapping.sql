-- Isaacs & Partners: authoritative account -> approval -> WhatsApp mapping
-- Identity: public.profiles. Client approval: public.client_portal_access.
-- Manual mapping accepts only user id + phone; role/chat id are derived server-side.

begin;

create or replace function public.normalise_whatsapp_phone(p_phone text)
returns text language plpgsql immutable as $$
declare v text := regexp_replace(coalesce(trim(p_phone),''),'[^0-9+]','','g');
begin
    if v='' then return null; end if;
    if left(v,2)='00' then v:='+'||substr(v,3); end if;
    if left(v,1)='+' then v:=substr(v,2); end if;
    if left(v,1)='0' then v:='27'||substr(v,2); end if;
    if v !~ '^[0-9]{8,15}$' then return null; end if;
    return v;
end; $$;

create or replace function public.whatsapp_chat_id_from_phone(p_phone text)
returns text language sql immutable as $$
select case when public.normalise_whatsapp_phone(p_phone) is null then null else public.normalise_whatsapp_phone(p_phone)||'@c.us' end;
$$;

delete from public.communication_contacts a
where exists (select 1 from public.communication_contacts b where b.user_id=a.user_id and b.id<>a.id and b.created_at>a.created_at);
create unique index if not exists communication_contacts_user_uidx on public.communication_contacts(user_id);
create index if not exists communication_contacts_phone_idx on public.communication_contacts(phone_number);

create or replace function public.sync_whatsapp_contact_for_user(p_user_id uuid,p_phone_number text default null)
returns public.communication_contacts language plpgsql security definer set search_path=public as $$
declare p public.profiles; status text; phone text; chat text; r public.communication_contacts;
begin
    if p_user_id is null then raise exception 'User id is required.' using errcode='22023'; end if;
    if not (auth.role()='service_role' or public.is_super_admin()) then raise exception 'WhatsApp mapping access denied.' using errcode='42501'; end if;
    select * into p from public.profiles where id=p_user_id;
    if p.id is null then raise exception 'Profile not found.' using errcode='P0002'; end if;
    if not coalesce(p.is_active,true) then update public.communication_contacts set is_active=false,updated_at=now() where user_id=p_user_id; return null; end if;
    if upper(p.role::text) in ('INDIVIDUAL','BUSINESS') then
        select coalesce(c.status,'PENDING') into status from public.client_portal_access c where c.user_id=p_user_id;
        if status<>'APPROVED' then update public.communication_contacts set is_active=false,updated_at=now() where user_id=p_user_id; return null; end if;
    elsif upper(p.role::text) not in ('STAFF','SUPER_ADMIN') then raise exception 'Profile role is not eligible for WhatsApp mapping.' using errcode='42501'; end if;
    phone:=public.normalise_whatsapp_phone(coalesce(nullif(trim(p_phone_number),''),p.phone));
    if phone is null then update public.communication_contacts set is_active=false,updated_at=now() where user_id=p_user_id; return null; end if;
    chat:=phone||'@c.us';
    delete from public.communication_contacts where chat_id=chat and user_id<>p_user_id;
    insert into public.communication_contacts(user_id,phone_number,chat_id,is_active,updated_at)
    values(p_user_id,phone,chat,true,now())
    on conflict(user_id) do update set phone_number=excluded.phone_number,chat_id=excluded.chat_id,is_active=true,updated_at=now()
    returning * into r;
    return r;
end; $$;
revoke all on function public.sync_whatsapp_contact_for_user(uuid,text) from public;
grant execute on function public.sync_whatsapp_contact_for_user(uuid,text) to service_role;

create or replace function public.map_whatsapp_contact(p_user_id uuid,p_phone_number text)
returns public.communication_contacts language plpgsql security definer set search_path=public as $$
declare r public.communication_contacts; role_name text;
begin
    if not public.is_super_admin() then raise exception 'Only Super Admin may map WhatsApp contacts.' using errcode='42501'; end if;
    select upper(role::text) into role_name from public.profiles where id=p_user_id;
    if role_name is null then raise exception 'Profile not found.' using errcode='P0002'; end if;
    if role_name in ('INDIVIDUAL','BUSINESS') and not exists(select 1 from public.client_portal_access where user_id=p_user_id and status='APPROVED') then raise exception 'Client portal access must be APPROVED before WhatsApp mapping.' using errcode='42501'; end if;
    select * into r from public.sync_whatsapp_contact_for_user(p_user_id,p_phone_number);
    if r.id is null then raise exception 'A valid active phone number is required for WhatsApp mapping.' using errcode='22023'; end if;
    return r;
end; $$;
revoke all on function public.map_whatsapp_contact(uuid,text) from public;
grant execute on function public.map_whatsapp_contact(uuid,text) to authenticated;

create or replace function public.client_portal_approve(p_user_id uuid,p_notes text default null)
returns public.client_portal_access language plpgsql security definer set search_path=public as $$
declare r public.client_portal_access; role_name text;
begin
    if not public.is_super_admin() then raise exception 'Only Super Admin may approve client portal access.' using errcode='42501'; end if;
    select upper(role::text) into role_name from public.profiles where id=p_user_id;
    if role_name not in ('INDIVIDUAL','BUSINESS') then raise exception 'Only Individual and Business accounts may be approved through the client portal workflow.' using errcode='42501'; end if;
    insert into public.client_portal_access(user_id,status,approved_by,approved_at,suspended_by,suspended_at,notes,updated_at)
    values(p_user_id,'APPROVED',auth.uid(),now(),null,null,p_notes,now())
    on conflict(user_id) do update set status='APPROVED',approved_by=excluded.approved_by,approved_at=excluded.approved_at,suspended_by=null,suspended_at=null,notes=excluded.notes,updated_at=now()
    returning * into r;
    perform public.sync_whatsapp_contact_for_user(p_user_id,null);
    return r;
end; $$;
grant execute on function public.client_portal_approve(uuid,text) to authenticated;

create or replace function public.client_portal_suspend(p_user_id uuid,p_notes text default null)
returns public.client_portal_access language plpgsql security definer set search_path=public as $$
declare r public.client_portal_access;
begin
    if not public.is_super_admin() then raise exception 'Only Super Admin may suspend client portal access.' using errcode='42501'; end if;
    insert into public.client_portal_access(user_id,status,suspended_by,suspended_at,notes,updated_at)
    values(p_user_id,'SUSPENDED',auth.uid(),now(),p_notes,now())
    on conflict(user_id) do update set status='SUSPENDED',suspended_by=excluded.suspended_by,suspended_at=excluded.suspended_at,notes=excluded.notes,updated_at=now()
    returning * into r;
    update public.communication_contacts set is_active=false,updated_at=now() where user_id=p_user_id;
    return r;
end; $$;
grant execute on function public.client_portal_suspend(uuid,text) to authenticated;

create or replace function public.sync_whatsapp_contact_after_profile_change()
returns trigger language plpgsql security definer set search_path=public as $$
declare s text;
begin
    if not coalesce(new.is_active,true) then update public.communication_contacts set is_active=false,updated_at=now() where user_id=new.id; return new; end if;
    if upper(new.role::text) in ('STAFF','SUPER_ADMIN') then perform public.sync_whatsapp_contact_for_user(new.id,new.phone);
    elsif upper(new.role::text) in ('INDIVIDUAL','BUSINESS') then
        select coalesce(status,'PENDING') into s from public.client_portal_access where user_id=new.id;
        if s='APPROVED' then perform public.sync_whatsapp_contact_for_user(new.id,new.phone); else update public.communication_contacts set is_active=false,updated_at=now() where user_id=new.id; end if;
    end if;
    return new;
end; $$;
drop trigger if exists profiles_whatsapp_contact_sync on public.profiles;
create trigger profiles_whatsapp_contact_sync after insert or update of role,phone,is_active on public.profiles for each row execute function public.sync_whatsapp_contact_after_profile_change();

drop policy if exists communication_contacts_owner_select on public.communication_contacts;
drop policy if exists communication_contacts_owner_insert on public.communication_contacts;
drop policy if exists communication_contacts_owner_update on public.communication_contacts;
drop policy if exists communication_contacts_owner_delete on public.communication_contacts;
drop policy if exists communication_contacts_authorised_select on public.communication_contacts;
drop policy if exists communication_contacts_super_admin_write on public.communication_contacts;
create policy communication_contacts_authorised_select on public.communication_contacts for select to authenticated using(public.is_super_admin() or (public.current_user_role()='STAFF'::app_role and public.has_staff_permission('view_communications')));
create policy communication_contacts_super_admin_write on public.communication_contacts for all to authenticated using(public.is_super_admin()) with check(public.is_super_admin());

create or replace function public.queue_openwa_message(p_chat_id text,p_body text,p_matter_id uuid default null,p_phone_number text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare mid uuid; u uuid:=auth.uid(); c public.communication_contacts;
begin
    if u is null then raise exception 'Authentication required' using errcode='42501'; end if;
    if not(public.is_super_admin() or (public.current_user_role()='STAFF'::app_role and public.has_staff_permission('manage_communications'))) then raise exception 'You are not authorised to send WhatsApp messages.' using errcode='42501'; end if;
    select * into c from public.communication_contacts where chat_id=trim(coalesce(p_chat_id,'')) and is_active=true;
    if c.id is null then raise exception 'The WhatsApp contact is not mapped to an active account.' using errcode='42501'; end if;
    if p_body is null or char_length(trim(p_body))=0 or char_length(p_body)>4096 then raise exception 'Message body must contain 1 to 4096 characters'; end if;
    insert into public.communication_messages(customer_user_id,matter_id,channel,direction,phone_number,chat_id,body,status,metadata)
    values(c.user_id,p_matter_id,'WHATSAPP','OUTBOUND',coalesce(p_phone_number,c.phone_number),c.chat_id,trim(p_body),'QUEUED',jsonb_build_object('queued_by',u,'recipient_user_id',c.user_id)) returning id into mid;
    insert into public.communication_outbox(message_id,chat_id,status) values(mid,c.chat_id,'QUEUED');
    return mid;
end; $$;
grant execute on function public.queue_openwa_message(text,text,uuid,text) to authenticated;

do $$ declare r record; begin
    for r in select p.id,p.phone from public.profiles p where coalesce(p.is_active,true) and upper(p.role::text) in ('STAFF','SUPER_ADMIN') loop perform public.sync_whatsapp_contact_for_user(r.id,r.phone); end loop;
    for r in select p.id,p.phone from public.profiles p join public.client_portal_access c on c.user_id=p.id and c.status='APPROVED' where coalesce(p.is_active,true) and upper(p.role::text) in ('INDIVIDUAL','BUSINESS') loop perform public.sync_whatsapp_contact_for_user(r.id,r.phone); end loop;
end $$;

commit;
