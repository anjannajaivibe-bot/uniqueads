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

-- Serialize all direct company receipts for an order to prevent over-collection.
CREATE OR REPLACE FUNCTION public.record_company_work_receipt(
  p_order uuid, p_actor uuid, p_amount numeric, p_method text,
  p_reference text, p_payment_date date, p_notes text
) RETURNS TABLE(payment_id uuid, outstanding numeric)
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_order RECORD;
  v_received numeric;
  v_receipt uuid;
  v_number text;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 999999999999 THEN
    RAISE EXCEPTION 'Receipt amount must be positive.';
  END IF;
  IF p_method IS NOT NULL AND p_method NOT IN
    ('cash','bank_transfer','upi','cheque','card','other') THEN
    RAISE EXCEPTION 'Unsupported payment method.';
  END IF;
  SELECT id, customer_id, total_order_amount, status INTO v_order
  FROM public.orders WHERE id = p_order FOR UPDATE;
  IF NOT FOUND OR v_order.status = 'cancelled' THEN
    RAISE EXCEPTION 'Work order not found or cancelled.';
  END IF;
  SELECT COALESCE(sum(amount),0) INTO v_received
    FROM public.customer_payments WHERE order_id = p_order;
  IF v_received + p_amount > v_order.total_order_amount THEN
    RAISE EXCEPTION 'Receipt exceeds outstanding work order value.';
  END IF;
  v_number := 'UA-RCP-' || to_char(CURRENT_DATE,'YYYY') || '-' ||
    upper(substr(replace(gen_random_uuid()::text, '-', ''),1,10));
  INSERT INTO public.customer_payments(
    payment_no,customer_id,order_id,payment_date,amount,payment_method,
    reference_no,notes,received_by
  ) VALUES (
    v_number,v_order.customer_id,p_order,COALESCE(p_payment_date,CURRENT_DATE),
    p_amount,p_method,p_reference,p_notes,p_actor
  ) RETURNING id INTO v_receipt;
  INSERT INTO public.activity_logs(
    actor_user_id,action,entity_type,entity_id,description,metadata
  ) VALUES (
    p_actor,'customer_payment_recorded','order',p_order,
    'Company receipt ' || v_number || ' recorded.',
    jsonb_build_object('receipt_no',v_number,'amount',p_amount,
      'reference',p_reference)
  );
  RETURN QUERY SELECT v_receipt, (v_order.total_order_amount - v_received - p_amount)::numeric;
END $$;
