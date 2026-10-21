-- Allow OpenWA to use Super Admin-managed Vault settings with legacy case-insensitive lookup.
-- Also provide one service-role-only RPC to retrieve runtime settings in a single call.
begin;

create or replace function private.integration_secret_get(p_name text)
returns text language sql security definer set search_path to 'vault','private'
as $function$
  select decrypted_secret
  from vault.decrypted_secrets
  where lower(name)=lower(trim(p_name))
  order by case when name=trim(p_name) then 0 else 1 end
  limit 1
$function$;

create or replace function public.admin_secret_store(
 p_name text,p_value text,p_description text default null
)
returns jsonb language plpgsql security definer set search_path to 'public','vault','private'
as $function$
declare v_name text:=trim(p_name); v_id uuid;
begin
 if not public.is_super_admin() then raise exception 'Only an active Super Admin may store integration secrets.'; end if;
 if v_name not in (
  'PAYSTACK_SECRET_KEY','OPENAI_API_KEY','ANTHROPIC_API_KEY','OPENWA_API_KEY',
  'OPENWA_BASE_URL','OPENWA_SESSION_ID','OPENWA_WEBHOOK_SECRET','OPENWA_WORKER_TOKEN',
  'GITHUB_TOKEN'
 ) then raise exception 'Secret name is not permitted.'; end if;
 if length(coalesce(p_value,''))<4 or length(p_value)>10000 then raise exception 'Secret value is empty or too long.'; end if;
 select id into v_id from vault.decrypted_secrets where lower(name)=lower(v_name)
 order by case when name=v_name then 0 else 1 end limit 1;
 if v_id is null then
  perform vault.create_secret(p_value,v_name,coalesce(p_description,'Managed by Super Admin Control Centre'),null);
 else
  perform vault.update_secret(v_id,p_value,v_name,coalesce(p_description,'Managed by Super Admin Control Centre'),null);
 end if;
 return jsonb_build_object('ok',true,'name',v_name,'storage','SUPABASE_VAULT');
end
$function$;

create or replace function public.integration_secrets_get(p_names text[])
returns jsonb language plpgsql security definer set search_path=public,private,vault
as $function$
declare result jsonb;
begin
 if coalesce(current_setting('request.jwt.claim.role',true),'')<>'service_role' then raise exception 'Service role required.'; end if;
 select coalesce(jsonb_object_agg(n,s.secret),'{}'::jsonb) into result
 from unnest(coalesce(p_names,array[]::text[])) as n
 cross join lateral (select private.integration_secret_get(n) as secret) s
 where s.secret is not null and s.secret<>'';
 return result;
end
$function$;

revoke all on function public.integration_secrets_get(text[]) from public,anon,authenticated;
grant execute on function public.integration_secrets_get(text[]) to service_role;
notify pgrst,'reload schema';
commit;
