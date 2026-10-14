-- Unique Ads data-integrity and scale indexes
-- Safe to run after confirming there are no duplicate quotation-linked orders.

CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_quotation_id
  ON public.orders (quotation_id)
  WHERE quotation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_order_id
  ON public.invoices (order_id);

CREATE INDEX IF NOT EXISTS idx_customer_payments_invoice_id
  ON public.customer_payments (invoice_id);

CREATE INDEX IF NOT EXISTS idx_customer_payments_order_id
  ON public.customer_payments (order_id);

CREATE INDEX IF NOT EXISTS idx_worker_payments_order_id
  ON public.worker_payments (order_id);

CREATE INDEX IF NOT EXISTS idx_work_photos_order_location_id
  ON public.work_photos (order_location_id);

CREATE INDEX IF NOT EXISTS idx_work_updates_order_location_id
  ON public.work_updates (order_location_id);
