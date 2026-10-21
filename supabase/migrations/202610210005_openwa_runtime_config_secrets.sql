-- Allow the Super Admin integration vault to store OpenWA endpoint/session configuration.
begin;
create or replace function public.admin_secret_store(
  p_name text,
  p_value text,
  p_description text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'vault', 'private'
as $function$
declare v_name text := trim(p_name); v_id uuid;
begin
  if not public.is_super_admin() then raise exception 'Only an active Super Admin may store integration secrets.'; end if;
  if v_name not in (
    'PAYSTACK_SECRET_KEY','OPENAI_API_KEY','ANTHROPIC_API_KEY','OPENWA_API_KEY',
    'OPENWA_WORKER_TOKEN','OPENWA_WEBHOOK_SECRET','OPENWA_BASE_URL','OPENWA_SESSION_ID','GITHUB_TOKEN'
  ) then raise exception 'Secret name is not permitted.'; end if;
  if length(coalesce(p_value, '')) < 4 or length(p_value) > 10000 then raise exception 'Secret value is empty or too long.'; end if;
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
notify pgrst, 'reload schema';
commit;
