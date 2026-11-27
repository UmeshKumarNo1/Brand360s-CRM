-- ==============================================================================
-- BRAND 360s CRM — Migration 048: Follow-up Completion, Outcome & Chaining
-- ==============================================================================

-- 1. Extend public.follow_ups with outcome and chaining fields
ALTER TABLE public.follow_ups
  ADD COLUMN IF NOT EXISTS outcome TEXT,
  ADD COLUMN IF NOT EXISTS actual_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS previous_follow_up_id UUID REFERENCES public.follow_ups(id) ON DELETE SET NULL;

-- 2. Create index for follow-up chaining and outcome querying
CREATE INDEX IF NOT EXISTS idx_follow_ups_previous_id ON public.follow_ups(previous_follow_up_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_outcome ON public.follow_ups(outcome);

-- 3. Notify schema reload
NOTIFY pgrst, 'reload schema';
