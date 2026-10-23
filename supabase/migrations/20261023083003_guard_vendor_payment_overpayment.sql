begin;
create or replace function public.validate_ap_vendor_payment()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_total numeric; v_status text; v_paid numeric;
begin
 select total_amount,status into v_total,v_status from public.ap_vendor_invoices where id=new.vendor_invoice_id for update;
 if v_total is null then raise exception 'Vendor invoice not found.' using errcode='P0002'; end if;
 if v_status in ('VOID','DISPUTED') then raise exception 'Payments cannot be recorded against a void or disputed vendor invoice.' using errcode='22023'; end if;
 select coalesce(sum(amount),0) into v_paid from public.ap_vendor_payments where vendor_invoice_id=new.vendor_invoice_id;
 if round(v_paid+new.amount,2)>round(v_total,2) then raise exception 'Payment exceeds the outstanding vendor invoice balance.' using errcode='22023'; end if;
 return new;
end $$;
revoke all on function public.validate_ap_vendor_payment() from public,anon,authenticated;
drop trigger if exists ap_vendor_payment_validate on public.ap_vendor_payments;
create trigger ap_vendor_payment_validate before insert on public.ap_vendor_payments for each row execute function public.validate_ap_vendor_payment();
notify pgrst,'reload schema';
commit;