-- Daily scheduler; function itself only creates an invoice when a recurring entitlement is due.
select cron.schedule('isaacs-monthly-service-invoices','5 0 * * *',$$select public.generate_monthly_client_service_invoices();$$)
where not exists(select 1 from cron.job where jobname='isaacs-monthly-service-invoices');
