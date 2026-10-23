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
  values(s.appointment_type,'Public booking — '||r.customer_name,s.starts_at,s.ends_at,'SCHEDULED',auth.uid(),case when s.delivery_mode='physical' then 'physical' else 'virtual' end,'PUBLIC','Booking request '||r.id::text) returning id into v_appointment_id;
  update public.appointment_availability_slots set booked_appointment_id=v_appointment_id,active=false,updated_at=now() where id=s.id;
 else
  update public.appointment_availability_slots set booking_request_id=null,updated_at=now() where id=s.id and booking_request_id=r.id;
 end if;
 update public.appointment_booking_requests set status=v_decision,updated_at=now() where id=r.id;
 return jsonb_build_object('ok',true,'request_id',r.id,'status',v_decision,'appointment_id',v_appointment_id);
end $$;
revoke all on function public.admin_decide_booking_request(uuid,text) from public,anon;
grant execute on function public.admin_decide_booking_request(uuid,text) to authenticated;
notify pgrst,'reload schema';