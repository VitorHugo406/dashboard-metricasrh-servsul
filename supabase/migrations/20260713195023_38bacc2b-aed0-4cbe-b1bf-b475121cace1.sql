
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sheet_config TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reimbursement_cache TO anon, authenticated;
GRANT ALL ON public.sheet_config TO service_role;
GRANT ALL ON public.reimbursement_cache TO service_role;
