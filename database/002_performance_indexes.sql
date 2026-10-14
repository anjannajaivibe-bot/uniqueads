-- Unique Ads performance indexes
-- Apply after review to the production Neon database.

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_worker_unique
  ON app_users(worker_id)
  WHERE worker_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_assigned_supervisor
  ON orders(assigned_supervisor);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_quotation_unique
  ON orders(quotation_id)
  WHERE quotation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_worker_assignments_worker_active
  ON order_worker_assignments(worker_id, order_id, order_location_id)
  WHERE released_on IS NULL;

CREATE INDEX IF NOT EXISTS idx_work_photos_location_created
  ON work_photos(order_location_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_work_updates_location_recorded
  ON work_updates(order_location_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_order_id
  ON invoices(order_id);

CREATE INDEX IF NOT EXISTS idx_customer_payments_invoice_id
  ON customer_payments(invoice_id);

CREATE INDEX IF NOT EXISTS idx_customer_payments_order_id
  ON customer_payments(order_id);

CREATE INDEX IF NOT EXISTS idx_worker_payments_order_id
  ON worker_payments(order_id);

CREATE INDEX IF NOT EXISTS idx_quotations_lead_id
  ON quotations(lead_id);

CREATE INDEX IF NOT EXISTS idx_leads_customer_id
  ON leads(customer_id);
