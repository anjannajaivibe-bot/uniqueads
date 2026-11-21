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

-- Prevent duplicate whole-order allocations even though NULL is not unique in the original index.
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_whole_order_subcontract
  ON public.order_worker_assignments(order_id,worker_id)
  WHERE order_location_id IS NULL AND released_on IS NULL;

-- Payouts are serialized and limited to the subcontract value.
CREATE OR REPLACE FUNCTION public.record_verified_subcontract_payment(
  p_worker uuid, p_order uuid, p_actor uuid, p_amount numeric, p_type text,
  p_method text, p_reference text, p_payment_date date, p_notes text
) RETURNS TABLE(payment_id uuid, remaining numeric)
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_worker uuid;
  v_budget numeric;
  v_paid numeric;
  v_total integer;
  v_verified integer;
  v_payment_id uuid;
  v_number text;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 999999999999 THEN
    RAISE EXCEPTION 'Subcontract payment must be a positive amount.';
  END IF;
  IF p_type NOT IN ('advance','progress','final','adjustment') THEN
    RAISE EXCEPTION 'Unsupported payment type.';
  END IF;
  IF p_method IS NOT NULL AND p_method NOT IN ('cash','bank_transfer','upi','cheque','other') THEN
    RAISE EXCEPTION 'Unsupported payment method.';
  END IF;
  SELECT id INTO v_worker FROM public.workers
    WHERE id=p_worker AND is_active=true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subcontractor not found or inactive.'; END IF;
  SELECT COALESCE(sum(agreed_amount),0) INTO v_budget
    FROM public.order_worker_assignments
    WHERE order_id=p_order AND worker_id=p_worker;
  IF v_budget <= 0 THEN RAISE EXCEPTION 'Allocate square feet and agreed subcontract value before payout.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.orders WHERE id=p_order AND status <> 'cancelled') THEN
    RAISE EXCEPTION 'Work order not found or cancelled.';
  END IF;
  SELECT count(*)::integer,
         count(*) FILTER (WHERE ol.status='completed' AND ol.verified_at IS NOT NULL)::integer
    INTO v_total,v_verified
  FROM public.order_locations ol
  WHERE ol.order_id=p_order AND ol.status <> 'cancelled'
    AND EXISTS (
      SELECT 1 FROM public.order_worker_assignments a
      WHERE a.order_id=p_order AND a.worker_id=p_worker
        AND (a.order_location_id=ol.id OR a.order_location_id IS NULL)
    );
  IF p_type <> 'advance' AND v_verified = 0 THEN
    RAISE EXCEPTION 'No Unique Ads-verified work is available for payment.';
  END IF;
  IF p_type = 'final' AND (v_total = 0 OR v_verified < v_total) THEN
    RAISE EXCEPTION 'Final settlement requires all allocated locations to be verified.';
  END IF;
  SELECT COALESCE(sum(amount),0) INTO v_paid FROM public.worker_payments
    WHERE worker_id=p_worker AND order_id=p_order;
  IF v_paid+p_amount > v_budget THEN
    RAISE EXCEPTION 'Payment exceeds the agreed subcontract balance.';
  END IF;
  v_number := 'UA-WPAY-' || to_char(CURRENT_DATE,'YYYY') || '-' ||
    upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  INSERT INTO public.worker_payments(
    payment_no,worker_id,order_id,payment_date,payment_type,
    amount,payment_method,reference_no,notes,paid_by
  ) VALUES (
    v_number,p_worker,p_order,COALESCE(p_payment_date,CURRENT_DATE),p_type,
    p_amount,p_method,p_reference,p_notes,p_actor
  ) RETURNING id INTO v_payment_id;
  INSERT INTO public.activity_logs(actor_user_id,action,entity_type,entity_id,description,metadata)
  VALUES (
    p_actor,'subcontract_payment_recorded','worker',p_worker,
    'Subcontract payment '||v_number||' recorded.',
    jsonb_build_object('work_order',p_order,'amount',p_amount,'payment_type',p_type)
  );
  RETURN QUERY SELECT v_payment_id,(v_budget-v_paid-p_amount)::numeric;
END $$;
