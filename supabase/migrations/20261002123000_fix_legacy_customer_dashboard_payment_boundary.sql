-- Legacy customer dashboard RPC still used by app/client/customer-dashboard.js.
-- It must not call the browser-inaccessible ai_invoice_paid_amount() helper.
-- Payment totals are calculated inside this SECURITY DEFINER customer-scoped function.
create or replace function public.customer_portal_dashboard_snapshot()
returns jsonb language plpgsql security definer stable set search_path=public
as $$
declare u uuid:=auth.uid(); out jsonb;
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
 'invoices',coalesce((select jsonb_agg(to_jsonb(i)||jsonb_build_object('authoritative_paid_amount',coalesce((select sum(p.amount) from public.payments p where p.invoice_id=i.id and upper(coalesce(p.status,'')) in ('PAID','COMPLETED','SUCCESSFUL','SETTLED')),0)) order by i.created_at desc) from public.invoices i where i.individual_user_id=u or exists(select 1 from public.businesses b where b.id=i.business_id and b.owner_user_id=u) or exists(select 1 from public.matters m where m.id=i.matter_id and (m.individual_user_id=u or exists(select 1 from public.businesses b where b.id=m.business_id and b.owner_user_id=u)))),'[]'::jsonb),
 'payments',coalesce((select jsonb_agg(to_jsonb(p) order by p.paid_at desc) from public.payments p where exists(select 1 from public.invoices i where i.id=p.invoice_id and (i.individual_user_id=u or exists(select 1 from public.businesses b where b.id=i.business_id and b.owner_user_id=u)))),'[]'::jsonb),
 'notifications',coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc) from public.notifications n where n.recipient_user_id=u),'[]'::jsonb),
 'whatsapp_messages',coalesce((select jsonb_agg(to_jsonb(cm) order by cm.created_at desc) from public.communication_messages cm where cm.customer_user_id=u and cm.channel='WHATSAPP'),'[]'::jsonb)
 ) into out;
 return out;
end $$;
revoke all on function public.customer_portal_dashboard_snapshot() from public,anon;
grant execute on function public.customer_portal_dashboard_snapshot() to authenticated;