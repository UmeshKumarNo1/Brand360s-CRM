-- ==============================================================================
-- BRAND 360s CRM — Migration 058: Complete Follow-up Management System
-- Adds outcome, actual_completed_at, and chaining columns with RLS & indexes.
-- ==============================================================================

-- 1. Extend client_follow_ups table
ALTER TABLE public.client_follow_ups
  ADD COLUMN IF NOT EXISTS outcome TEXT,
  ADD COLUMN IF NOT EXISTS actual_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS previous_follow_up_id UUID REFERENCES public.client_follow_ups(id) ON DELETE SET NULL;

-- 2. Extend follow_ups table
ALTER TABLE public.follow_ups
  ADD COLUMN IF NOT EXISTS outcome TEXT,
  ADD COLUMN IF NOT EXISTS actual_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS previous_follow_up_id UUID REFERENCES public.follow_ups(id) ON DELETE SET NULL;

-- 3. Indexes for fast query execution, timeline sorting, and status filtering
CREATE INDEX IF NOT EXISTS idx_client_follow_ups_client_id ON public.client_follow_ups(client_id);
CREATE INDEX IF NOT EXISTS idx_client_follow_ups_assigned_to ON public.client_follow_ups(assigned_to);
CREATE INDEX IF NOT EXISTS idx_client_follow_ups_due_date ON public.client_follow_ups(due_date);
CREATE INDEX IF NOT EXISTS idx_client_follow_ups_status ON public.client_follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_client_follow_ups_previous_id ON public.client_follow_ups(previous_follow_up_id);

CREATE INDEX IF NOT EXISTS idx_follow_ups_converted_client ON public.follow_ups(converted_client_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_assigned_to ON public.follow_ups(assigned_to);
CREATE INDEX IF NOT EXISTS idx_follow_ups_due_date ON public.follow_ups(due_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON public.follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_previous_id ON public.follow_ups(previous_follow_up_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.client_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for client_follow_ups
DO $$
BEGIN
  -- Drop existing conflicting policies if any
  DROP POLICY IF EXISTS "Admins can manage all client_follow_ups" ON public.client_follow_ups;
  DROP POLICY IF EXISTS "Salespeople can view assigned client_follow_ups" ON public.client_follow_ups;
  DROP POLICY IF EXISTS "Salespeople can insert client_follow_ups" ON public.client_follow_ups;
  DROP POLICY IF EXISTS "Salespeople can update assigned client_follow_ups" ON public.client_follow_ups;

  -- Admin Policy: Full Access
  CREATE POLICY "Admins can manage all client_follow_ups"
    ON public.client_follow_ups
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
    );

  -- Salesperson Policy: Select
  CREATE POLICY "Salespeople can view assigned client_follow_ups"
    ON public.client_follow_ups
    FOR SELECT
    TO authenticated
    USING (
      assigned_to = auth.uid()
      OR created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.clients
        WHERE clients.id = client_follow_ups.client_id
        AND clients.assigned_salesperson_id = auth.uid()
      )
    );

  -- Salesperson Policy: Insert
  CREATE POLICY "Salespeople can insert client_follow_ups"
    ON public.client_follow_ups
    FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() IS NOT NULL
    );

  -- Salesperson Policy: Update
  CREATE POLICY "Salespeople can update assigned client_follow_ups"
    ON public.client_follow_ups
    FOR UPDATE
    TO authenticated
    USING (
      assigned_to = auth.uid()
      OR created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.clients
        WHERE clients.id = client_follow_ups.client_id
        AND clients.assigned_salesperson_id = auth.uid()
      )
    )
    WITH CHECK (
      auth.uid() IS NOT NULL
    );
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 6. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
