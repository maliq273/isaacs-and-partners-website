-- Isaacs & Partners — OpenWA outbound queue scheduler
--
-- The browser only creates QUEUED communication_messages rows.
-- Supabase Cron invokes the trusted OpenWA worker so queued WhatsApp
-- messages are delivered without exposing OpenWA credentials to clients.
--
-- Required Vault secret before production use:
--   openwa_worker_token
--
-- The value must exactly match the OPENWA_WORKER_TOKEN Edge Function secret.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

do $$
begin
    perform cron.unschedule('openwa-communication-worker');
exception
    when others then
        null;
end;
$$;

select cron.schedule(
    'openwa-communication-worker',
    '15 seconds',
    $$
        select net.http_post(
            url := 'https://aglobzjtstbfwcsdhvmp.supabase.co/functions/v1/openwa-communication-worker',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'X-OpenWA-Worker-Token',
                (select decrypted_secret from vault.decrypted_secrets where name = 'openwa_worker_token')
            ),
            body := jsonb_build_object('source', 'supabase-cron', 'time', now()),
            timeout_milliseconds := 10000
        ) as request_id;
    $$
);
