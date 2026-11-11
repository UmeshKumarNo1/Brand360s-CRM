-- ==============================================================================
-- BRAND 360s CRM - Supabase PostgreSQL Schema & Row Level Security (RLS)
-- ==============================================================================

-- 1. Profiles (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'employee')) DEFAULT 'employee',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 2. Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no SERIAL,
  company_name TEXT NOT NULL,
  company_type TEXT DEFAULT 'Pvt Ltd',
  business_category TEXT,
  cin TEXT,
  pan TEXT,
  gstin TEXT,
  registered_address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  website TEXT,
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  contract_value NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
  payments_received NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
  balance_receivable NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
  next_payment_due_amount NUMERIC(12, 2) DEFAULT 0.00,
  next_payment_due_date DATE,
  payment_status TEXT NOT NULL DEFAULT 'Upcoming' CHECK (payment_status IN ('Paid in full', 'Overdue', 'Upcoming', 'Partially Paid')),
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Archived', 'Pending Onboarding')),
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 3. Client Contacts
CREATE TABLE IF NOT EXISTS public.client_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_person TEXT NOT NULL,
  designation TEXT,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  email TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 4. Client Services
CREATE TABLE IF NOT EXISTS public.client_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  service_status TEXT NOT NULL DEFAULT 'Processing' CHECK (service_status IN ('New', 'Documents Pending', 'Processing', 'Waiting for Approval', 'Completed', 'On Hold', 'Cancelled')),
  assigned_employee_id UUID REFERENCES public.profiles(id),
  service_fee NUMERIC(12, 2) DEFAULT 0.00,
  govt_fee NUMERIC(12, 2) DEFAULT 0.00,
  start_date DATE,
  expected_completion_date DATE,
  actual_completion_date DATE,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 5. Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL,
  transaction_ref TEXT,
  proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'Pending Verification' CHECK (status IN ('Pending Verification', 'Verified', 'Rejected', 'Refunded')),
  verified_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 6. Follow-ups
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES public.profiles(id),
  title TEXT NOT NULL,
  notes TEXT,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Cancelled')),
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Users can view all profiles; only admins can edit roles
CREATE POLICY "Public profiles are viewable by authenticated users"
ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins have full access to profiles"
ON public.profiles FOR ALL TO authenticated USING (public.is_admin());

-- Clients Policies:
-- Admin can view and edit all clients
CREATE POLICY "Admins have full access to clients"
ON public.clients FOR ALL TO authenticated USING (public.is_admin());

-- Employees can view only their own assigned clients
CREATE POLICY "Employees can view own clients"
ON public.clients FOR SELECT TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "Employees can insert own clients"
ON public.clients FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Employees can update own clients"
ON public.clients FOR UPDATE TO authenticated USING (owner_id = auth.uid());

