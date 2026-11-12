-- ==============================================================================
-- BRAND 360s CRM — Migration 015: Relax Follow-Up Type & Priority Constraints
-- ==============================================================================

-- 1. Drop old restrictive follow_up_type check constraint if present and update to accept all standard types
ALTER TABLE public.follow_ups 
  DROP CONSTRAINT IF EXISTS follow_ups_follow_up_type_check;

ALTER TABLE public.follow_ups
  ADD CONSTRAINT follow_ups_follow_up_type_check
  CHECK (follow_up_type IN (
    'Call', 
    'Phone Call', 
    'Email', 
    'Meeting', 
    'Document Collection', 
    'Document Request', 
    'Payment Reminder', 
    'Service Update', 
    'Renewal Reminder', 
    'Client Consultation', 
    'General', 
    'Other'
  ));

-- 2. Drop old restrictive priority check constraint if present and update to accept Urgent
ALTER TABLE public.follow_ups
  DROP CONSTRAINT IF EXISTS follow_ups_priority_check;

ALTER TABLE public.follow_ups
  ADD CONSTRAINT follow_ups_priority_check
  CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent'));

-- 3. Refresh schema cache
NOTIFY pgrst, 'reload schema';

