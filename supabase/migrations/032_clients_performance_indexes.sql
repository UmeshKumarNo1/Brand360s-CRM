-- Migration 032: Client portfolio & services performance indexes
-- Speeds up client filtering, service counts, followups, and payment allocation aggregation

-- 1. Index on client_services for status filtering and fast client joins
CREATE INDEX IF NOT EXISTS idx_client_services_client_status 
  ON public.client_services (client_id, service_status);

CREATE INDEX IF NOT EXISTS idx_client_services_status 
  ON public.client_services (service_status);

-- 2. Index on clients for sorting and status tabs
CREATE INDEX IF NOT EXISTS idx_clients_status_created 
  ON public.clients (client_status, created_at DESC);

-- 3. Composite index on invoice_payment_allocations to accelerate service-level allocations
CREATE INDEX IF NOT EXISTS idx_alloc_service_amount 
  ON public.invoice_payment_allocations (client_service_id, allocated_amount);

CREATE INDEX IF NOT EXISTS idx_alloc_invoice_service 
  ON public.invoice_payment_allocations (invoice_id, client_service_id);

-- 4. Index on followups for pending count and client joins
CREATE INDEX IF NOT EXISTS idx_followups_status_client 
  ON public.followups (status, client_id);
