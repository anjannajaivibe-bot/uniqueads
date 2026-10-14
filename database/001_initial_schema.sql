CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id text UNIQUE,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  role text NOT NULL DEFAULT 'sales' CHECK (role IN ('super_admin','accounts','operations_manager','supervisor','sales')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code text UNIQUE,
  company_name text NOT NULL,
  contact_person text,
  phone text,
  whatsapp text,
  email text,
  gstin text,
  billing_address text,
  city text,
  state text,
  pincode text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_no text NOT NULL UNIQUE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  company_name text,
  contact_person text NOT NULL,
  phone text NOT NULL,
  whatsapp text,
  email text,
  location text,
  requirement text,
  advertising_type text,
  number_of_locations integer CHECK (number_of_locations IS NULL OR number_of_locations >= 0),
  estimated_wall_area_sqft numeric(12,2) CHECK (estimated_wall_area_sqft IS NULL OR estimated_wall_area_sqft >= 0),
  campaign_duration_days integer CHECK (campaign_duration_days IS NULL OR campaign_duration_days >= 0),
  source text NOT NULL DEFAULT 'direct' CHECK (source IN ('google','website','whatsapp','referral','existing_customer','meta','direct','other')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','requirement_received','quotation_sent','negotiation','won','lost')),
  assigned_to uuid REFERENCES app_users(id) ON DELETE SET NULL,
  next_follow_up_at timestamptz,
  remarks text,
  lost_reason text,
  created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  follow_up_at timestamptz NOT NULL DEFAULT now(),
  next_follow_up_at timestamptz,
  channel text CHECK (channel IN ('call','whatsapp','email','meeting','site_visit','other')),
  outcome text,
  notes text,
  created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_code text UNIQUE,
  name text NOT NULL,
  phone text,
  address text,
  skill text NOT NULL DEFAULT 'painter' CHECK (skill IN ('painter','helper','supervisor','driver','installer','other')),
  state text,
  bank_account_name text,
  bank_account_number text,
  ifsc_code text,
  upi_id text,
  payment_mode text NOT NULL DEFAULT 'daily' CHECK (payment_mode IN ('daily','per_wall','per_sqft','fixed','milestone')),
  default_rate numeric(12,2) CHECK (default_rate IS NULL OR default_rate >= 0),
  joined_on date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_no text NOT NULL UNIQUE,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  quotation_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected','expired','converted')),
  scope_of_work text,
  subtotal numeric(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  taxable_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (taxable_amount >= 0),
  cgst_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (cgst_amount >= 0),
  sgst_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (sgst_amount >= 0),
  igst_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (igst_amount >= 0),
  grand_total numeric(14,2) NOT NULL DEFAULT 0 CHECK (grand_total >= 0),
  payment_terms text,
  terms_and_conditions text,
  notes text,
  created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  description text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  unit text,
  rate numeric(14,2) NOT NULL DEFAULT 0 CHECK (rate >= 0),
  amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no text NOT NULL UNIQUE,
  quotation_id uuid REFERENCES quotations(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  campaign_name text NOT NULL,
  advertising_type text,
  start_date date,
  due_date date,
  completed_date date,
  status text NOT NULL DEFAULT 'order_received' CHECK (status IN ('order_received','planning','team_assigned','material_ready','work_started','in_progress','quality_check','customer_approval','completed','invoiced','closed','cancelled')),
  total_order_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (total_order_amount >= 0),
  advance_received numeric(14,2) NOT NULL DEFAULT 0 CHECK (advance_received >= 0),
  work_instructions text,
  assigned_supervisor uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  location_name text NOT NULL,
  state text,
  district text,
  city text,
  road text,
  landmark text,
  latitude numeric(10,7) CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  longitude numeric(10,7) CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  wall_size text,
  area_sqft numeric(12,2) CHECK (area_sqft IS NULL OR area_sqft >= 0),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  planned_date date,
  completed_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','assigned','in_progress','quality_check','completed','blocked','cancelled')),
  progress_percent integer NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  client_approved boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_worker_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_location_id uuid REFERENCES order_locations(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES workers(id) ON DELETE RESTRICT,
  role_on_job text,
  agreed_payment_mode text CHECK (agreed_payment_mode IN ('daily','per_wall','per_sqft','fixed','milestone')),
  agreed_rate numeric(12,2) CHECK (agreed_rate IS NULL OR agreed_rate >= 0),
  agreed_amount numeric(14,2) CHECK (agreed_amount IS NULL OR agreed_amount >= 0),
  assigned_on date NOT NULL DEFAULT CURRENT_DATE,
  released_on date,
  notes text,
  created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(order_id, order_location_id, worker_id)
);

CREATE TABLE IF NOT EXISTS work_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_location_id uuid REFERENCES order_locations(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('started','in_progress','paused','quality_check','completed','issue')),
  progress_percent integer CHECK (progress_percent IS NULL OR progress_percent BETWEEN 0 AND 100),
  update_text text,
  latitude numeric(10,7) CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  longitude numeric(10,7) CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS work_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_location_id uuid REFERENCES order_locations(id) ON DELETE CASCADE,
  work_update_id uuid REFERENCES work_updates(id) ON DELETE SET NULL,
  photo_type text NOT NULL CHECK (photo_type IN ('before','during','completed','quality_issue','other')),
  file_url text NOT NULL,
  thumbnail_url text,
  caption text,
  latitude numeric(10,7) CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  longitude numeric(10,7) CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  captured_at timestamptz,
  uploaded_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text NOT NULL UNIQUE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','issued','partially_paid','paid','overdue','cancelled')),
  subtotal numeric(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  taxable_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (taxable_amount >= 0),
  cgst_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (cgst_amount >= 0),
  sgst_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (sgst_amount >= 0),
  igst_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (igst_amount >= 0),
  total_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  amount_paid numeric(14,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  payment_terms text,
  notes text,
  created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  description text NOT NULL,
  quantity numeric(12,2) NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  unit text,
  rate numeric(14,2) NOT NULL DEFAULT 0 CHECK (rate >= 0),
  amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_no text UNIQUE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  payment_method text CHECK (payment_method IN ('cash','bank_transfer','upi','cheque','card','other')),
  reference_no text,
  notes text,
  received_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS worker_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_no text UNIQUE,
  worker_id uuid NOT NULL REFERENCES workers(id) ON DELETE RESTRICT,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  order_location_id uuid REFERENCES order_locations(id) ON DELETE SET NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_type text NOT NULL DEFAULT 'progress' CHECK (payment_type IN ('advance','progress','final','adjustment')),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  payment_method text CHECK (payment_method IN ('cash','bank_transfer','upi','cheque','other')),
  reference_no text,
  notes text,
  paid_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_no text UNIQUE,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('paint','brushes_material','printing','vinyl','transport','fuel','lodging','food','wall_owner_payment','permissions','contractor_payment','office','salary','miscellaneous')),
  vendor_name text,
  description text NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  payment_method text CHECK (payment_method IN ('cash','bank_transfer','upi','cheque','card','other')),
  bill_url text,
  entered_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('customer','lead','quotation','order','invoice','worker','expense')),
  entity_id uuid NOT NULL,
  document_type text,
  file_name text NOT NULL,
  file_url text NOT NULL,
  uploaded_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id bigserial PRIMARY KEY,
  actor_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'Unique Ads',
  legal_name text,
  phone text,
  whatsapp text,
  email text,
  website text,
  address text,
  gstin text,
  pan text,
  bank_name text,
  bank_account_name text,
  bank_account_number text,
  ifsc_code text,
  upi_id text,
  logo_url text,
  quotation_terms text,
  invoice_terms text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up_at ON leads(next_follow_up_at);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_due_date ON orders(due_date);
CREATE INDEX IF NOT EXISTS idx_order_locations_order_id ON order_locations(order_id);
CREATE INDEX IF NOT EXISTS idx_order_locations_status ON order_locations(status);
CREATE INDEX IF NOT EXISTS idx_work_updates_order_id ON work_updates(order_id);
CREATE INDEX IF NOT EXISTS idx_work_photos_order_id ON work_photos(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_customer_payments_customer_id ON customer_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_worker_payments_worker_id ON worker_payments(worker_id);
CREATE INDEX IF NOT EXISTS idx_expenses_order_id ON expenses(order_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
