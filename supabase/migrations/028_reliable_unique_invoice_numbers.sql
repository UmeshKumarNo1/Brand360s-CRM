-- Migration: 028_reliable_unique_invoice_numbers.sql
-- Description: Implement reliable, atomic, calendar-year sequential invoice number generation.
-- Format: B360-INV-YYYY-NNNN
-- Automatically initializes or synchronizes the sequence to highest existing number for each year.

-- 1. Create a year-based invoice sequences table or use dynamic sequences
-- Using a dedicated counter table with atomic UPDATE ... RETURNING row-level lock:
CREATE TABLE IF NOT EXISTS public.invoice_counters (
  year INTEGER PRIMARY KEY,
  last_value INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Enable RLS on invoice_counters
ALTER TABLE public.invoice_counters ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read and update counters via SECURITY DEFINER functions
CREATE POLICY "Allow authenticated read invoice_counters"
  ON public.invoice_counters FOR SELECT
  TO authenticated
  USING (true);

-- 2. Function to synchronize invoice counter from existing invoices
CREATE OR REPLACE FUNCTION public.sync_invoice_counter(p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_max_val INTEGER := 0;
  v_pattern TEXT;
BEGIN
  v_pattern := 'B360-INV-' || p_year || '-%';

  -- Extract the maximum numeric suffix from existing invoices for this year
  SELECT COALESCE(MAX(
    CASE 
      WHEN invoice_number ~ ('^B360-INV-' || p_year || '-[0-9]+$') 
      THEN SUBSTRING(invoice_number FROM ('^B360-INV-' || p_year || '-([0-9]+)$'))::INTEGER
      ELSE 0
    END
  ), 0)
  INTO v_max_val
  FROM public.invoices
  WHERE invoice_number LIKE v_pattern;

  -- Upsert counter record ensuring last_value is at least v_max_val
  INSERT INTO public.invoice_counters (year, last_value, updated_at)
  VALUES (p_year, v_max_val, TIMEZONE('utc', NOW()))
  ON CONFLICT (year) DO UPDATE
  SET 
    last_value = GREATEST(public.invoice_counters.last_value, EXCLUDED.last_value),
    updated_at = TIMEZONE('utc', NOW());

  RETURN v_max_val;
END;
$$;

-- 3. Synchronize counter for current year immediately
SELECT public.sync_invoice_counter(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);

-- 4. Function to atomically generate the next invoice number
CREATE OR REPLACE FUNCTION public.get_next_invoice_number(p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_next_val INTEGER;
  v_invoice_number TEXT;
  v_exists BOOLEAN;
  v_max_existing INTEGER;
BEGIN
  -- Ensure counter entry exists for the given year
  INSERT INTO public.invoice_counters (year, last_value, updated_at)
  VALUES (p_year, 0, TIMEZONE('utc', NOW()))
  ON CONFLICT (year) DO NOTHING;

  -- Atomically increment and get next value using row-level locking (FOR UPDATE)
  LOOP
    UPDATE public.invoice_counters
    SET 
      last_value = last_value + 1,
      updated_at = TIMEZONE('utc', NOW())
    WHERE year = p_year
    RETURNING last_value INTO v_next_val;

    v_invoice_number := 'B360-INV-' || p_year || '-' || LPAD(v_next_val::TEXT, 4, '0');

    -- Verify that this number doesn't exist already in invoices table
    SELECT EXISTS(
      SELECT 1 FROM public.invoices WHERE invoice_number = v_invoice_number
    ) INTO v_exists;

    -- If no conflict, we have our valid unique number
    IF NOT v_exists THEN
      EXIT;
    END IF;

    -- If a conflict somehow occurs (e.g., manual insertions bypassed counter),
    -- sync counter to highest actual value in table and retry
    SELECT COALESCE(MAX(
      CASE 
        WHEN invoice_number ~ ('^B360-INV-' || p_year || '-[0-9]+$') 
        THEN SUBSTRING(invoice_number FROM ('^B360-INV-' || p_year || '-([0-9]+)$'))::INTEGER
        ELSE 0
      END
    ), v_next_val)
    INTO v_max_existing
    FROM public.invoices
    WHERE invoice_number LIKE ('B360-INV-' || p_year || '-%');

    UPDATE public.invoice_counters
    SET 
      last_value = GREATEST(last_value, v_max_existing),
      updated_at = TIMEZONE('utc', NOW())
    WHERE year = p_year;
  END LOOP;

  RETURN v_invoice_number;
END;
$$;

-- 5. Trigger function to ensure any INSERT with empty or null invoice_number gets generated atomically
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year INTEGER;
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    v_year := EXTRACT(YEAR FROM COALESCE(NEW.issue_date, CURRENT_DATE))::INTEGER;
    NEW.invoice_number := public.get_next_invoice_number(v_year);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Re-attach trigger on invoices table
DROP TRIGGER IF EXISTS trg_generate_invoice_number ON public.invoices;
CREATE TRIGGER trg_generate_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_invoice_number();
