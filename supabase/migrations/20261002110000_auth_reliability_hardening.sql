-- Authentication reliability hardening
-- Public registration must create the authoritative profile role from the
-- server-supplied account_type metadata. Public clients can only request
-- INDIVIDUAL or BUSINESS; STAFF/SUPER_ADMIN are never accepted here.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    requested_account_type text;
    assigned_role public.app_role;
begin
    requested_account_type := lower(trim(coalesce(new.raw_user_meta_data ->> 'account_type', 'individual')));

    assigned_role := case
        when requested_account_type = 'business' then 'BUSINESS'::public.app_role
        else 'INDIVIDUAL'::public.app_role
    end;

    insert into public.profiles (
        id,
        email,
        first_name,
        last_name,
        phone,
        role
    )
    values (
        new.id,
        new.email,
        new.raw_user_meta_data ->> 'first_name',
        new.raw_user_meta_data ->> 'last_name',
        coalesce(new.phone, new.raw_user_meta_data ->> 'phone'),
        assigned_role
    )
    on conflict (id)
    do update set
        email = excluded.email,
        first_name = coalesce(excluded.first_name, public.profiles.first_name),
        last_name = coalesce(excluded.last_name, public.profiles.last_name),
        phone = coalesce(excluded.phone, public.profiles.phone);

    return new;
end;
$function$;
