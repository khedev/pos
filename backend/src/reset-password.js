import { createClient } from '@supabase/supabase-js';
import config from './config/env.js';
import bcrypt from 'bcryptjs';

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

const resetPassword = async () => {
  try {
    // 1. Update password in Supabase Auth
    const email = 'admin@pgpos.com';
    const newPassword = 'admin123';

    // Find the user by email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError.message);
      return;
    }

    const user = users.find(u => u.email === email);
    if (!user) {
      console.error(`User ${email} not found in Auth`);
      return;
    }

    // Update password in Auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Error updating Auth password:', updateError.message);
      return;
    }
    console.log(`✅ Auth password updated for ${email}`);

    // 2. Update password hash in public.users table
    const password_hash = await bcrypt.hash(newPassword, 12);
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .update({ password_hash, updated_at: new Date().toISOString() })
      .eq('email', email);

    if (dbError) {
      console.log(`⚠️ Could not update users table: ${dbError.message}`);
    } else {
      console.log(`✅ Database password hash updated for ${email}`);
    }

    console.log('\n🎉 Password reset complete!');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
};

resetPassword();