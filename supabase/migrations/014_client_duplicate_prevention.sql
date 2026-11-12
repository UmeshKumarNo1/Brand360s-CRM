-- ==============================================================================
-- BRAND 360s CRM — Migration 014: Client Duplicate Prevention & Unique Indexes
-- ==============================================================================

-- 1. Create functional index for fast case-insensitive email searches
CREATE INDEX IF NOT EXISTS idx_clients_lower_email 
ON public.clients (LOWER(TRIM(email)));

-- 2. Create partial unique index on active client emails (Admins can have duplicate emails on archived history if needed)
-- Note: If existing duplicate active emails exist in production, PostgreSQL will reject creating a UNIQUE index until deduplicated.
-- Therefore, this partial index is conditional and safe.
DO $$
BEGIN
  -- Only create unique constraint if no active duplicate emails currently exist in public.clients
  IF NOT EXISTS (
    SELECT LOWER(TRIM(email))
    FROM public.clients
    WHERE client_status != 'Archived'
    GROUP BY LOWER(TRIM(email))
    HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_clients_active_email
    ON public.clients (LOWER(TRIM(email)))
    WHERE client_status != 'Archived';
  END IF;
END $$;

-- 3. Create helper function for normalized company name matching in SQL
CREATE OR REPLACE FUNCTION public.normalize_client_company_name(name TEXT)
RETURNS TEXT AS $$
BEGIN
  IF name IS NULL THEN
    RETURN '';
  END IF;
  -- Lowercase and remove common company suffixes
  RETURN regexp_replace(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          LOWER(TRIM(name)),
          '\y(private limited|pvt\.?\s*ltd\.?|limited|ltd\.?|llp|inc\.?|corp\.?|corporation|co\.?|enterprises|solutions|services|technologies)\y',
          '',
          'g'
        ),
        '[^a-z0-9]',
        '',
        'g'
      ),
      '\s+',
      '',
      'g'
    ),
    '^\s+|\s+$',
    ''
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE INDEX IF NOT EXISTS idx_clients_normalized_company
ON public.clients (public.normalize_client_company_name(company_name));

