revoke execute on function public.void_invoice_payment(uuid,text) from anon;
revoke execute on function public.void_invoice_payment(uuid,text) from public;
grant execute on function public.void_invoice_payment(uuid,text) to authenticated;
