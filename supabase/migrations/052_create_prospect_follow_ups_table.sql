-- Migration: 052_create_prospect_follow_ups_table.sql
-- Description: Rename existing client follow-ups table to `client_follow_ups`,
-- and create a clean `follow_ups` table for the main /follow-ups (prospects) page.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'follow_ups'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'client_follow_ups'
  ) THEN
    ALTER TABLE public.follow_ups RENAME TO client_follow_ups;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  phone TEXT,
  service_interested TEXT NOT NULL DEFAULT 'Pvt. Ltd. Registration',
  title TEXT NOT NULL,
  follow_up_type TEXT NOT NULL DEFAULT 'Phone Call',
  priority TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Due Today',
  due_date DATE NOT NULL,
  due_time TEXT,
  last_follow_up TEXT DEFAULT 'Today',
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_name TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_follow_ups_prospect_due_date ON public.follow_ups(due_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_prospect_assigned_to ON public.follow_ups(assigned_to);

DROP POLICY IF EXISTS "Admins full access on follow_ups" ON public.follow_ups;
CREATE POLICY "Admins full access on follow_ups"
ON public.follow_ups FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Employees view assigned or created follow_ups" ON public.follow_ups;
CREATE POLICY "Employees view assigned or created follow_ups"
ON public.follow_ups FOR SELECT TO authenticated
USING (
  assigned_to = auth.uid()
  OR created_by = auth.uid()
);

DROP POLICY IF EXISTS "Employees insert follow_ups" ON public.follow_ups;
CREATE POLICY "Employees insert follow_ups"
ON public.follow_ups FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.is_active = true
  )
  AND (created_by IS NULL OR created_by = auth.uid())
);

DROP POLICY IF EXISTS "Employees update assigned or created follow_ups" ON public.follow_ups;
CREATE POLICY "Employees update assigned or created follow_ups"
ON public.follow_ups FOR UPDATE TO authenticated
USING (assigned_to = auth.uid() OR created_by = auth.uid())
WITH CHECK (assigned_to = auth.uid() OR created_by = auth.uid());

DROP POLICY IF EXISTS "Employees delete assigned or created follow_ups" ON public.follow_ups;
CREATE POLICY "Employees delete assigned or created follow_ups"
ON public.follow_ups FOR DELETE TO authenticated
USING (assigned_to = auth.uid() OR created_by = auth.uid());
