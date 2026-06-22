
-- Sheet config: single global row storing the active spreadsheet + mapping
CREATE TABLE public.sheet_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  source_type text NOT NULL CHECK (source_type IN ('google','excel')),
  spreadsheet_url text NOT NULL,
  spreadsheet_id text NOT NULL,
  spreadsheet_title text,
  sheet_name text NOT NULL,
  mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  excel_drive_id text,
  excel_item_id text,
  last_sync_at timestamptz,
  last_sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sheet_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sheet_config TO authenticated;
GRANT ALL ON public.sheet_config TO service_role;

ALTER TABLE public.sheet_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read the global config (it's not sensitive — just a URL + column names).
CREATE POLICY "Anyone can read sheet config" ON public.sheet_config FOR SELECT TO anon, authenticated USING (true);
-- Only service role writes (server functions use the admin client for writes).
-- (no INSERT/UPDATE/DELETE policies for anon/authenticated → blocked)

-- Cached reimbursements (normalized rows from the spreadsheet)
CREATE TABLE public.reimbursement_cache (
  id text PRIMARY KEY,
  date date NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  department text NOT NULL DEFAULT '—',
  employee text NOT NULL DEFAULT '—',
  client text,
  category text NOT NULL DEFAULT 'Outros',
  status text NOT NULL CHECK (status IN ('pendente','realizado')),
  description text,
  observacao text,
  submitted_at date,
  raw jsonb,
  synced_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reimbursement_cache_date_idx ON public.reimbursement_cache (date DESC);
CREATE INDEX reimbursement_cache_employee_idx ON public.reimbursement_cache (employee);
CREATE INDEX reimbursement_cache_department_idx ON public.reimbursement_cache (department);

GRANT SELECT ON public.reimbursement_cache TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reimbursement_cache TO authenticated;
GRANT ALL ON public.reimbursement_cache TO service_role;

ALTER TABLE public.reimbursement_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reimbursement cache" ON public.reimbursement_cache FOR SELECT TO anon, authenticated USING (true);

-- updated_at trigger for sheet_config
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER sheet_config_updated_at
  BEFORE UPDATE ON public.sheet_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
