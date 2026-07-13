
DROP POLICY IF EXISTS "Anyone can read sheet config" ON public.sheet_config;
DROP POLICY IF EXISTS "Anyone can read reimbursement cache" ON public.reimbursement_cache;
CREATE POLICY "Anyone can read sheet config" ON public.sheet_config FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can read reimbursement cache" ON public.reimbursement_cache FOR SELECT TO anon, authenticated USING (true);
