-- ==============================================================================
-- Migration 023: Client Service Documents and Deliverables
-- ==============================================================================

-- Ensure documents table has appropriate indexes
CREATE INDEX IF NOT EXISTS idx_documents_service ON public.documents(client_service_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(document_type);

-- Expand RLS policy to allow employees assigned to a service to view & manage documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'documents' AND policyname = 'Employees access assigned service documents'
  ) THEN
    CREATE POLICY "Employees access assigned service documents"
    ON public.documents FOR ALL TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.client_services
        WHERE client_services.id = documents.client_service_id
        AND client_services.assigned_employee_id = auth.uid()
      )
    );
  END IF;
END $$;

