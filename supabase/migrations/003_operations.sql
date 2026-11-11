-- ==============================================================================
-- BRAND 360s CRM — Migration 003: Operations (Services, Follow-ups, Vendors, Docs)
-- ==============================================================================

-- 1. Services Catalog Table
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

-- Seed Services Catalog
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

-- 2. Client Services Table
CREATE TABLE IF NOT EXISTS public.client_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  service_category TEXT,
  service_status TEXT NOT NULL DEFAULT 'Processing' CHECK (service_status IN ('New', 'Documents Pending', 'Processing', 'Waiting for Approval', 'Completed', 'On Hold', 'Cancelled')),
  assigned_employee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  service_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  govt_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  additional_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  start_date DATE,
  expected_completion_date DATE,
  actual_completion_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_client_services_client ON public.client_services(client_id);
CREATE INDEX IF NOT EXISTS idx_client_services_assigned ON public.client_services(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_client_services_status ON public.client_services(service_status);

-- 3. Follow-ups Table
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  follow_up_type TEXT DEFAULT 'General' CHECK (follow_up_type IN ('Call', 'Email', 'Meeting', 'Document Collection', 'Payment Reminder', 'General')),
  due_date DATE NOT NULL,
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_follow_ups_assigned ON public.follow_ups(assigned_to);
CREATE INDEX IF NOT EXISTS idx_follow_ups_client ON public.follow_ups(client_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_due_date ON public.follow_ups(due_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON public.follow_ups(status);

-- 4. Vendors Table
CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  services_provided TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Service Vendors link table
CREATE TABLE IF NOT EXISTS public.service_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_service_id UUID NOT NULL REFERENCES public.client_services(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  agreed_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  payment_status TEXT NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Partially Paid')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- 5. Documents Table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  client_service_id UUID REFERENCES public.client_services(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('Company Document', 'Registration', 'PAN/GST', 'Payment Proof', 'Agreement', 'Invoice', 'Other')),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  cloudinary_public_id TEXT,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_client ON public.documents(client_id);

-- ==============================================================================
-- Row Level Security (RLS)
-- ==============================================================================

ALTER TABLE public.services_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Services Catalog: Readable by all authenticated users; Admins can modify
CREATE POLICY "Services catalog readable by authenticated"
ON public.services_catalog FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins full management on services catalog"
ON public.services_catalog FOR ALL TO authenticated USING (public.is_admin());

-- Client Services RLS
CREATE POLICY "Admins full access to client services"
ON public.client_services FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Employees access assigned client services"
ON public.client_services FOR ALL TO authenticated
USING (
  assigned_employee_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.clients WHERE clients.id = client_services.client_id AND (clients.assigned_salesperson = auth.uid() OR clients.created_by = auth.uid()))
);

-- Follow-ups RLS
CREATE POLICY "Admins full access to follow-ups"
ON public.follow_ups FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Employees access assigned follow-ups"
ON public.follow_ups FOR ALL TO authenticated
USING (assigned_to = auth.uid());

-- Vendors RLS: Accessible by Admins; viewable by employees
CREATE POLICY "Vendors viewable by authenticated users"
ON public.vendors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins full access on vendors"
ON public.vendors FOR ALL TO authenticated USING (public.is_admin());

-- Service Vendors RLS
CREATE POLICY "Admins full access on service_vendors"
ON public.service_vendors FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Employees view relevant service vendors"
ON public.service_vendors FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_services 
    WHERE client_services.id = service_vendors.client_service_id 
    AND (client_services.assigned_employee_id = auth.uid() OR public.is_admin())
  )
);

-- Documents RLS
CREATE POLICY "Admins full access to documents"
ON public.documents FOR ALL TO authenticated USING (public.is_admin());

CREATE POLICY "Employees access permitted client documents"
ON public.documents FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = documents.client_id 
    AND (clients.assigned_salesperson = auth.uid() OR clients.created_by = auth.uid())
  )
);

