-- ==============================================================================
-- BRAND 360s CRM — Migration 007: Service Vendors Constraints & Performance Indexes
-- ==============================================================================

-- 1. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_service_vendors_client_service 
ON public.service_vendors(client_service_id);

CREATE INDEX IF NOT EXISTS idx_service_vendors_vendor 
ON public.service_vendors(vendor_id);

-- 2. Optional Unique Index to prevent assigning the same vendor to the same service twice
CREATE UNIQUE INDEX IF NOT EXISTS service_vendors_unique_service_vendor
ON public.service_vendors (client_service_id, vendor_id);

