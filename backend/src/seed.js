import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import config from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const executeSQL = async (supabase, sql) => {
  // Try exec_sql RPC first
  const { error } = await supabase.rpc('exec_sql', { sql });
  if (!error) return { error: null };
  
  // If RPC fails, try splitting into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  let lastError = null;
  for (const stmt of statements) {
    const { error: stmtError } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
    if (stmtError) {
      lastError = stmtError;
    }
  }
  
  return { error: lastError };
};

const runSeed = async () => {
  console.log('🌱 Starting database seed...');

  if (!config.supabase.url || !config.supabase.serviceRoleKey) {
    console.error('❌ Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }

  const supabase = createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey
  );

  try {
    // Read and execute schema
    console.log('📦 Running schema...');
    const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      const { error: schemaError } = await executeSQL(supabase, schema);
      if (schemaError) {
        console.log('⚠️  Schema may already exist or RPC not available. Proceeding with seed...');
      } else {
        console.log('✅ Schema applied successfully');
      }
    } else {
      console.log('⚠️  Schema file not found, skipping...');
    }

    // Read and execute seed
    console.log('🌱 Running seed data...');
    const seedPath = path.resolve(__dirname, '../../database/seed.sql');
    if (fs.existsSync(seedPath)) {
      const seed = fs.readFileSync(seedPath, 'utf8');
      const { error: seedError } = await executeSQL(supabase, seed);
      if (seedError) {
        console.error('❌ Seed error:', seedError.message);
      } else {
        console.log('✅ Seed data inserted successfully');
      }
    } else {
      console.log('⚠️  Seed file not found, skipping...');
    }

    console.log('🎉 Database seed completed!');
    console.log('');
    console.log('Default credentials:');
    console.log('  Admin:  admin@pgpos.com / admin123');
    console.log('  Cashier: cashier@pgpos.com / admin123');
    console.log('  CSR:    csr@pgpos.com / admin123');
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
};

runSeed();
