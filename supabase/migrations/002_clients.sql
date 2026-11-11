-- ==============================================================================
-- BRAND 360s CRM — Migration 002: Clients Database & Row Level Security
-- ==============================================================================

-- 1. Create client_code auto-generator sequence
CREATE SEQUENCE IF NOT EXISTS public.client_code_seq START WITH 1001;

CREATE OR REPLACE FUNCTION public.generate_client_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_code IS NULL OR NEW.client_code = '' THEN
    NEW.client_code := 'B360-' || nextval('public.client_code_seq')::TEXT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_code TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  company_type TEXT DEFAULT 'Private Limited (Pvt Ltd)',
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  alternate_phone TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  country TEXT DEFAULT 'India',
  gst_number TEXT,
  pan_number TEXT,
  assigned_salesperson UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_status TEXT NOT NULL DEFAULT 'Active' CHECK (client_status IN ('Active', 'Pending Onboarding', 'On Hold', 'Archived')),
  services_purchased TEXT DEFAULT 'Company Registration',
  contract_value NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  payments_received NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  balance_receivable NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  next_payment_due_amount NUMERIC(12, 2) DEFAULT 0.00,
  next_payment_due_date DATE,
  payment_status TEXT NOT NULL DEFAULT 'Upcoming' CHECK (payment_status IN ('Paid in full', 'Overdue', 'Upcoming', 'Partially Paid')),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Trigger to auto-generate client_code on insert
DROP TRIGGER IF EXISTS trg_generate_client_code ON public.clients;
CREATE TRIGGER trg_generate_client_code
  BEFORE INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_client_code();

-- 3. Indexes for fast lookup, filtering, and sorting
CREATE INDEX IF NOT EXISTS idx_clients_salesperson ON public.clients(assigned_salesperson);
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON public.clients(created_by);
CREATE INDEX IF NOT EXISTS idx_clients_company_name ON public.clients(company_name);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(client_status);
CREATE INDEX IF NOT EXISTS idx_clients_payment_status ON public.clients(payment_status);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients(created_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Helper to verify admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policy: Admins have full access to all client records
DROP POLICY IF EXISTS "Admins have full access to clients" ON public.clients;
CREATE POLICY "Admins have full access to clients"
ON public.clients FOR ALL TO authenticated
USING (public.is_admin());

-- RLS Policy: Employees can view only their own assigned clients or clients they created
DROP POLICY IF EXISTS "Employees can view own assigned clients" ON public.clients;
CREATE POLICY "Employees can view own assigned clients"
ON public.clients FOR SELECT TO authenticated
USING (
  assigned_salesperson = auth.uid() OR created_by = auth.uid()
);

-- RLS Policy: Employees can create new clients
DROP POLICY IF EXISTS "Employees can insert new clients" ON public.clients;
CREATE POLICY "Employees can insert new clients"
ON public.clients FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() AND (assigned_salesperson = auth.uid() OR assigned_salesperson IS NULL)
);

-- RLS Policy: Employees can update permitted fields of their own assigned clients (cannot reassign salesperson)
DROP POLICY IF EXISTS "Employees can update own assigned clients" ON public.clients;
CREATE POLICY "Employees can update own assigned clients"
ON public.clients FOR UPDATE TO authenticated
USING (
  assigned_salesperson = auth.uid() OR created_by = auth.uid()
)
WITH CHECK (
  (assigned_salesperson = auth.uid() OR created_by = auth.uid())
  AND assigned_salesperson = (SELECT assigned_salesperson FROM public.clients WHERE id = clients.id)
);

