create or replace function public.anthony_verified_payment_event(p_invoice_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_invoice public.invoices;
  v_paid numeric := 0;
  v_event text;
  v_percent numeric := 0;
  v_client uuid;
  v_matter uuid;
  v_conversation uuid;
  v_payload jsonb;
begin
  select * into v_invoice from public.invoices where id=p_invoice_id;
  if v_invoice.id is null then return jsonb_build_object('ok',false,'reason','invoice_not_found'); end if;

  select coalesce(sum(p.amount),0) into v_paid
    from public.payments p
   where p.invoice_id=p_invoice_id and p.status='COMPLETED';

  if coalesce(v_invoice.total, v_invoice.amount, 0) <= 0 then
    return jsonb_build_object('ok',false,'reason','invalid_invoice_total');
  end if;

  v_percent := round((v_paid / coalesce(v_invoice.total, v_invoice.amount)) * 100,2);
  v_client := v_invoice.individual_user_id;
  v_matter := v_invoice.matter_id;

  select c.id into v_conversation
    from public.ai_conversations c
   where c.matter_id=v_matter and c.client_user_id=v_client
   order by c.last_message_at desc nulls last, c.created_at desc
   limit 1;

  if v_paid >= coalesce(v_invoice.total,v_invoice.amount) then
    v_event := 'FINAL_PAYMENT_VERIFIED';
  elsif v_paid >= coalesce(v_invoice.total,v_invoice.amount) * 0.5 then
    v_event := 'DEPOSIT_PAYMENT_VERIFIED';
  else
    v_event := 'PARTIAL_PAYMENT_RECORDED';
  end if;

  v_payload := jsonb_build_object(
    'invoice_id',p_invoice_id,
    'matter_id',v_matter,
    'client_user_id',v_client,
    'verified_paid',v_paid,
    'invoice_total',coalesce(v_invoice.total,v_invoice.amount),
    'verified_percent',v_percent,
    'stage',case when v_paid >= coalesce(v_invoice.total,v_invoice.amount) then 'FINAL'
                 when v_paid >= coalesce(v_invoice.total,v_invoice.amount)*0.5 then 'DEPOSIT'
                 else 'PARTIAL' end
  );

  if v_event in ('DEPOSIT_PAYMENT_VERIFIED','FINAL_PAYMENT_VERIFIED') then
    insert into public.ai_agent_events(conversation_id,matter_id,event_type,actor_type,actor_user_id,payload)
    values(v_conversation,v_matter,v_event,'SYSTEM',null,v_payload);

    if v_client is not null then
      insert into public.notifications(recipient_user_id,channel,subject,message,status,provider,metadata)
      values(
        v_client,'IN_APP',
        case when v_event='FINAL_PAYMENT_VERIFIED' then 'Final payment verified' else '50% payment verified' end,
        case when v_event='FINAL_PAYMENT_VERIFIED'
          then 'Your final 50% payment has been verified. Your completed dossier is now authorised for the applicable submission stage.'
          else 'Your 50% initial payment has been verified. Your matter can now proceed to application preparation.'
        end,
        'PENDING','INTERNAL',v_payload
      );
    end if;

    if v_event='FINAL_PAYMENT_VERIFIED' and v_matter is not null then
      update public.client_documents
         set commercial_release_status='RELEASED_AFTER_FINAL_PAYMENT', updated_at=now()
       where matter_id=v_matter;

      update public.anthony_workflow_state
         set state='SUBMISSION_RELEASED',
             final_payment_verified_at=now(),
             submission_released_at=now(),
             release_status='RELEASED_AFTER_FINAL_PAYMENT',
             updated_at=now()
       where matter_id=v_matter;
    end if;
  end if;

  return v_payload || jsonb_build_object('ok',true,'event_type',v_event);
end;
$function$;

revoke execute on function public.anthony_verified_payment_event(uuid) from public, anon, authenticated;
grant execute on function public.anthony_verified_payment_event(uuid) to service_role;
