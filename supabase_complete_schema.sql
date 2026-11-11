-- ==============================================================================
-- BRAND 360s CRM — Full Normalized Database Schema & Row Level Security
-- ==============================================================================

-- 1. PROFILES TABLE (Must run supabase_auth_profiles.sql first if not yet done)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'employee')) DEFAULT 'employee',
  is_active BOOLEAN NOT NULL DEFAULT true,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Admin verification helper
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. CLIENTS TABLE
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no SERIAL,
  company_name TEXT NOT NULL,
  company_type TEXT DEFAULT 'Pvt Ltd',
  business_category TEXT,
  registration_type TEXT,
  cin TEXT,
  pan TEXT,
  gstin TEXT,
  registered_address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  website TEXT,
  company_description TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  contract_value NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
  payments_received NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
  balance_receivable NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
  next_payment_due_amount NUMERIC(12, 2) DEFAULT 0.00,
  next_payment_due_date DATE,
  payment_status TEXT NOT NULL DEFAULT 'Upcoming' CHECK (payment_status IN ('Paid in full', 'Overdue', 'Upcoming', 'Partially Paid')),
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Archived', 'Pending Onboarding')),
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
  client_source TEXT,
  lead_source TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clients_owner ON public.clients(owner_id);
CREATE INDEX IF NOT EXISTS idx_clients_company_name ON public.clients(company_name);
CREATE INDEX IF NOT EXISTS idx_clients_payment_status ON public.clients(payment_status);

-- 3. CLIENT CONTACTS TABLE
CREATE TABLE IF NOT EXISTS public.client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_person TEXT NOT NULL,
  designation TEXT,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT true,
  billing_contact TEXT,
  billing_email TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_contacts_client ON public.client_contacts(client_id);

-- 4. SERVICES CATALOG TABLE
CREATE TABLE IF NOT EXISTS public.services_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT,
  default_service_fee NUMERIC(12, 2) DEFAULT 0.00,
  default_govt_fee NUMERIC(12, 2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Seed basic services catalogue
INSERT INTO public.services_catalog (name, category, default_service_fee, default_govt_fee)
VALUES 
  ('Pvt Ltd Registration', 'Company Registration', 10000.00, 5000.00),
  ('LLP Registration', 'Company Registration', 8000.00, 3000.00),
  ('GST Registration', 'Taxation & Compliances', 4000.00, 0.00),
  ('Trademark Filing', 'Intellectual Property', 7500.00, 4500.00),
  ('Annual Compliance', 'Annual Filings', 15000.00, 2000.00),
  ('Website Development', 'Digital & Tech', 45000.00, 0.00),
  ('SEO Retainer', 'Digital & Tech', 25000.00, 0.00),
  ('HR & Payroll', 'Business Operations', 20000.00, 0.00)
ON CONFLICT (name) DO NOTHING;

-- 5. CLIENT SERVICES TABLE
CREATE TABLE IF NOT EXISTS public.client_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  service_status TEXT NOT NULL DEFAULT 'Processing' CHECK (service_status IN ('New', 'Documents Pending', 'Processing', 'Waiting for Approval', 'Completed', 'On Hold', 'Cancelled')),
  assigned_employee_id UUID REFERENCES public.profiles(id),
  service_fee NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
  govt_fee NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
  additional_fee NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
  discount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
  tax_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
  total_amount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
  start_date DATE,
  expected_completion_date DATE,
  actual_completion_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_client_services_client ON public.client_services(client_id);
CREATE INDEX IF NOT EXISTS idx_client_services_assigned ON public.client_services(assigned_employee_id);

-- 6. INVOICES & INVOICE ITEMS
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  balance_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Issued', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled')),
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

-- 7. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  invoice_id UUID REFERENCES public.invoices(id),
  amount NUMERIC(12, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL,
  transaction_ref TEXT,
  proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'Pending Verification' CHECK (status IN ('Pending Verification', 'Verified', 'Rejected', 'Refunded')),
  verified_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_client ON public.payments(client_id);

-- 8. FOLLOW-UPS TABLE
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  follow_up_type TEXT DEFAULT 'General',
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Cancelled')),
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_assigned ON public.follow_ups(assigned_to);
CREATE INDEX IF NOT EXISTS idx_follow_ups_due_date ON public.follow_ups(due_date);

-- 9. VENDORS & SERVICE VENDORS
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.service_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_service_id UUID NOT NULL REFERENCES public.client_services(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  payment_status TEXT NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Partially Paid')),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 10. SALES INCENTIVES TABLE
CREATE TABLE IF NOT EXISTS public.sales_incentives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  client_service_id UUID REFERENCES public.client_services(id),
  incentive_type TEXT NOT NULL DEFAULT 'Percentage' CHECK (incentive_type IN ('Percentage', 'Fixed')),
  rate NUMERIC(5, 2) DEFAULT 0.00,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  approval_status TEXT NOT NULL DEFAULT 'Pending' CHECK (approval_status IN ('Pending', 'Approved', 'Rejected')),
  payment_status TEXT NOT NULL DEFAULT 'Unpaid' CHECK (payment_status IN ('Unpaid', 'Paid')),
  payment_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 11. DOCUMENTS TABLE (Stored in Cloudinary)
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  cloudinary_public_id TEXT,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 12. ACTIVITY LOGS AUDIT TRAIL
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_incentives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- CLIENTS RLS
DROP POLICY IF EXISTS "Admins have full access to clients" ON public.clients;
CREATE POLICY "Admins have full access to clients"
ON public.clients FOR ALL TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Employees can view own clients" ON public.clients;
CREATE POLICY "Employees can view own clients"
ON public.clients FOR SELECT TO authenticated
USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Employees can create clients" ON public.clients;
CREATE POLICY "Employees can create clients"
ON public.clients FOR INSERT TO authenticated
WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Employees can update own clients" ON public.clients;
CREATE POLICY "Employees can update own clients"
ON public.clients FOR UPDATE TO authenticated
USING (owner_id = auth.uid());

-- CLIENT CONTACTS RLS
DROP POLICY IF EXISTS "Admins full on contacts" ON public.client_contacts;
CREATE POLICY "Admins full on contacts" ON public.client_contacts FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Employees manage own client contacts" ON public.client_contacts;
CREATE POLICY "Employees manage own client contacts" ON public.client_contacts FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.clients WHERE clients.id = client_contacts.client_id AND clients.owner_id = auth.uid()));

-- CLIENT SERVICES RLS
DROP POLICY IF EXISTS "Admins full on client services" ON public.client_services;
CREATE POLICY "Admins full on client services" ON public.client_services FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Employees view and edit assigned services" ON public.client_services;
CREATE POLICY "Employees view and edit assigned services" ON public.client_services FOR ALL TO authenticated
USING (
  assigned_employee_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.clients WHERE clients.id = client_services.client_id AND clients.owner_id = auth.uid())
);

-- FOLLOW-UPS RLS
DROP POLICY IF EXISTS "Admins full on follow-ups" ON public.follow_ups;
CREATE POLICY "Admins full on follow-ups" ON public.follow_ups FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Employees access own follow-ups" ON public.follow_ups;
CREATE POLICY "Employees access own follow-ups" ON public.follow_ups FOR ALL TO authenticated
USING (assigned_to = auth.uid());

-- SALES INCENTIVES RLS
DROP POLICY IF EXISTS "Admins full on incentives" ON public.sales_incentives;
CREATE POLICY "Admins full on incentives" ON public.sales_incentives FOR ALL TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Employees view own incentives" ON public.sales_incentives;
CREATE POLICY "Employees view own incentives" ON public.sales_incentives FOR SELECT TO authenticated
USING (employee_id = auth.uid());

