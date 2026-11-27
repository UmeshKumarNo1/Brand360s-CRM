-- Migration: 054_expand_client_status_options.sql
-- Description: Expand clients_client_status_check to support all 10 client lifecycle statuses plus Archived.

ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_client_status_check;

ALTER TABLE public.clients
  ADD CONSTRAINT clients_client_status_check
  CHECK (
    client_status IN (
      'Active',
      'Pending Onboarding',
      'Documentation in Progress',
      'Work in Progress',
      'Awaiting External Approval',
      'Awaiting Professional Review',
      'Completed – Professional Review',
      'On Hold',
      'Completed',
      'Inactive',
      'Archived'
    )
  );

