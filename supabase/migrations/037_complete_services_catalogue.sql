-- ==============================================================================
-- BRAND 360s CRM — Migration 037: Complete Services Catalogue Expansion
-- Adds comprehensive brand360s.co services with automatic category mapping
-- ==============================================================================

-- 1. Ensure services_catalog has workflow_preset column if useful
ALTER TABLE public.services_catalog
  ADD COLUMN IF NOT EXISTS workflow_preset TEXT DEFAULT NULL;

-- 2. Upsert official BRAND 360s Services into services_catalog
-- Categories:
-- 'Business Registration'
-- 'Compliance & Tax'
-- 'Intellectual Property & Legal'
-- 'Branding & Web Development'
-- 'Digital Growth & Visibility'

INSERT INTO public.services_catalog (name, category, default_service_fee, default_govt_fee, workflow_preset, is_active)
VALUES
  -- A. Business Registration
  ('Company Registration', 'Business Registration', 10000.00, 5000.00, 'incorporation', true),
  ('Private Limited Company Registration', 'Business Registration', 12000.00, 5000.00, 'incorporation', true),
  ('LLP Registration', 'Business Registration', 8000.00, 3000.00, 'incorporation', true),
  ('OPC Registration', 'Business Registration', 9000.00, 4000.00, 'incorporation', true),
  ('Partnership Firm Registration', 'Business Registration', 6000.00, 1500.00, 'incorporation', true),
  ('Proprietorship Registration', 'Business Registration', 3500.00, 0.00, 'incorporation', true),
  ('Section 8 Company Registration', 'Business Registration', 18000.00, 8000.00, 'incorporation', true),
  ('Startup India Registration', 'Business Registration', 5000.00, 0.00, 'general', true),
  ('GST Registration', 'Business Registration', 4000.00, 0.00, 'gst', true),
  ('Udyam / MSME Registration', 'Business Registration', 2000.00, 0.00, 'general', true),
  ('FSSAI Registration', 'Business Registration', 4500.00, 2000.00, 'general', true),
  ('Digital Signature Certificate (DSC)', 'Business Registration', 1500.00, 0.00, 'general', true),
  ('DIN Registration', 'Business Registration', 2500.00, 1000.00, 'general', true),
  ('ICEGATE Registration', 'Business Registration', 5000.00, 0.00, 'general', true),
  ('Import Export Code (IEC)', 'Business Registration', 3500.00, 500.00, 'general', true),
  ('Professional Tax Registration', 'Business Registration', 3500.00, 500.00, 'general', true),
  ('Shop & Establishment License', 'Business Registration', 4000.00, 1000.00, 'general', true),

  -- B. Compliance & Tax
  ('GST Return Filing', 'Compliance & Tax', 3000.00, 0.00, 'compliance', true),
  ('GST Annual Return Filing', 'Compliance & Tax', 8000.00, 0.00, 'compliance', true),
  ('GST Reconciliation', 'Compliance & Tax', 5000.00, 0.00, 'compliance', true),
  ('Income Tax Return (ITR) Filing', 'Compliance & Tax', 4000.00, 0.00, 'compliance', true),
  ('MCA / ROC Compliance', 'Compliance & Tax', 12000.00, 2000.00, 'compliance', true),
  ('AOC-4 Filing', 'Compliance & Tax', 5000.00, 1000.00, 'compliance', true),
  ('MGT-7 Filing', 'Compliance & Tax', 5000.00, 1000.00, 'compliance', true),
  ('TDS Returns & Compliance', 'Compliance & Tax', 4500.00, 0.00, 'compliance', true),
  ('Accounting & Bookkeeping', 'Compliance & Tax', 15000.00, 0.00, 'compliance', true),
  ('Payroll Management', 'Compliance & Tax', 10000.00, 0.00, 'compliance', true),
  ('PF Compliance', 'Compliance & Tax', 4000.00, 0.00, 'compliance', true),
  ('ESI Compliance', 'Compliance & Tax', 4000.00, 0.00, 'compliance', true),
  ('HR Compliance', 'Compliance & Tax', 7500.00, 0.00, 'compliance', true),
  ('Corporate Compliance', 'Compliance & Tax', 15000.00, 2500.00, 'compliance', true),
  ('Director KYC', 'Compliance & Tax', 1500.00, 500.00, 'compliance', true),
  ('Annual Compliance', 'Compliance & Tax', 15000.00, 2000.00, 'compliance', true),
  ('Statutory Audit Support', 'Compliance & Tax', 18000.00, 0.00, 'compliance', true),

  -- C. Intellectual Property & Legal
  ('Trademark Search', 'Intellectual Property & Legal', 1500.00, 0.00, 'trademark', true),
  ('Trademark Registration', 'Intellectual Property & Legal', 7500.00, 4500.00, 'trademark', true),
  ('Trademark Filing', 'Intellectual Property & Legal', 7500.00, 4500.00, 'trademark', true),
  ('Trademark Renewal', 'Intellectual Property & Legal', 8000.00, 9000.00, 'trademark', true),
  ('Trademark Objection Reply', 'Intellectual Property & Legal', 6000.00, 0.00, 'trademark', true),
  ('Trademark Hearing Support', 'Intellectual Property & Legal', 10000.00, 0.00, 'trademark', true),
  ('Copyright Registration', 'Intellectual Property & Legal', 9000.00, 2000.00, 'trademark', true),
  ('Patent Filing Support', 'Intellectual Property & Legal', 25000.00, 8000.00, 'trademark', true),
  ('IP Protection', 'Intellectual Property & Legal', 12000.00, 0.00, 'trademark', true),
  ('Commercial Agreement Drafting', 'Intellectual Property & Legal', 7500.00, 0.00, 'general', true),
  ('Contract Review', 'Intellectual Property & Legal', 5000.00, 0.00, 'general', true),
  ('Legal Support Services', 'Intellectual Property & Legal', 10000.00, 0.00, 'general', true),
  ('Corporate Documentation', 'Intellectual Property & Legal', 6500.00, 0.00, 'general', true),
  ('Non-Disclosure Agreement (NDA)', 'Intellectual Property & Legal', 3000.00, 0.00, 'general', true),

  -- D. Branding & Web Development
  ('Logo Design', 'Branding & Web Development', 8000.00, 0.00, 'website', true),
  ('Brand Identity Design', 'Branding & Web Development', 18000.00, 0.00, 'website', true),
  ('Business Branding', 'Branding & Web Development', 25000.00, 0.00, 'website', true),
  ('Personal Branding', 'Branding & Web Development', 20000.00, 0.00, 'website', true),
  ('Business Website Design', 'Branding & Web Development', 35000.00, 0.00, 'website', true),
  ('Website UI/UX Design', 'Branding & Web Development', 25000.00, 0.00, 'website', true),
  ('Website Development', 'Branding & Web Development', 45000.00, 0.00, 'website', true),
  ('E-commerce Website Development', 'Branding & Web Development', 65000.00, 0.00, 'website', true),
  ('Mobile-Friendly Website Development', 'Branding & Web Development', 40000.00, 0.00, 'website', true),
  ('Website Maintenance', 'Branding & Web Development', 10000.00, 0.00, 'website', true),
  ('Company Profile Design', 'Branding & Web Development', 12000.00, 0.00, 'website', true),
  ('Pitch Deck Design', 'Branding & Web Development', 15000.00, 0.00, 'website', true),
  ('Corporate Presentation Design', 'Branding & Web Development', 12000.00, 0.00, 'website', true),

  -- E. Digital Growth & Visibility
  ('SEO Services', 'Digital Growth & Visibility', 20000.00, 0.00, 'general', true),
  ('GEO / AI Search Visibility', 'Digital Growth & Visibility', 25000.00, 0.00, 'general', true),
  ('Local SEO', 'Digital Growth & Visibility', 15000.00, 0.00, 'general', true),
  ('Social Media Marketing', 'Digital Growth & Visibility', 22000.00, 0.00, 'general', true),
  ('PR Services', 'Digital Growth & Visibility', 30000.00, 0.00, 'general', true),
  ('Brand Visibility', 'Digital Growth & Visibility', 25000.00, 0.00, 'general', true),
  ('Founder Visibility', 'Digital Growth & Visibility', 25000.00, 0.00, 'general', true),
  ('Reputation Management', 'Digital Growth & Visibility', 30000.00, 0.00, 'general', true),
  ('Corporate Positioning', 'Digital Growth & Visibility', 35000.00, 0.00, 'general', true),
  ('Google Business Profile Optimisation', 'Digital Growth & Visibility', 8000.00, 0.00, 'general', true)
ON CONFLICT (name) DO UPDATE
SET 
  category = EXCLUDED.category,
  default_service_fee = COALESCE(services_catalog.default_service_fee, EXCLUDED.default_service_fee),
  default_govt_fee = COALESCE(services_catalog.default_govt_fee, EXCLUDED.default_govt_fee),
  workflow_preset = COALESCE(EXCLUDED.workflow_preset, services_catalog.workflow_preset),
  is_active = true;

