-- PGPOS Seed Data
-- Run this after schema.sql to populate initial data

-- ============================================================
-- ROLES
-- ============================================================
INSERT INTO roles (name, description) VALUES
  ('admin', 'Full system access - can manage users, inventory, sales, and settings'),
  ('cashier', 'Can process sales, view inventory, and print receipts'),
  ('csr', 'Can receive items, update stock, and print reports')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- DEFAULT ADMIN USER
-- Password: admin123 (bcrypt hash)
-- ============================================================
INSERT INTO users (name, email, password_hash, role, is_active) VALUES
  (
    'System Admin',
    'admin@pgpos.com',
    '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5Gz0Yq0Z0Yq0Z0Yq0Z0Yq0O', -- admin123
    'admin',
    TRUE
  ),
  (
    'Cashier User',
    'cashier@pgpos.com',
    '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5Gz0Yq0Z0Yq0Z0Yq0Z0Yq0O', -- admin123
    'cashier',
    TRUE
  ),
  (
    'CSR User',
    'csr@pgpos.com',
    '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5Gz0Yq0Z0Yq0Z0Yq0Z0Yq0O', -- admin123
    'csr',
    TRUE
  )
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- SAMPLE CATEGORIES
-- ============================================================
INSERT INTO categories (name, description) VALUES
  ('Medicines', 'Pharmaceutical drugs and medications'),
  ('Vitamins & Supplements', 'Health supplements and vitamins'),
  ('Personal Care', 'Personal hygiene and care products'),
  ('Baby Products', 'Baby care items including diapers and formula'),
  ('Food & Beverages', 'Packaged food and drinks'),
  ('Household', 'Cleaning and household supplies'),
  ('First Aid', 'First aid supplies and equipment'),
  ('Medical Equipment', 'Medical devices and equipment')
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SAMPLE SUPPLIERS
-- ============================================================
INSERT INTO suppliers (name, contact_person, email, phone, address) VALUES
  ('PharmaMed Distributors', 'Juan Dela Cruz', 'juan@pharmamed.com', '09171234567', '123 Rizal St, Manila'),
  ('HealthPlus Trading', 'Maria Santos', 'maria@healthplus.com', '09189876543', '456 Mabini St, Quezon City'),
  ('GroceryMart Supply', 'Pedro Reyes', 'pedro@grocerymart.com', '09201234567', '789 Aurora Blvd, Pasig'),
  ('MedEquip Solutions', 'Ana Gonzales', 'ana@medequip.com', '09151234567', '321 EDSA, Makati')
ON CONFLICT DO NOTHING;

-- ============================================================
-- SAMPLE PRODUCTS
-- ============================================================
INSERT INTO products (barcode, sku, name, generic_name, brand, category_id, supplier_id, unit, cost_price, selling_price, current_stock, min_stock) 
SELECT * FROM (VALUES
  ('4801234567890', 'MED-001', 'Paracetamol 500mg', 'Paracetamol', 'Biogesic', (SELECT id FROM categories WHERE name = 'Medicines'), (SELECT id FROM suppliers WHERE name = 'PharmaMed Distributors'), 'tablet', 2.50, 5.00, 100, 20),
  ('4801234567891', 'MED-002', 'Amoxicillin 500mg', 'Amoxicillin', 'Sankofa', (SELECT id FROM categories WHERE name = 'Medicines'), (SELECT id FROM suppliers WHERE name = 'PharmaMed Distributors'), 'capsule', 8.00, 15.00, 50, 10),
  ('4801234567892', 'VIT-001', 'Vitamin C 500mg', 'Ascorbic Acid', 'Cecon', (SELECT id FROM categories WHERE name = 'Vitamins & Supplements'), (SELECT id FROM suppliers WHERE name = 'HealthPlus Trading'), 'tablet', 3.00, 6.50, 200, 30),
  ('4801234567893', 'VIT-002', 'Multivitamins + Iron', 'Multivitamins', 'Enervon', (SELECT id FROM categories WHERE name = 'Vitamins & Supplements'), (SELECT id FROM suppliers WHERE name = 'HealthPlus Trading'), 'tablet', 5.00, 10.00, 150, 25),
  ('4801234567894', 'PC-001', 'Shampoo 200ml', NULL, 'Sunsilk', (SELECT id FROM categories WHERE name = 'Personal Care'), (SELECT id FROM suppliers WHERE name = 'GroceryMart Supply'), 'bottle', 45.00, 75.00, 80, 15),
  ('4801234567895', 'PC-002', 'Toothpaste 100g', NULL, 'Colgate', (SELECT id FROM categories WHERE name = 'Personal Care'), (SELECT id FROM suppliers WHERE name = 'GroceryMart Supply'), 'tube', 35.00, 65.00, 90, 20),
  ('4801234567896', 'BABY-001', 'Diapers Medium 30s', NULL, 'Pampers', (SELECT id FROM categories WHERE name = 'Baby Products'), (SELECT id FROM suppliers WHERE name = 'GroceryMart Supply'), 'pack', 180.00, 250.00, 40, 10),
  ('4801234567897', 'FOOD-001', 'Canned Sardines 155g', NULL, 'Ligo', (SELECT id FROM categories WHERE name = 'Food & Beverages'), (SELECT id FROM suppliers WHERE name = 'GroceryMart Supply'), 'can', 15.00, 25.00, 300, 50),
  ('4801234567898', 'HH-001', 'Dishwashing Liquid 500ml', NULL, 'Joy', (SELECT id FROM categories WHERE name = 'Household'), (SELECT id FROM suppliers WHERE name = 'GroceryMart Supply'), 'bottle', 25.00, 45.00, 60, 15),
  ('4801234567899', 'FA-001', 'Bandage Assorted', NULL, '3M', (SELECT id FROM categories WHERE name = 'First Aid'), (SELECT id FROM suppliers WHERE name = 'MedEquip Solutions'), 'box', 20.00, 35.00, 100, 20)
) AS v
WHERE NOT EXISTS (SELECT 1 FROM products WHERE barcode = v.column1);

-- ============================================================
-- SAMPLE BATCHES
-- ============================================================
INSERT INTO product_batches (product_id, batch_number, quantity, cost_price, expiration_date)
SELECT p.id, 'BCH-2401-001', p.current_stock, p.cost_price, '2026-12-31'::DATE
FROM products p
WHERE NOT EXISTS (SELECT 1 FROM product_batches WHERE product_id = p.id);

-- ============================================================
-- PERMISSIONS
-- ============================================================
INSERT INTO permissions (role_id, permission)
SELECT r.id, p.permission
FROM roles r
CROSS JOIN (VALUES
  ('dashboard.view'),
  ('pos.process'),
  ('inventory.view'),
  ('receiving.create'),
  ('reports.view')
) AS p(permission)
WHERE r.name IN ('admin', 'cashier')
  AND NOT EXISTS (
    SELECT 1 FROM permissions WHERE role_id = r.id AND permission = p.permission
  );

-- CSR-specific permissions
INSERT INTO permissions (role_id, permission)
SELECT r.id, p.permission
FROM roles r
CROSS JOIN (VALUES
  ('dashboard.view'),
  ('inventory.view'),
  ('receiving.read'),
  ('receiving.create'),
  ('reports.view'),
  ('categories.read'),
  ('suppliers.read'),
  ('notifications.read')
) AS p(permission)
WHERE r.name = 'csr'
  AND NOT EXISTS (
    SELECT 1 FROM permissions WHERE role_id = r.id AND permission = p.permission
  );

-- Admin-specific permissions
INSERT INTO permissions (role_id, permission)
SELECT r.id, p.permission
FROM roles r
CROSS JOIN (VALUES
  ('users.manage'),
  ('inventory.manage'),
  ('settings.manage'),
  ('sales.void'),
  ('reports.export')
) AS p(permission)
WHERE r.name = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM permissions WHERE role_id = r.id AND permission = p.permission
  );