-- Fix customer dashboard snapshot after AI helper grant hardening.
-- The dashboard snapshot is SECURITY DEFINER and already scopes invoices to
-- the authenticated customer's own matters/business. It must not call the
-- raw ai_invoice_paid_amount() helper because that helper is intentionally
-- unavailable to browser-authenticated users.

create or replace function public.client_portal_dashboard_snapshot()
returns jsonb language plpgsql security definer stable set search_path=public
as $$
declare v_user uuid:=auth.uid(); v_status text; v_result jsonb;
begin
    if v_user is null then raise exception 'Authentication required.' using errcode='42501'; end if;
    v_status:=public.client_portal_access_status();

    select jsonb_build_object(
        'access_status',v_status,
        'profile',(select to_jsonb(p) from public.profiles p where p.id=v_user),
        'matters',coalesce((select jsonb_agg(to_jsonb(m) order by m.updated_at desc nulls last,m.created_at desc)
            from public.matters m
            where m.individual_user_id=v_user
               or exists(select 1 from public.businesses b where b.id=m.business_id and b.owner_user_id=v_user)),'[]'::jsonb),
        'documents',coalesce((select jsonb_agg(to_jsonb(d) order by d.updated_at desc nulls last,d.created_at desc)
            from public.documents d
            where d.individual_user_id=v_user
               or exists(select 1 from public.businesses b where b.id=d.business_id and b.owner_user_id=v_user)
               or exists(select 1 from public.matters m where m.id=d.matter_id and
                    (m.individual_user_id=v_user or exists(select 1 from public.businesses b where b.id=m.business_id and b.owner_user_id=v_user)))),'[]'::jsonb),
        'appointments',coalesce((select jsonb_agg(to_jsonb(a) order by a.starts_at asc)
            from public.appointments a
            where a.starts_at>=now()
              and a.status in ('SCHEDULED','CONFIRMED')
              and (a.individual_user_id=v_user
                   or exists(select 1 from public.businesses b where b.id=a.business_id and b.owner_user_id=v_user)
                   or exists(select 1 from public.matters m where m.id=a.matter_id and
                        (m.individual_user_id=v_user or exists(select 1 from public.businesses b where b.id=m.business_id and b.owner_user_id=v_user)))),'[]'::jsonb),
        'invoices',coalesce((select jsonb_agg(
                to_jsonb(i)||jsonb_build_object(
                    'authoritative_paid_amount',
                    coalesce((select sum(p.amount)
                        from public.payments p
                        where p.invoice_id=i.id
                          and upper(coalesce(p.status,'')) in ('PAID','COMPLETED','SUCCESSFUL','SETTLED')),0)
                )
                order by i.created_at desc)
            from public.invoices i
            where i.individual_user_id=v_user
               or exists(select 1 from public.businesses b where b.id=i.business_id and b.owner_user_id=v_user)
               or exists(select 1 from public.matters m where m.id=i.matter_id and
                    (m.individual_user_id=v_user or exists(select 1 from public.businesses b where b.id=m.business_id and b.owner_user_id=v_user)))),'[]'::jsonb),
        'notifications',coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at desc)
            from public.notifications n where n.recipient_user_id=v_user),'[]'::jsonb),
        'conversations',coalesce((select jsonb_agg(to_jsonb(c) order by c.updated_at desc)
            from public.ai_conversations c where c.client_user_id=v_user),'[]'::jsonb)
    ) into v_result;

    return v_result;
end;
$$;

revoke all on function public.client_portal_dashboard_snapshot() from public;
grant execute on function public.client_portal_dashboard_snapshot() to authenticated;
