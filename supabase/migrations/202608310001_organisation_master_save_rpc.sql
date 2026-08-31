-- PR32: atomic, server-authoritative save path for the Isaacs & Partners
-- organisation master record.
--
-- The browser must never depend on a client-side POST succeeding silently.
-- This RPC is the single write path for the organisation master and enforces
-- Super Admin access, one active master, and safe created_by handling.

create or replace function public.save_organisation_master(p_payload jsonb)
returns public.organisation_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
    v_id uuid;
    v_uid uuid := auth.uid();
    v_created_by uuid;
    v_row public.organisation_profiles%rowtype;
begin
    if not public.is_super_admin() then
        raise exception 'SUPER_ADMIN access required';
    end if;

    if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
        raise exception 'Organisation profile payload must be a JSON object';
    end if;

    -- Reuse the current active master when one exists; otherwise reuse the
    -- most recently maintained profile. This avoids duplicate master records.
    select id into v_id
      from public.organisation_profiles
     where is_active
     order by updated_at desc nulls last, created_at desc nulls last
     limit 1;

    if v_id is null then
        select id into v_id
          from public.organisation_profiles
         order by updated_at desc nulls last, created_at desc nulls last
         limit 1;
    end if;

    -- Only retain auth.uid() as created_by when the referenced profile exists.
    -- This prevents a foreign-key failure from an authentication account that
    -- has not yet been mirrored into public.profiles.
    if v_uid is not null and exists (select 1 from public.profiles p where p.id = v_uid) then
        v_created_by := v_uid;
    end if;

    if v_id is null then
        insert into public.organisation_profiles (
            legal_name, trading_name, entity_type, registration_number,
            cipc_number, financial_year_end, income_tax_number, vat_registered,
            vat_number, vat_effective_date, paye_registered, uif_registered,
            sdl_registered, registered_address, physical_address, postal_address,
            city, province, postal_code, country, phone, whatsapp, email,
            billing_email, accounts_email, website, bank_name, account_holder,
            account_number, account_type, branch_code, swift_code, logo_url,
            default_currency, default_vat_rate, quote_prefix, invoice_prefix,
            receipt_prefix, credit_note_prefix, debit_note_prefix,
            quote_validity_days, default_payment_terms, default_invoice_notes,
            default_terms_conditions, is_active, created_by, created_at, updated_at
        ) values (
            coalesce(nullif(trim(p_payload->>'legal_name'), ''), 'Isaacs & Partners'),
            nullif(trim(p_payload->>'trading_name'), ''),
            nullif(trim(p_payload->>'entity_type'), ''),
            nullif(trim(p_payload->>'registration_number'), ''),
            nullif(trim(p_payload->>'cipc_number'), ''),
            nullif(p_payload->>'financial_year_end', '')::date,
            nullif(trim(p_payload->>'income_tax_number'), ''),
            coalesce((p_payload->>'vat_registered')::boolean, false),
            nullif(trim(p_payload->>'vat_number'), ''),
            nullif(p_payload->>'vat_effective_date', '')::date,
            coalesce((p_payload->>'paye_registered')::boolean, false),
            coalesce((p_payload->>'uif_registered')::boolean, false),
            coalesce((p_payload->>'sdl_registered')::boolean, false),
            nullif(trim(p_payload->>'registered_address'), ''),
            nullif(trim(p_payload->>'physical_address'), ''),
            nullif(trim(p_payload->>'postal_address'), ''),
            nullif(trim(p_payload->>'city'), ''),
            nullif(trim(p_payload->>'province'), ''),
            nullif(trim(p_payload->>'postal_code'), ''),
            coalesce(nullif(trim(p_payload->>'country'), ''), 'South Africa'),
            nullif(trim(p_payload->>'phone'), ''),
            nullif(trim(p_payload->>'whatsapp'), ''),
            nullif(trim(p_payload->>'email'), ''),
            nullif(trim(p_payload->>'billing_email'), ''),
            nullif(trim(p_payload->>'accounts_email'), ''),
            nullif(trim(p_payload->>'website'), ''),
            nullif(trim(p_payload->>'bank_name'), ''),
            nullif(trim(p_payload->>'account_holder'), ''),
            nullif(trim(p_payload->>'account_number'), ''),
            nullif(trim(p_payload->>'account_type'), ''),
            nullif(trim(p_payload->>'branch_code'), ''),
            nullif(trim(p_payload->>'swift_code'), ''),
            nullif(trim(p_payload->>'logo_url'), ''),
            coalesce(nullif(trim(p_payload->>'default_currency'), ''), 'ZAR'),
            coalesce((p_payload->>'default_vat_rate')::numeric, 15),
            coalesce(nullif(trim(p_payload->>'quote_prefix'), ''), 'QUO-'),
            coalesce(nullif(trim(p_payload->>'invoice_prefix'), ''), 'INV-'),
            coalesce(nullif(trim(p_payload->>'receipt_prefix'), ''), 'REC-'),
            coalesce(nullif(trim(p_payload->>'credit_note_prefix'), ''), 'CN-'),
            coalesce(nullif(trim(p_payload->>'debit_note_prefix'), ''), 'DN-'),
            coalesce((p_payload->>'quote_validity_days')::integer, 7),
            nullif(trim(p_payload->>'default_payment_terms'), ''),
            nullif(trim(p_payload->>'default_invoice_notes'), ''),
            nullif(trim(p_payload->>'default_terms_conditions'), ''),
            true, v_created_by, now(), now()
        ) returning * into v_row;
    else
        update public.organisation_profiles
           set legal_name = coalesce(nullif(trim(p_payload->>'legal_name'), ''), legal_name),
               trading_name = nullif(trim(p_payload->>'trading_name'), ''),
               entity_type = nullif(trim(p_payload->>'entity_type'), ''),
               registration_number = nullif(trim(p_payload->>'registration_number'), ''),
               cipc_number = nullif(trim(p_payload->>'cipc_number'), ''),
               financial_year_end = nullif(p_payload->>'financial_year_end', '')::date,
               income_tax_number = nullif(trim(p_payload->>'income_tax_number'), ''),
               vat_registered = coalesce((p_payload->>'vat_registered')::boolean, false),
               vat_number = nullif(trim(p_payload->>'vat_number'), ''),
               vat_effective_date = nullif(p_payload->>'vat_effective_date', '')::date,
               paye_registered = coalesce((p_payload->>'paye_registered')::boolean, false),
               uif_registered = coalesce((p_payload->>'uif_registered')::boolean, false),
               sdl_registered = coalesce((p_payload->>'sdl_registered')::boolean, false),
               registered_address = nullif(trim(p_payload->>'registered_address'), ''),
               physical_address = nullif(trim(p_payload->>'physical_address'), ''),
               postal_address = nullif(trim(p_payload->>'postal_address'), ''),
               city = nullif(trim(p_payload->>'city'), ''),
               province = nullif(trim(p_payload->>'province'), ''),
               postal_code = nullif(trim(p_payload->>'postal_code'), ''),
               country = coalesce(nullif(trim(p_payload->>'country'), ''), 'South Africa'),
               phone = nullif(trim(p_payload->>'phone'), ''),
               whatsapp = nullif(trim(p_payload->>'whatsapp'), ''),
               email = nullif(trim(p_payload->>'email'), ''),
               billing_email = nullif(trim(p_payload->>'billing_email'), ''),
               accounts_email = nullif(trim(p_payload->>'accounts_email'), ''),
               website = nullif(trim(p_payload->>'website'), ''),
               bank_name = nullif(trim(p_payload->>'bank_name'), ''),
               account_holder = nullif(trim(p_payload->>'account_holder'), ''),
               account_number = nullif(trim(p_payload->>'account_number'), ''),
               account_type = nullif(trim(p_payload->>'account_type'), ''),
               branch_code = nullif(trim(p_payload->>'branch_code'), ''),
               swift_code = nullif(trim(p_payload->>'swift_code'), ''),
               logo_url = nullif(trim(p_payload->>'logo_url'), ''),
               default_currency = coalesce(nullif(trim(p_payload->>'default_currency'), ''), 'ZAR'),
               default_vat_rate = coalesce((p_payload->>'default_vat_rate')::numeric, 15),
               quote_prefix = coalesce(nullif(trim(p_payload->>'quote_prefix'), ''), 'QUO-'),
               invoice_prefix = coalesce(nullif(trim(p_payload->>'invoice_prefix'), ''), 'INV-'),
               receipt_prefix = coalesce(nullif(trim(p_payload->>'receipt_prefix'), ''), 'REC-'),
               credit_note_prefix = coalesce(nullif(trim(p_payload->>'credit_note_prefix'), ''), 'CN-'),
               debit_note_prefix = coalesce(nullif(trim(p_payload->>'debit_note_prefix'), ''), 'DN-'),
               quote_validity_days = coalesce((p_payload->>'quote_validity_days')::integer, 7),
               default_payment_terms = nullif(trim(p_payload->>'default_payment_terms'), ''),
               default_invoice_notes = nullif(trim(p_payload->>'default_invoice_notes'), ''),
               default_terms_conditions = nullif(trim(p_payload->>'default_terms_conditions'), ''),
               is_active = true,
               updated_at = now()
         where id = v_id
         returning * into v_row;
    end if;

    -- Explicitly deactivate any stale records after the write. The unique
    -- partial index remains the final database invariant for one active master.
    update public.organisation_profiles
       set is_active = false,
           updated_at = now()
     where is_active and id <> v_row.id;

    return v_row;
end;
$$;

revoke all on function public.save_organisation_master(jsonb) from public;
grant execute on function public.save_organisation_master(jsonb) to authenticated;

comment on function public.save_organisation_master(jsonb) is
    'Authoritative Super Admin write path for the single active Isaacs & Partners organisation master record.';
