-- Additive migration for confirmed sq.ft work orders and two receiving entities.
-- Existing work orders remain under Unique Ads unless deliberately reassigned.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS entity_code text NOT NULL DEFAULT 'unique_ads',
  ADD COLUMN IF NOT EXISTS client_work_order_no text,
  ADD COLUMN IF NOT EXISTS client_invoice_no text,
  ADD COLUMN IF NOT EXISTS contract_area_sqft numeric(14,2),
  ADD COLUMN IF NOT EXISTS client_rate_per_sqft numeric(14,2);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_entity_code_check') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_entity_code_check
      CHECK (entity_code IN ('unique_ads','unique_advertisers'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_contract_area_sqft_check') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_contract_area_sqft_check
      CHECK (contract_area_sqft IS NULL OR contract_area_sqft > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_client_rate_per_sqft_check') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_client_rate_per_sqft_check
      CHECK (client_rate_per_sqft IS NULL OR client_rate_per_sqft >= 0);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_orders_entity_created ON public.orders(entity_code, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_company_work_ref ON public.orders(customer_id,entity_code,client_work_order_no) WHERE client_work_order_no IS NOT NULL;
ALTER TABLE public.order_locations
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES public.app_users(id) ON DELETE SET NULL;
-- Historical records are preserved: no drops, deletes or backfills.
