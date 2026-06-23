-- Lock down reimbursement_cache and sheet_config: deny direct API access
-- All app reads now go through server functions using the service role.

DROP POLICY IF EXISTS "Anyone can read reimbursement cache" ON public.reimbursement_cache;
DROP POLICY IF EXISTS "Anyone can read sheet config" ON public.sheet_config;

REVOKE ALL ON public.reimbursement_cache FROM anon, authenticated;
REVOKE ALL ON public.sheet_config FROM anon, authenticated;
GRANT ALL ON public.reimbursement_cache TO service_role;
GRANT ALL ON public.sheet_config TO service_role;

ALTER TABLE public.reimbursement_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sheet_config ENABLE ROW LEVEL SECURITY;

-- Explicit deny policy for clarity (no API role may read; service_role bypasses RLS)
CREATE POLICY "Deny all API access to reimbursement_cache"
  ON public.reimbursement_cache FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "Deny all API access to sheet_config"
  ON public.sheet_config FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- Remove tables from the realtime publication so no Realtime channel
-- broadcasts their changes (eliminates the realtime.messages exposure surface).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reimbursement_cache'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.reimbursement_cache';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sheet_config'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.sheet_config';
  END IF;
END $$;