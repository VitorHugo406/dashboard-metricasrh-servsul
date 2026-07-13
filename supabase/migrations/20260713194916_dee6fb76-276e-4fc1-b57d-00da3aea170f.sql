
-- Allow anonymous writes for single-tenant dashboard (needed on hosts without service role key like Vercel)
GRANT INSERT, UPDATE, DELETE ON public.sheet_config TO anon;
GRANT INSERT, UPDATE, DELETE ON public.reimbursement_cache TO anon;

CREATE POLICY "Anyone can write sheet config" ON public.sheet_config FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update sheet config" ON public.sheet_config FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete sheet config" ON public.sheet_config FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "Anyone can write reimbursement cache" ON public.reimbursement_cache FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update reimbursement cache" ON public.reimbursement_cache FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete reimbursement cache" ON public.reimbursement_cache FOR DELETE TO anon, authenticated USING (true);
