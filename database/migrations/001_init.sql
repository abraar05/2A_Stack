-- 2A_Stack shared schema (PostgreSQL)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===================== IDENTITY =====================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','management','warehouse','sales','hr','accounts','delivery','customer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_signin TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY, user_id INT REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, revoked BOOLEAN NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY, user_id INT REFERENCES users(id),
  application TEXT NOT NULL, action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT,
  previous_state TEXT, new_state TEXT, ip TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== PEOPLE =====================
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY, user_id INT REFERENCES users(id),
  full_name TEXT NOT NULL, department TEXT, position TEXT, status TEXT DEFAULT 'active',
  joined_at DATE, phone TEXT, email TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY, employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  work_date DATE NOT NULL, clock_in TIMESTAMPTZ, clock_out TIMESTAMPTZ,
  shift TEXT, overtime_minutes INT DEFAULT 0, status TEXT DEFAULT 'present'
);
CREATE TABLE IF NOT EXISTS leaves (
  id SERIAL PRIMARY KEY, employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  leave_type TEXT, from_date DATE, to_date DATE, reason TEXT,
  status TEXT DEFAULT 'pending', decided_by INT REFERENCES users(id), created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS payroll_runs (
  id SERIAL PRIMARY KEY, period_label TEXT, total_amount NUMERIC(14,2), status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS candidates (
  id SERIAL PRIMARY KEY, full_name TEXT, role_applied TEXT, stage TEXT DEFAULT 'applied',
  source TEXT, email TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS approvals (
  id SERIAL PRIMARY KEY, kind TEXT, requester_id INT REFERENCES users(id),
  subject TEXT, amount NUMERIC(14,2), status TEXT DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT now()
);

-- ===================== CATALOG =====================
CREATE TABLE IF NOT EXISTS brands (id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL);
CREATE TABLE IF NOT EXISTS models (id SERIAL PRIMARY KEY, brand_id INT REFERENCES brands(id), name TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY, brand_id INT REFERENCES brands(id), model_id INT REFERENCES models(id),
  name TEXT NOT NULL, storage TEXT, ram TEXT, colour TEXT, region TEXT,
  purchase_cost NUMERIC(14,2), selling_price NUMERIC(14,2), category TEXT DEFAULT 'phone'
);

-- ===================== INVENTORY =====================
CREATE TABLE IF NOT EXISTS warehouses (
  id SERIAL PRIMARY KEY, name TEXT NOT NULL, location TEXT, capacity_pct INT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS imeis (
  id SERIAL PRIMARY KEY, imei1 TEXT UNIQUE NOT NULL, imei2 TEXT, serial_no TEXT,
  product_id INT REFERENCES products(id), warehouse_id INT REFERENCES warehouses(id),
  stock_type TEXT DEFAULT 'new', condition TEXT DEFAULT 'new', warranty TEXT,
  purchase_cost NUMERIC(14,2), selling_price NUMERIC(14,2), status TEXT DEFAULT 'received',
  reserved_for INT, notes TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS imei_events (
  id SERIAL PRIMARY KEY, imei_id INT REFERENCES imeis(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id), action TEXT NOT NULL, reference TEXT,
  previous_state TEXT, new_state TEXT, location TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===================== CUSTOMERS / CRM =====================
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY, user_id INT REFERENCES users(id),
  name TEXT NOT NULL, city TEXT, tier TEXT DEFAULT 'Silver', credit_limit NUMERIC(14,2) DEFAULT 0,
  outstanding NUMERIC(14,2) DEFAULT 0, salesperson TEXT, risk TEXT DEFAULT 'low', created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY, company TEXT, contact_name TEXT, source TEXT, owner TEXT,
  interest TEXT, value NUMERIC(14,2) DEFAULT 0, stage TEXT DEFAULT 'new', created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS opportunities (
  id SERIAL PRIMARY KEY, lead_id INT REFERENCES leads(id), stage TEXT DEFAULT 'qualified',
  value NUMERIC(14,2) DEFAULT 0, close_at DATE, owner TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY, customer_id INT REFERENCES customers(id), kind TEXT,
  subject TEXT, owner TEXT, due_at DATE, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS quotes (
  id SERIAL PRIMARY KEY, customer_id INT REFERENCES customers(id), value NUMERIC(14,2),
  discount_pct NUMERIC(5,2) DEFAULT 0, validity_days INT DEFAULT 30, status TEXT DEFAULT 'draft', created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY, name TEXT, owner TEXT, offer TEXT, target_count INT DEFAULT 0,
  status TEXT DEFAULT 'draft', created_at TIMESTAMPTZ DEFAULT now()
);

-- ===================== SALES / ORDERS =====================
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY, order_no TEXT UNIQUE NOT NULL, customer_id INT REFERENCES customers(id),
  status TEXT NOT NULL DEFAULT 'draft', total NUMERIC(14,2) DEFAULT 0, notes TEXT,
  created_by INT REFERENCES users(id), created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY, order_id INT REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT REFERENCES products(id), imei_id INT REFERENCES imeis(id),
  qty INT DEFAULT 1, unit_price NUMERIC(14,2) DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ===================== PURCHASING =====================
CREATE TABLE IF NOT EXISTS suppliers (id SERIAL PRIMARY KEY, name TEXT NOT NULL, lead_time_days INT, rating NUMERIC(3,2));
CREATE TABLE IF NOT EXISTS purchase_orders (
  id SERIAL PRIMARY KEY, po_no TEXT UNIQUE NOT NULL, supplier_id INT REFERENCES suppliers(id),
  warehouse_id INT REFERENCES warehouses(id), status TEXT DEFAULT 'draft', eta DATE, total NUMERIC(14,2) DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS inbound_shipments (
  id SERIAL PRIMARY KEY, po_id INT REFERENCES purchase_orders(id), eta DATE, status TEXT DEFAULT 'expected', carrier TEXT, created_at TIMESTAMPTZ DEFAULT now()
);

-- ===================== FINANCE =====================
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY, customer_id INT REFERENCES customers(id), order_id INT REFERENCES orders(id),
  amount NUMERIC(14,2) NOT NULL, method TEXT, status TEXT DEFAULT 'completed', created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY, invoice_no TEXT UNIQUE NOT NULL, order_id INT REFERENCES orders(id),
  customer_id INT REFERENCES customers(id), total NUMERIC(14,2) DEFAULT 0, status TEXT DEFAULT 'unpaid', created_at TIMESTAMPTZ DEFAULT now()
);

-- ===================== LOGISTICS =====================
CREATE TABLE IF NOT EXISTS carriers (id SERIAL PRIMARY KEY, name TEXT NOT NULL, on_time_pct NUMERIC(5,2), failure_rate NUMERIC(5,2));
CREATE TABLE IF NOT EXISTS vehicles (id SERIAL PRIMARY KEY, plate TEXT UNIQUE, driver TEXT, status TEXT DEFAULT 'active');
CREATE TABLE IF NOT EXISTS drivers (id SERIAL PRIMARY KEY, name TEXT, phone TEXT, license_no TEXT);
CREATE TABLE IF NOT EXISTS shipments (
  id SERIAL PRIMARY KEY, shipment_no TEXT UNIQUE NOT NULL, order_id INT REFERENCES orders(id),
  source_warehouse_id INT REFERENCES warehouses(id), destination TEXT, carrier_id INT REFERENCES carriers(id),
  vehicle_id INT REFERENCES vehicles(id), eta TIMESTAMPTZ, arrived_at TIMESTAMPTZ,
  status TEXT DEFAULT 'picked', created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS shipment_items (
  id SERIAL PRIMARY KEY, shipment_id INT REFERENCES shipments(id) ON DELETE CASCADE, imei_id INT REFERENCES imeis(id)
);
CREATE TABLE IF NOT EXISTS exceptions (
  id SERIAL PRIMARY KEY, shipment_id INT REFERENCES shipments(id), kind TEXT, severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open', created_at TIMESTAMPTZ DEFAULT now()
);

-- ===================== PORTAL / SUPPORT =====================
CREATE TABLE IF NOT EXISTS tickets (
  id SERIAL PRIMARY KEY, customer_id INT REFERENCES customers(id), subject TEXT, body TEXT,
  status TEXT DEFAULT 'open', created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ticket_messages (
  id SERIAL PRIMARY KEY, ticket_id INT REFERENCES tickets(id) ON DELETE CASCADE,
  author_id INT REFERENCES users(id), body TEXT, created_at TIMESTAMPTZ DEFAULT now()
);

-- ===================== DOCUMENTS / NOTIFICATIONS =====================
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY, owner_type TEXT, owner_id TEXT, title TEXT, url TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY, user_id INT REFERENCES users(id), application TEXT, kind TEXT,
  title TEXT, body TEXT, read BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);

-- ===================== AI =====================
CREATE TABLE IF NOT EXISTS ai_queries (
  id SERIAL PRIMARY KEY, user_id INT REFERENCES users(id), application TEXT, prompt TEXT, response TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
