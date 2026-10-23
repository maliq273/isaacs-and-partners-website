begin;
-- Financial ledgers are append-oriented: vendor payments cannot be edited or deleted.
revoke all on public.ap_vendor_audit from anon,authenticated;
revoke all on public.anthony_memory_audit from anon,authenticated;
grant select,insert,update on public.ap_vendors to authenticated;
grant select,insert,update on public.ap_vendor_invoices to authenticated;
grant select,insert on public.ap_vendor_payments to authenticated;
grant select on public.ap_vendor_audit to authenticated;
grant select,insert,update on public.anthony_memory_entries to authenticated;
grant select on public.anthony_memory_audit to authenticated;
grant select,insert,update on public.appointment_availability_slots to authenticated;
grant select,update on public.appointment_booking_requests to authenticated;
revoke delete on public.ap_vendors,public.ap_vendor_invoices,public.ap_vendor_payments,public.anthony_memory_entries,public.appointment_availability_slots from authenticated;
revoke update,delete on public.ap_vendor_payments from authenticated;
revoke all on function public.audit_ap_vendor_change() from public,anon,authenticated;
revoke all on function public.audit_anthony_memory_change() from public,anon,authenticated;
revoke all on function public.admin_decide_booking_request(uuid,text) from public,anon;
grant execute on function public.admin_decide_booking_request(uuid,text) to authenticated;
revoke all on function public.submit_public_booking_request(uuid,text,text,text,text,text) from public,authenticated;
grant execute on function public.submit_public_booking_request(uuid,text,text,text,text,text) to anon;

create or replace function public.sync_ap_vendor_invoice_status()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_invoice_id uuid; v_total numeric; v_paid numeric; v_status text;
begin
 v_invoice_id:=new.vendor_invoice_id;
 select total_amount,status into v_total,v_status from public.ap_vendor_invoices where id=v_invoice_id;
 if v_status is null or v_status in ('VOID','DISPUTED') then return new; end if;
 select coalesce(sum(amount),0) into v_paid from public.ap_vendor_payments where vendor_invoice_id=v_invoice_id;
 update public.ap_vendor_invoices set status=case when v_paid>=v_total then 'PAID' when v_paid>0 then 'PART_PAID' else status end,updated_at=now() where id=v_invoice_id;
 return new;
end $$;
revoke all on function public.sync_ap_vendor_invoice_status() from public,anon,authenticated;
drop trigger if exists ap_vendor_payment_sync_status on public.ap_vendor_payments;
create trigger ap_vendor_payment_sync_status after insert on public.ap_vendor_payments for each row execute function public.sync_ap_vendor_invoice_status();
notify pgrst,'reload schema';
commit;