-- Generate and control the final 50% invoice after dossier completion.
begin;

alter table public.invoices add column if not exists payment_stage text not null default 'PRIMARY';
alter table public.invoices add column if not exists parent_invoice_id uuid references public.invoices(id) on delete set null;
create index if not exists invoices_payment_stage_matter_idx on public.invoices(matter_id,payment_stage,created_at desc);
create unique index if not exists invoices_final_balance_once_uidx on public.invoices(matter_id,payment_stage)
  where payment_stage='FINAL_BALANCE' and matter_id is not null;

create or replace function public.anthony_mark_application_complete(p_matter_id uuid,p_source_invoice_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_source public.invoices; v_paid numeric:=0; v_balance numeric:=0; v_invoice_id uuid; v_number text;
begin
  if not (auth.role()='service_role' or public.is_super_admin() or public.staff_ai_can(auth.uid(),'LIAISE_WITH_AI')) then
    raise exception 'Not authorised to complete an Anthony application workflow.' using errcode='42501';
  end if;
  select * into v_source from public.invoices where id=p_source_invoice_id and matter_id=p_matter_id;
  if v_source.id is null then raise exception 'Source invoice not found for matter.' using errcode='P0002'; end if;
  select coalesce(sum(amount),0) into v_paid from public.payments where invoice_id=v_source.id and status='COMPLETED';
  if v_paid < round(coalesce(v_source.total,v_source.amount,0)*0.5,2) then
    raise exception 'The 50 percent deposit has not been verified.' using errcode='42501';
  end if;

  select id into v_invoice_id from public.invoices
   where matter_id=p_matter_id and payment_stage='FINAL_BALANCE'
   order by created_at desc limit 1;

  if v_invoice_id is not null then
    update public.anthony_workflow_state set state='FINAL_PAYMENT_PENDING',
      application_completed_at=coalesce(application_completed_at,now()),
      release_status='HELD_PENDING_FINAL_PAYMENT',updated_at=now()
     where matter_id=p_matter_id;
    return v_invoice_id;
  end if;

  v_balance:=round(greatest(coalesce(v_source.total,v_source.amount,0)-v_paid,0),2);
  if v_balance <= 0 then
    update public.anthony_workflow_state set state='SUBMISSION_RELEASED',
      application_completed_at=coalesce(application_completed_at,now()),
      final_payment_verified_at=now(),submission_released_at=now(),
      release_status='RELEASED_AFTER_FINAL_PAYMENT',updated_at=now()
     where matter_id=p_matter_id;
    return v_source.id;
  end if;

  v_number:='INV-FINAL-'||to_char(current_date,'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));

  insert into public.invoices(
    matter_id,quote_id,business_id,individual_user_id,invoice_number,invoice_date,due_date,terms,
    currency,subject,subtotal,discount_type,discount_value,discount_amount,tax_rate,tax_amount,
    shipping_charge,adjustment,total,amount_paid,balance_due,status,customer_notes,
    terms_and_conditions,created_by,payment_stage,parent_invoice_id
  ) values (
    p_matter_id,v_source.quote_id,v_source.business_id,v_source.individual_user_id,v_number,current_date,
    current_date,'DUE_ON_RECEIPT',coalesce(v_source.currency,'ZAR'),
    'Final 50% balance — application dossier completed',v_balance,'PERCENT',0,0,0,0,0,0,v_balance,0,v_balance,
    'SENT','Final 50% payment is required before release for DHA/VFS submission.',
    coalesce(v_source.terms_and_conditions,v_source.terms),coalesce(v_source.created_by,auth.uid()),
    'FINAL_BALANCE',v_source.id
  ) returning id into v_invoice_id;

  insert into public.invoice_items(invoice_id,item_order,item_name,description,quantity,rate,tax_rate,discount_type,discount_value,amount)
  values(v_invoice_id,1,'Final 50% Professional Fee',
    'Final balance due when the application dossier is complete, before DHA/VFS submission.',
    1,v_balance,0,'PERCENT',0,v_balance);

  insert into public.anthony_workflow_state(matter_id,client_user_id,quote_id,invoice_id,state,application_completed_at,release_status)
  values(p_matter_id,v_source.individual_user_id,v_source.quote_id,v_invoice_id,'FINAL_PAYMENT_PENDING',now(),'HELD_PENDING_FINAL_PAYMENT')
  on conflict (matter_id) do update set invoice_id=excluded.invoice_id,state=excluded.state,
    application_completed_at=excluded.application_completed_at,release_status=excluded.release_status,updated_at=now();

  if v_source.individual_user_id is not null then
    insert into public.notifications(recipient_user_id,channel,subject,message,status,provider,metadata)
    values(v_source.individual_user_id,'PORTAL','Final 50% invoice issued',
      'Your application dossier has reached completion. The remaining 50% is due before the completed dossier can be released for DHA/VFS submission.',
      'PENDING','INTERNAL',jsonb_build_object('invoice_id',v_invoice_id,'matter_id',p_matter_id,'stage','FINAL_BALANCE'));
  end if;

  update public.client_documents set commercial_release_status='HELD_PENDING_FINAL_PAYMENT',updated_at=now()
   where matter_id=p_matter_id;
  return v_invoice_id;
end;
$$;

revoke execute on function public.anthony_mark_application_complete(uuid,uuid) from public,anon;
grant execute on function public.anthony_mark_application_complete(uuid,uuid) to authenticated,service_role;
notify pgrst,'reload schema';
commit;
