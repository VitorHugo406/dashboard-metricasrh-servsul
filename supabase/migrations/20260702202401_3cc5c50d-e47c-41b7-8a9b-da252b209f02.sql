CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any previous version of this job before re-scheduling
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-reimb-every-5min') THEN
    PERFORM cron.unschedule('sync-reimb-every-5min');
  END IF;
END$$;

SELECT cron.schedule(
  'sync-reimb-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://dashboard-metricasrh-servsul.lovable.app/api/public/sync-reimb',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5ZHdxaWt3d2lsemdmdm93bnB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwODEyNzUsImV4cCI6MjA5NzY1NzI3NX0.OTNbJGd5_OqS2qIHmOCpJfxA7E5qMWueiOGzgKM0Zrg"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);