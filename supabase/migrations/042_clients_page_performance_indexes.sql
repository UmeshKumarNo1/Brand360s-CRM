-- Migration 042: Additional performance indexes for client portfolio, follow-ups and invoices
-- Ensures O(1) and index-scanned lookups for Clients Page

-- 1. Index on follow_ups for fast pending queries and client joins
CREATE INDEX IF NOT EXISTS idx_follow_ups_status_client 
  ON public.follow_ups (status, client_id);

-- 2. Index on invoices for fast client status lookups
CREATE INDEX IF NOT EXISTS idx_invoices_client_status 
  ON public.invoices (client_id, status);

-- 3. Composite index on client_services for client and service_status
CREATE INDEX IF NOT EXISTS idx_client_services_client_id_status 
  ON public.client_services (client_id, service_status);

-- 4. Index on payments for client status lookups
CREATE INDEX IF NOT EXISTS idx_payments_client_id_status 
  ON public.payments (client_id, status);

