-- Migration 041: Workflow Templates Configuration System
-- Supports extensible, service-specific fulfillment workflows with admin configuration

-- 1. Create workflow_templates table
CREATE TABLE IF NOT EXISTS public.workflow_templates (
  id TEXT PRIMARY KEY, -- e.g. 'website', 'smm', 'trademark', 'incorporation', 'gst', 'general'
  name TEXT NOT NULL,
  description TEXT,
  stages JSONB NOT NULL, -- Array of string stage names e.g. ["Requirements", "UI/UX Design", ...]
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Insert standard initial workflows
INSERT INTO public.workflow_templates (id, name, description, stages, is_active)
VALUES
  (
    'website',
    'Website Development',
    'Full website and web application development lifecycle',
    '["Requirements", "UI/UX Design", "Development", "Client Review", "Deployment"]'::jsonb,
    true
  ),
  (
    'smm',
    'Social Media Marketing',
    'End-to-end social media growth, campaign management & publishing',
    '["Client Onboarding", "Strategy & Planning", "Content Creation", "Client Approval", "Publishing", "Performance Reporting"]'::jsonb,
    true
  ),
  (
    'trademark',
    'Trademark Filing',
    'Intellectual property search, application filing, examination & registration',
    '["Client Onboarding", "Document Collection", "Trademark Search", "Application Filing", "Examination", "Registration"]'::jsonb,
    true
  ),
  (
    'incorporation',
    'Company Registration',
    'Corporate entity formation, name approval, government filings & COI issuance',
    '["Document Collection", "Name Approval", "Application Preparation", "Government Filing", "Government Processing", "Certificate Issued"]'::jsonb,
    true
  ),
  (
    'gst',
    'GST Registration',
    'Goods and Services Tax documentation, application, verification & GSTIN issuance',
    '["Document Collection", "Application Preparation", "Application Submission", "Verification", "GSTIN Issued"]'::jsonb,
    true
  ),
  (
    'compliance',
    'Annual Compliance',
    'Statutory audits, ROC filings & recurring corporate compliance',
    '["Onboarding", "Doc Collection", "Preparation", "Filing", "Completed"]'::jsonb,
    true
  ),
  (
    'general',
    'General Service',
    'Standard professional service delivery workflow',
    '["Onboarding", "Doc Collection", "Preparation", "Filing", "Closure"]'::jsonb,
    true
  )
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  stages = EXCLUDED.stages,
  is_active = true,
  updated_at = NOW();

-- 3. Enable Row Level Security
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

-- Drop policies if exists
DROP POLICY IF EXISTS "workflow_templates_select" ON public.workflow_templates;
DROP POLICY IF EXISTS "workflow_templates_admin_all" ON public.workflow_templates;

-- Read policy: Anyone authenticated can view active workflow templates
CREATE POLICY "workflow_templates_select" ON public.workflow_templates
  FOR SELECT
  TO authenticated
  USING (true);

-- Admin write policy: Only admins can insert, update or delete workflow templates
CREATE POLICY "workflow_templates_admin_all" ON public.workflow_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND profiles.is_active = true
    )
  );

