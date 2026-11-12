-- ==============================================================================
-- BRAND 360s CRM — Migration 015: Client Module Audit & Optimizations
-- ==============================================================================
-- 1. Allow email to be NULL in public.clients (prevents generating fake email placeholders)
-- 2. Update partial unique email index to ignore NULLs and empty strings
-- 3. Extend client_status check constraint to support 'Completed' and 'Inactive'
-- 4. Extend client_services.service_status check constraint to support 'Pending' and 'In Progress'
-- 5. Add search index on client trade_name and contact fields
-- 6. Add secure duplicate conflict checking function
-- ==============================================================================

-- 1. Make email column nullable so valid clients without email can be registered without fake email hacks
DO $$
BEGIN
  ALTER TABLE public.clients ALTER COLUMN email DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 2. Update partial unique index on active client emails to only enforce uniqueness when email is present
DROP INDEX IF EXISTS public.uq_clients_active_email;
CREATE UNIQUE INDEX IF NOT EXISTS uq_clients_active_email
ON public.clients (LOWER(TRIM(email)))
WHERE client_status != 'Archived' AND email IS NOT NULL AND TRIM(email) != '';

-- 3. Update client_status check constraint to include 'Completed' and 'Inactive'
DO $$
BEGIN
  ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_client_status_check;
  ALTER TABLE public.clients ADD CONSTRAINT clients_client_status_check 
    CHECK (client_status IN ('Active', 'Inactive', 'Pending Onboarding', 'On Hold', 'Completed', 'Archived'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 4. Update client_services service_status check constraint to support 'Pending' and 'In Progress'
DO $$
BEGIN
  ALTER TABLE public.client_services DROP CONSTRAINT IF EXISTS client_services_service_status_check;
  ALTER TABLE public.client_services ADD CONSTRAINT client_services_service_status_check 
    CHECK (service_status IN ('Pending', 'In Progress', 'New', 'Documents Pending', 'Processing', 'Waiting for Approval', 'Completed', 'On Hold', 'Cancelled'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 5. Additional performance indexes for multi-field search
CREATE INDEX IF NOT EXISTS idx_clients_trade_name ON public.clients (trade_name);
CREATE INDEX IF NOT EXISTS idx_clients_contact_person ON public.clients (contact_person);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients (phone);

-- 6. Secure function for cross-user duplicate detection
-- Returns matching records with match reason and assigned salesperson name, without leaking sensitive client fields
CREATE OR REPLACE FUNCTION public.check_client_duplicate_conflicts(
  p_company_name TEXT,
  p_trade_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  client_code TEXT,
  company_name TEXT,
  trade_name TEXT,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  client_status TEXT,
  assigned_salesperson_id UUID,
  assigned_salesperson_name TEXT,
  contract_value NUMERIC,
  match_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_norm_target_company TEXT;
  v_norm_target_email TEXT;
  v_norm_target_phone TEXT;
BEGIN
  v_norm_target_company := public.normalize_client_company_name(p_company_name);
  v_norm_target_email := LOWER(TRIM(COALESCE(p_email, '')));
  v_norm_target_phone := RIGHT(regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g'), 10);

  RETURN QUERY
  SELECT 
    c.id,
    c.client_code,
    c.company_name,
    c.trade_name,
    c.contact_person,
    c.email,
    c.phone,
    c.client_status,
    c.assigned_salesperson,
    p.full_name AS assigned_salesperson_name,
    c.contract_value,
    CASE 
      WHEN v_norm_target_email != '' AND LOWER(TRIM(c.email)) = v_norm_target_email THEN 'email'
      WHEN v_norm_target_phone != '' AND RIGHT(regexp_replace(COALESCE(c.phone, ''), '\D', '', 'g'), 10) = v_norm_target_phone THEN 'phone'
      WHEN v_norm_target_company != '' AND public.normalize_client_company_name(c.company_name) = v_norm_target_company THEN 'company_name'
      ELSE 'other'
    END AS match_reason
  FROM public.clients c
  LEFT JOIN public.profiles p ON p.id = c.assigned_salesperson
  WHERE (p_exclude_id IS NULL OR c.id != p_exclude_id)
    AND (
      (v_norm_target_email != '' AND LOWER(TRIM(c.email)) = v_norm_target_email) OR
      (v_norm_target_phone != '' AND RIGHT(regexp_replace(COALESCE(c.phone, ''), '\D', '', 'g'), 10) = v_norm_target_phone) OR
      (v_norm_target_company != '' AND public.normalize_client_company_name(c.company_name) = v_norm_target_company)
    );
END;
$$;
