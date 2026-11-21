-- 039_contract_overbilling_and_amendments.sql
-- Supports contract amendments and overbilling audit trail

CREATE TABLE IF NOT EXISTS public.contract_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  previous_contract_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  additional_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  revised_contract_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by_name TEXT,
  approval_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- RLS policies for contract_amendments
ALTER TABLE public.contract_amendments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read contract amendments"
  ON public.contract_amendments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert contract amendments"
  ON public.contract_amendments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contract_amendments_client_id ON public.contract_amendments(client_id);

