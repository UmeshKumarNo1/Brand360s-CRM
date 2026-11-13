-- ==============================================================================
-- MIGRATION 020: Fix Payment Schedules Status Check Constraint
-- ==============================================================================
-- Problem:
-- When creating an installment via createInstallmentAction, the application computes:
--   dueDate < today ? "Overdue" : dueDate === today ? "Due" : "Upcoming"
-- Additionally, installment statuses used across the application include:
--   - 'Pending' (initial/default legacy status)
--   - 'Upcoming' (future due date)
--   - 'Due' (due today)
--   - 'Partially Paid' (partial allocation)
--   - 'Paid in full' (settled in full)
--   - 'Paid' (alias for paid in full)
--   - 'Overdue' (past due date with outstanding balance)
--   - 'Cancelled' (cancelled by admin)
--
-- In migration 004_payments.sql, the constraint was defined inline as:
--   status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Partially Paid', 'Paid in full', 'Overdue', 'Cancelled'))
--
-- Postgres named this constraint "payment_schedules_status_check".
-- Because 'Upcoming', 'Due', and 'Paid' were missing from the permitted list,
-- inserting a schedule with status 'Upcoming' or 'Due' resulted in:
--   ERROR: new row for relation "payment_schedules" violates check constraint "payment_schedules_status_check"
--
-- Solution:
-- 1. Safely normalize any legacy / whitespace-divergent statuses in payment_schedules
-- 2. Drop the existing constraint payment_schedules_status_check
-- 3. Add the comprehensive CHECK constraint supporting all valid application statuses
-- 4. Update the column DEFAULT to 'Upcoming'
-- 5. Ensure recalculate_installment_status() handles all statuses consistently
-- ==============================================================================

DO $$
BEGIN
  -- Normalize any historical data before updating the constraint
  UPDATE public.payment_schedules
  SET status = 'Upcoming'
  WHERE status = 'Pending';

  UPDATE public.payment_schedules
  SET status = 'Paid in full'
  WHERE status = 'Paid';
END $$;

-- Drop existing check constraint if present
ALTER TABLE public.payment_schedules
  DROP CONSTRAINT IF EXISTS payment_schedules_status_check;

-- Add updated check constraint with complete set of legitimate statuses
ALTER TABLE public.payment_schedules
  ADD CONSTRAINT payment_schedules_status_check
  CHECK (status IN (
    'Upcoming',
    'Due',
    'Pending',
    'Partially Paid',
    'Paid in full',
    'Paid',
    'Overdue',
    'Cancelled'
  ));

-- Update column default to 'Upcoming'
ALTER TABLE public.payment_schedules
  ALTER COLUMN status SET DEFAULT 'Upcoming';

-- Ensure recalculate_installment_status function is fully aligned
CREATE OR REPLACE FUNCTION public.recalculate_installment_status(p_installment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inst RECORD;
  v_total_paid NUMERIC(12, 2);
  v_today DATE := CURRENT_DATE;
  v_new_status TEXT;
  v_paid_date DATE;
BEGIN
  SELECT * INTO v_inst FROM public.payment_schedules WHERE id = p_installment_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_inst.status = 'Cancelled' THEN
    RETURN;
  END IF;

  -- Sum from allocations
  SELECT COALESCE(SUM(allocated_amount), 0)
  INTO v_total_paid
  FROM public.installment_payment_allocations
  WHERE installment_id = p_installment_id;

  IF v_total_paid >= v_inst.amount THEN
    v_new_status := 'Paid in full';
    SELECT payment_date INTO v_paid_date
    FROM public.installment_payment_allocations ipa
    JOIN public.payments p ON p.id = ipa.payment_id
    WHERE ipa.installment_id = p_installment_id
    ORDER BY p.payment_date DESC
    LIMIT 1;
    IF v_paid_date IS NULL THEN
      v_paid_date := v_today;
    END IF;
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'Partially Paid';
    v_paid_date := NULL;
  ELSIF v_inst.due_date < v_today THEN
    v_new_status := 'Overdue';
    v_paid_date := NULL;
  ELSIF v_inst.due_date = v_today THEN
    v_new_status := 'Due';
    v_paid_date := NULL;
  ELSE
    v_new_status := 'Upcoming';
    v_paid_date := NULL;
  END IF;

  UPDATE public.payment_schedules
  SET 
    amount_paid = v_total_paid,
    status = v_new_status,
    paid_date = v_paid_date,
    updated_at = NOW()
  WHERE id = p_installment_id;
END;
$$;

