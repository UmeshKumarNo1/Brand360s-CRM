-- ==============================================================================
-- BRAND 360s CRM — Migration 010: Client Details Enhancement
-- ==============================================================================
-- Adds support for Trade Name, Designation, Additional Contacts (JSONB),
-- Billing Details (Name, Address, Contact, Email), Client Since date, 
-- GST registration status, and Inactive client status.
-- ==============================================================================

-- 1. Add enhanced client fields
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS trade_name TEXT,
  ADD COLUMN IF NOT EXISTS designation TEXT,
  ADD COLUMN IF NOT EXISTS additional_contacts JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS billing_name TEXT,
  ADD COLUMN IF NOT EXISTS billing_address TEXT,
  ADD COLUMN IF NOT EXISTS billing_contact TEXT,
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS client_since DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS is_not_gst_registered BOOLEAN DEFAULT false;

-- 2. Update client_status check constraint to support 'Inactive'
DO $$
BEGIN
  ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_client_status_check;
  ALTER TABLE public.clients ADD CONSTRAINT clients_client_status_check 
    CHECK (client_status IN ('Active', 'Inactive', 'Pending Onboarding', 'On Hold', 'Archived'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 3. Comments for documentation
COMMENT ON COLUMN public.clients.trade_name IS 'Trade name if different from legal company name';
COMMENT ON COLUMN public.clients.designation IS 'Designation/title of primary contact person';
COMMENT ON COLUMN public.clients.additional_contacts IS 'JSON array of secondary contacts: [{name, designation, phone, email}]';
COMMENT ON COLUMN public.clients.billing_name IS 'Billing company/entity name';
COMMENT ON COLUMN public.clients.billing_address IS 'Billing postal/registered address';
COMMENT ON COLUMN public.clients.billing_contact IS 'Billing primary contact person name';
COMMENT ON COLUMN public.clients.billing_email IS 'Billing email address for invoicing';
COMMENT ON COLUMN public.clients.client_since IS 'Date client relationship began (defaults to creation date)';
COMMENT ON COLUMN public.clients.is_not_gst_registered IS 'Flag whether client is exempt or not registered for GST';
