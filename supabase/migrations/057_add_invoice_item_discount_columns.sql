-- Migration: 057_add_invoice_item_discount_columns.sql
-- Description: Ensure invoice_items has discount_percent and taxable_amount columns
-- alongside discount_amount for full pre-tax discount tracking.

ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS taxable_amount NUMERIC(12,2);

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

