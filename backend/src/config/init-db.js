/**
 * Database initialization script
 * Run this to create all tables in Supabase
 * Usage: node src/config/init-db.js
 */
import { supabaseAdmin } from './supabase.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  console.log('Initializing database...');

  const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
  const seedPath = path.resolve(__dirname, '../../database/seed.sql');

  // Read schema
  let schema = '';
  try {
    schema = fs.readFileSync(schemaPath, 'utf8');
    console.log('Schema file loaded successfully');
  } catch (err) {
    console.error('Failed to read schema.sql:', err.message);
    console.log('Attempting inline table creation...');
  }

  if (!schema) {
    // Inline minimal schema if file can't be read
    schema = `
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      
      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS permissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(role_id, permission)
      );

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin', 'manager', 'cashier', 'csr')),
        is_active BOOLEAN DEFAULT TRUE,
        avatar_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

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

      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        payment_method VARCHAR(20) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        reference VARCHAR(100),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS void_transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sale_id UUID NOT NULL REFERENCES sales(id),
        voided_by UUID NOT NULL REFERENCES users(id),
        reason TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

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

      CREATE TABLE IF NOT EXISTS settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        key VARCHAR(100) NOT NULL UNIQUE,
        value JSONB,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
      CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_product_batches_product ON product_batches(product_id);
      CREATE INDEX IF NOT EXISTS idx_product_batches_expiry ON product_batches(expiration_date);
      CREATE INDEX IF NOT EXISTS idx_sales_receipt ON sales(receipt_number);
      CREATE INDEX IF NOT EXISTS idx_sales_cashier ON sales(cashier_id);
      CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_logs_product ON inventory_logs(product_id);
    `;
  }

  try {
    // Execute schema using Supabase REST API
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql: schema });
    
    if (error) {
      // If RPC fails, try using the REST API directly
      console.log('RPC method failed, trying direct SQL execution...');
      
      // Split by statements and execute individually
      const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      let successCount = 0;
      let failCount = 0;

      for (const statement of statements) {
        const { error: stmtError } = await supabaseAdmin.rpc('exec_sql', { sql: statement + ';' });
        if (stmtError) {
          failCount++;
        } else {
          successCount++;
        }
      }

      console.log(`Tables created: ${successCount}, Failed: ${failCount}`);
    } else {
      console.log('Schema executed successfully!');
    }

    // Seed data
    try {
      const seedData = fs.readFileSync(seedPath, 'utf8');
      const seedStatements = seedData
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const stmt of seedStatements) {
        await supabaseAdmin.rpc('exec_sql', { sql: stmt + ';' }).catch(() => {});
      }
      console.log('Seed data inserted');
    } catch (err) {
      console.log('Seed file not found, skipping');
    }

    console.log('Database initialization complete!');
  } catch (err) {
    console.error('Database initialization error:', err.message);
    console.log('\nPlease run the schema.sql manually in your Supabase SQL editor.');
    console.log('File location: database/schema.sql');
  }
}

initDatabase();