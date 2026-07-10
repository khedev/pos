import { createClient } from '@supabase/supabase-js';
import config from './env.js';

const supabaseUrl = config.supabase.url;
const supabaseAnonKey = config.supabase.anonKey;
const supabaseServiceKey = config.supabase.serviceRoleKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env'
  );
}

// Public client (uses anon key with RLS)
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Admin client (uses service role key, bypasses RLS)
export const supabaseAdmin = createClient(
  supabaseUrl || '',
  supabaseServiceKey || ''
);

export default supabase;