-- PR31: repair organisation master persistence.
--
-- PR30 allowed an organisation profile to be saved with is_active=false while
-- the browser only loaded active profiles. This made a successfully persisted
-- master record appear to disappear after navigation/reload. The master record
-- is now explicitly treated as a single active source of truth.

begin;

-- If PR30 already created one or more profiles, retain the most recently
-- maintained profile as the active master. Older profiles remain preserved.
do $$
declare
    master_id uuid;
begin
    select id
      into master_id
      from public.organisation_profiles
     order by updated_at desc nulls last, created_at desc nulls last
     limit 1;

    if master_id is not null then
        update public.organisation_profiles
           set is_active = false
         where is_active = true
           and id <> master_id;

        update public.organisation_profiles
           set is_active = true,
               updated_at = now()
         where id = master_id;
    end if;
end;
$$;

-- Keep the database invariant explicit: the application has one active issuer
-- profile at a time. The partial unique index already enforces this.
create unique index if not exists organisation_profiles_one_active_idx
    on public.organisation_profiles(is_active)
    where is_active;

comment on table public.organisation_profiles is
    'Isaacs & Partners single source of truth for issuer, tax, banking and document defaults. Exactly one active master record is used for new documents.';

commit;
