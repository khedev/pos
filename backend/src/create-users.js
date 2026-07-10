import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import config from './config/env.js';

const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const users = [
  {
    name: 'System Admin',
    email: 'admin@pgpos.com',
    password: 'admin123',
    role: 'admin',
  },
  {
    name: 'Cashier User',
    email: 'cashier@pgpos.com',
    password: 'admin123',
    role: 'cashier',
  },
  {
    name: 'CSR User',
    email: 'csr@pgpos.com',
    password: 'admin123',
    role: 'csr',
  },
];

const runSQL = async (sql) => {
  try {
    // Use Supabase REST API to run raw SQL
    const response = await fetch(
      `${config.supabase.url}/rest/v1/rpc/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.supabase.serviceRoleKey,
          'Authorization': `Bearer ${config.supabase.serviceRoleKey}`,
        },
        body: JSON.stringify({ sql }),
      }
    );
    return { data: await response.json(), error: response.ok ? null : { message: `HTTP ${response.status}` } };
  } catch (error) {
    return { data: null, error };
  }
};

const createUsers = async () => {
  console.log('🚀 Creating users in Supabase...\n');

  // Step 1: Create the users table via REST API
  console.log('📦 Step 1: Creating users table...');
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS public.users (
      id UUID PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin', 'cashier', 'csr')),
      is_active BOOLEAN DEFAULT TRUE,
      avatar_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  `;

  try {
    // Try creating table via direct Supabase table creation approach
    const { error: tableError } = await supabaseAdmin.rpc('exec_sql', {
      query_text: createTableSQL,
    });
    
    if (tableError) {
      console.log('⚠️  exec_sql not available, trying direct insert...');
    } else {
      console.log('✅ Users table ready');
    }
  } catch (e) {
    console.log('⚠️  RPC not available, proceeding with direct operations...');
  }

  // Step 2: Create auth users and insert into users table
  console.log('\n📦 Step 2: Creating user accounts...\n');

  let createdCount = 0;

  for (const user of users) {
    try {
      // Check if auth user already exists
      let authUserId = null;
      try {
        const { data: existingAuth } = await supabaseAdmin.auth.admin.getUserByEmail(user.email);
        if (existingAuth?.user) {
          authUserId = existingAuth.user.id;
          console.log(`✅ Auth user exists: ${user.email}`);
        }
      } catch (e) {
        // getUserByEmail might not be available in all SDK versions
      }

      if (!authUserId) {
        // Create user in Supabase Auth
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            name: user.name,
            role: user.role,
          },
        });

        if (authError) {
          console.error(`❌ Auth error for ${user.email}: ${authError.message}`);
          continue;
        }
        authUserId = authUser.user.id;
        console.log(`✅ Auth user created: ${user.email}`);
      }

      // Hash password for our users table
      const password_hash = await bcrypt.hash(user.password, 12);

      // Try inserting into users table
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: authUserId,
          name: user.name,
          email: user.email,
          password_hash,
          role: user.role,
          is_active: true,
        }, { onConflict: 'email' });

      if (insertError) {
        console.log(`⚠️  Insert via API failed: ${insertError.message}`);
        console.log('   Trying direct SQL insert...');
        
        // Fallback: Insert via pg_dump or direct SQL
        try {
          const sql = `
            INSERT INTO public.users (id, name, email, password_hash, role, is_active)
            VALUES (
              '${authUserId}'::uuid,
              '${user.name.replace(/'/g, "''")}',
              '${user.email}',
              '${password_hash}',
              '${user.role}',
              true
            )
            ON CONFLICT (email) DO UPDATE SET
              name = EXCLUDED.name,
              role = EXCLUDED.role,
              password_hash = EXCLUDED.password_hash,
              is_active = true;
          `;
          
          const { error: sqlError } = await supabaseAdmin.from('_sql').select('*').limit(0);
          
          if (sqlError) {
            // If table doesn't exist, try using the REST API directly
            const response = await fetch(
              `${config.supabase.url}/rest/v1/users`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': config.supabase.serviceRoleKey,
                  'Authorization': `Bearer ${config.supabase.serviceRoleKey}`,
                  'Prefer': 'resolution=merge-duplicates',
                },
                body: JSON.stringify({
                  id: authUserId,
                  name: user.name,
                  email: user.email,
                  password_hash,
                  role: user.role,
                  is_active: true,
                }),
              }
            );
            
            if (response.ok) {
              console.log(`✅ ${user.role.toUpperCase()} user saved: ${user.email}`);
              createdCount++;
              continue;
            } else {
              const text = await response.text();
              console.log(`   Raw insert response: ${text}`);
            }
          }
        } catch (fallbackError) {
          console.log(`   Fallback error: ${fallbackError.message}`);
        }
        
        console.log(`❌ Could not save to users table for ${user.email}`);
      } else {
        console.log(`✅ ${user.role.toUpperCase()} user saved: ${user.email}`);
        createdCount++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${user.email}: ${error.message}`);
    }
  }

  console.log(`\n🎉 Done! ${createdCount}/${users.length} users saved.`);
  console.log('\n📋 Login Credentials:');
  console.log('   Admin:  admin@pgpos.com / admin123');
  console.log('   Cashier: cashier@pgpos.com / admin123');
  console.log('   CSR:    csr@pgpos.com / admin123');
  console.log('\n⚠️  If users were not saved to the public.users table, please run:');
  console.log('   1. Go to Supabase SQL Editor: https://supabase.com/dashboard/project/lfhwbbmomdchhvofrbsr/sql/new');
  console.log('   2. Copy and paste the entire contents of database/schema.sql');
  console.log('   3. Click "Run"');
  console.log('   4. Then run this script again: node src/create-users.js');
};

createUsers();