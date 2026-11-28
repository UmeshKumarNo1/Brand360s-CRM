-- Migration: 057_add_service_id_to_payment_schedules.sql
-- Description: Link payment_schedules to client_services and invoices for Client -> Service -> Installment hierarchy.

ALTER TABLE public.payment_schedules
  ADD COLUMN IF NOT EXISTS client_service_id UUID REFERENCES public.client_services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payment_schedules_client_service ON public.payment_schedules(client_service_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_invoice ON public.payment_schedules(invoice_id);

NOTIFY pgrst, 'reload schema';

