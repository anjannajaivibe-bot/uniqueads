-- Proportional subcontractor settlement: no progress payout above verified completed square-foot value.
CREATE OR REPLACE FUNCTION public.record_verified_subcontract_payment(
  p_worker uuid, p_order uuid, p_actor uuid, p_amount numeric, p_type text,
  p_method text, p_reference text, p_payment_date date, p_notes text
) RETURNS TABLE(payment_id uuid, remaining numeric)
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_worker uuid;
  v_budget numeric;
  v_earned numeric;
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
  -- For progress payouts, only the value of administrator-verified sites is payable.
  -- Site-specific allocations count when their own site is verified;
  -- whole-order allocations are prorated by verified square feet.
  SELECT COALESCE(sum(
    CASE
      WHEN a.order_location_id IS NOT NULL THEN
        CASE WHEN EXISTS (
          SELECT 1 FROM public.order_locations ol
          WHERE ol.id = a.order_location_id AND ol.order_id = p_order
            AND ol.status = 'completed' AND ol.verified_at IS NOT NULL
        ) THEN COALESCE(a.agreed_amount,0) ELSE 0 END
      ELSE COALESCE(a.agreed_amount,0) * COALESCE((
        SELECT sum(COALESCE(ol.area_sqft,0)) FILTER
                   (WHERE ol.status = 'completed' AND ol.verified_at IS NOT NULL)
              / NULLIF(sum(COALESCE(ol.area_sqft,0)),0)
        FROM public.order_locations ol
        WHERE ol.order_id = p_order AND ol.status <> 'cancelled'
      ),0)
    END
  ),0) INTO v_earned
  FROM public.order_worker_assignments a
  WHERE a.order_id=p_order AND a.worker_id=p_worker;

  SELECT COALESCE(sum(amount),0) INTO v_paid FROM public.worker_payments
    WHERE worker_id=p_worker AND order_id=p_order;
  IF v_paid+p_amount > v_budget THEN
    RAISE EXCEPTION 'Payment exceeds the agreed subcontract balance.';
  END IF;
  IF p_type <> 'advance' AND v_paid+p_amount > v_earned THEN
    RAISE EXCEPTION 'Payment exceeds the value of verified completed square feet.';
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
