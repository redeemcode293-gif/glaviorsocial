-- Enables the required extensions for network requests and cron jobs
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing job if it exists (for safe re-runs)
SELECT cron.unschedule('auto-sync-providers');

-- We setup a pg_cron job that runs every 6 hours to keep prices perfectly synced.
-- NOTE: Please replace YOUR_PROJECT_REF and YOUR_CRON_SECRET with your actual 
-- Supabase project details. Alternatively, you can easily configure this schedule 
-- directly in the Supabase Dashboard -> Database -> Cron Jobs.
SELECT cron.schedule(
  'auto-sync-providers',
  '0 */6 * * *',
  $$
    SELECT net.http_post(
        url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-provider',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-cron-secret', 'YOUR_CRON_SECRET'
        ),
        body := '{"providerId": "all"}'::jsonb,
        timeout_milliseconds := 60000
    );
  $$
);
