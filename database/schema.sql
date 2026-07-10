-- PGPOS - Pharmacy & Grocery POS System Database Schema
-- PostgreSQL for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Roles
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permissions
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, permission)
);

-- Users (using Supabase Auth, but also storing extra profile data)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin', 'cashier', 'csr')),
  is_active BOOLEAN DEFAULT TRUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(150) NOT NULL,
  contact_person VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barcode VARCHAR(50) UNIQUE,
  sku VARCHAR(50) UNIQUE,
  name VARCHAR(200) NOT NULL,
  generic_name VARCHAR(200),
  brand VARCHAR(100),
  category_id UUID REFERENCES categories(id),
  supplier_id UUID REFERENCES suppliers(id),
  unit VARCHAR(50) NOT NULL DEFAULT 'piece',
  cost_price DECIMAL(12,2) DEFAULT 0,
  selling_price DECIMAL(12,2) DEFAULT 0,
  current_stock DECIMAL(12,2) DEFAULT 0,
  min_stock DECIMAL(12,2) DEFAULT 0,
  max_stock DECIMAL(12,2),
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Batches (for FEFO - First Expired, First Out)
CREATE TABLE IF NOT EXISTS product_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_number VARCHAR(50) NOT NULL,
  quantity DECIMAL(12,2) DEFAULT 0,
  cost_price DECIMAL(12,2) DEFAULT 0,
  expiration_date DATE,
  received_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory Logs
CREATE TABLE IF NOT EXISTS inventory_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id),
  batch_id UUID REFERENCES product_batches(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('IN', 'OUT', 'ADJUSTMENT')),
  quantity DECIMAL(12,2) NOT NULL,
  reference VARCHAR(100),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Receiving
CREATE TABLE IF NOT EXISTS receiving (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receiving_number VARCHAR(50) NOT NULL UNIQUE,
  invoice_number VARCHAR(100),
  supplier_id UUID REFERENCES suppliers(id),
  received_by UUID REFERENCES users(id),
  notes TEXT,
  total_cost DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Receiving Items
CREATE TABLE IF NOT EXISTS receiving_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receiving_id UUID NOT NULL REFERENCES receiving(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  batch_number VARCHAR(50),
  quantity DECIMAL(12,2) NOT NULL,
  cost_price DECIMAL(12,2) DEFAULT 0,
  expiration_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_number VARCHAR(50) NOT NULL UNIQUE,
  cashier_id UUID NOT NULL REFERENCES users(id),
  subtotal DECIMAL(12,2) DEFAULT 0,
  vat DECIMAL(12,2) DEFAULT 0,
  discount_type VARCHAR(20) DEFAULT 'none' CHECK (discount_type IN ('none', 'senior', 'pwd', 'other')),
  discount_amount DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'card', 'gcash', 'maya')),
  payment_amount DECIMAL(12,2) DEFAULT 0,
  change_amount DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'voided')),
  voided_by UUID REFERENCES users(id),
  void_reason TEXT,
  voided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sale Items
CREATE TABLE IF NOT EXISTS sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  batch_id UUID REFERENCES product_batches(id),
  quantity DECIMAL(12,2) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  cost DECIMAL(12,2) DEFAULT 0,
  discount DECIMAL(12,2) DEFAULT 0,
  subtotal DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  payment_method VARCHAR(20) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  reference VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Void Transactions
CREATE TABLE IF NOT EXISTS void_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id),
  voided_by UUID NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  entity VARCHAR(50) NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL DEFAULT 'info',
  title VARCHAR(200) NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings (key-value store)
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) NOT NULL UNIQUE,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_product_batches_product ON product_batches(product_id);
CREATE INDEX idx_product_batches_expiry ON product_batches(expiration_date);
CREATE INDEX idx_receiving_number ON receiving(receiving_number);
CREATE INDEX idx_receiving_supplier ON receiving(supplier_id);
CREATE INDEX idx_sales_receipt ON sales(receipt_number);
CREATE INDEX idx_sales_cashier ON sales(cashier_id);
CREATE INDEX idx_sales_created ON sales(created_at);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity, entity_id);
CREATE INDEX idx_inventory_logs_product ON inventory_logs(product_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Increment stock
CREATE OR REPLACE FUNCTION increment_stock(p_product_id UUID, p_quantity DECIMAL)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET current_stock = COALESCE(current_stock, 0) + p_quantity,
      updated_at = NOW()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- Decrement stock
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id UUID, p_quantity DECIMAL)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET current_stock = GREATEST(COALESCE(current_stock, 0) - p_quantity, 0),
      updated_at = NOW()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;

-- Get low stock items
CREATE OR REPLACE FUNCTION get_low_stock_items()
RETURNS TABLE (
  id UUID,
  name VARCHAR(200),
  current_stock DECIMAL,
  min_stock DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.current_stock, p.min_stock
  FROM products p
  WHERE p.is_active = TRUE
    AND p.current_stock <= p.min_stock
  ORDER BY p.current_stock ASC;
END;
$$ LANGUAGE plpgsql;

-- Get daily sales summary
CREATE OR REPLACE FUNCTION get_daily_sales(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  total_sales DECIMAL,
  transaction_count BIGINT,
  average_sale DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(s.total), 0) as total_sales,
    COUNT(*)::BIGINT as transaction_count,
    COALESCE(AVG(s.total), 0) as average_sale
  FROM sales s
  WHERE DATE(s.created_at) = p_date
    AND s.status = 'completed';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE receiving ENABLE ROW LEVEL SECURITY;
ALTER TABLE receiving_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can create users"
  ON users FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin');

-- Products policies
CREATE POLICY "All authenticated users can view products"
  ON products FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- Categories policies
CREATE POLICY "All authenticated users can view categories"
  ON categories FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- Suppliers policies
CREATE POLICY "All authenticated users can view suppliers"
  ON suppliers FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage suppliers"
  ON suppliers FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- Sales policies
CREATE POLICY "Users can view own sales"
  ON sales FOR SELECT
  USING (auth.uid() = cashier_id OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Users can create sales"
  ON sales FOR INSERT
  WITH CHECK (auth.uid() = cashier_id);

-- Audit logs policies
CREATE POLICY "Only admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (auth.jwt() ->> 'role' = 'admin');

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Log product updates
CREATE OR REPLACE FUNCTION log_product_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.current_stock IS DISTINCT FROM NEW.current_stock THEN
    INSERT INTO inventory_logs (product_id, type, quantity, reference, created_by)
    VALUES (
      NEW.id,
      CASE WHEN NEW.current_stock > OLD.current_stock THEN 'IN' ELSE 'OUT' END,
      ABS(NEW.current_stock - OLD.current_stock),
      'SYSTEM_ADJUSTMENT',
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_product_changes
  AFTER UPDATE ON products
  FOR EACH ROW
  WHEN (OLD.current_stock IS DISTINCT FROM NEW.current_stock)
  EXECUTE FUNCTION log_product_changes();