
ALTER TABLE public.sheet_config REPLICA IDENTITY FULL;
ALTER TABLE public.reimbursement_cache REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sheet_config;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reimbursement_cache;
