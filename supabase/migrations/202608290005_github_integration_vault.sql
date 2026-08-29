-- PR26: Super Admin-managed GitHub integration.
-- The GitHub token is stored in Supabase Vault, never in source control or browser storage.

create extension if not exists supabase_vault with schema vault;

create table if not exists public.github_integration_config (
    id text primary key default 'default',
    repository text not null default 'maliq273/isaacs-and-partners-website',
    secret_name text not null default 'isaacs_github_token',
    configured_at timestamptz,
    configured_by uuid references public.profiles(id) on delete set null,
    last_tested_at timestamptz,
    last_test_status text check (last_test_status in ('PASS','FAIL')),
    last_test_message text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

insert into public.github_integration_config (id)
values ('default')
on conflict (id) do nothing;

alter table public.github_integration_config enable row level security;
revoke all on public.github_integration_config from anon, authenticated;
grant all on public.github_integration_config to service_role;

create or replace function public.set_github_integration_config(
    p_actor uuid,
    p_token text,
    p_repository text default 'maliq273/isaacs-and-partners-website'
)
returns jsonb
language plpgsql
security definer
set search_path = public, vault
as $$
declare
    v_secret_id uuid;
    v_repository text := trim(coalesce(p_repository, ''));
    v_token text := trim(coalesce(p_token, ''));
begin
    if not exists (
        select 1 from public.profiles
        where id = p_actor and upper(role::text) = 'SUPER_ADMIN' and coalesce(is_active, true) = true
    ) then
        raise exception 'SUPER_ADMIN access is required.' using errcode = '42501';
    end if;

    if length(v_token) < 20 then
        raise exception 'A valid GitHub token is required.' using errcode = '22023';
    end if;

    if v_repository !~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$' then
        raise exception 'Repository must use owner/name format.' using errcode = '22023';
    end if;

    select id into v_secret_id
    from vault.secrets
    where name = 'isaacs_github_token'
    order by created_at desc
    limit 1;

    if v_secret_id is null then
        v_secret_id := vault.create_secret(
            v_token,
            'isaacs_github_token',
            'Isaacs & Partners Super Admin GitHub repository write token'
        );
    else
        perform vault.update_secret(
            v_secret_id,
            v_token,
            'isaacs_github_token',
            'Isaacs & Partners Super Admin GitHub repository write token'
        );
    end if;

    insert into public.github_integration_config (
        id, repository, secret_name, configured_at, configured_by, last_tested_at, last_test_status, last_test_message, updated_at
    ) values (
        'default', v_repository, 'isaacs_github_token', now(), p_actor, null, null, null, now()
    )
    on conflict (id) do update set
        repository = excluded.repository,
        secret_name = excluded.secret_name,
        configured_at = excluded.configured_at,
        configured_by = excluded.configured_by,
        last_tested_at = null,
        last_test_status = null,
        last_test_message = null,
        updated_at = now();

    return jsonb_build_object('configured', true, 'repository', v_repository);
end;
$$;

create or replace function public.get_github_integration_secret()
returns table (repository text, github_token text)
language sql
security definer
set search_path = public, vault
as $$
    select c.repository, v.decrypted_secret
    from public.github_integration_config c
    join vault.decrypted_secrets v on v.name = c.secret_name
    where c.id = 'default'
    order by v.updated_at desc
    limit 1;
$$;

create or replace function public.record_github_integration_test(
    p_status text,
    p_message text
)
returns void
language sql
security definer
set search_path = public
as $$
    update public.github_integration_config
    set last_tested_at = now(),
        last_test_status = case when upper(p_status) = 'PASS' then 'PASS' else 'FAIL' end,
        last_test_message = left(coalesce(p_message, ''), 500),
        updated_at = now()
    where id = 'default';
$$;

revoke all on function public.set_github_integration_config(uuid, text, text) from public, anon, authenticated;
revoke all on function public.get_github_integration_secret() from public, anon, authenticated;
revoke all on function public.record_github_integration_test(text, text) from public, anon, authenticated;
grant execute on function public.set_github_integration_config(uuid, text, text) to service_role;
grant execute on function public.get_github_integration_secret() to service_role;
grant execute on function public.record_github_integration_test(text, text) to service_role;

comment on table public.github_integration_config is 'Non-secret GitHub integration metadata. The token itself is stored in Supabase Vault.';
