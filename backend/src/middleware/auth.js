import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { getPermissionsForRole } from '../utils/permissions.js';

const PLACEHOLDER_HASH = '$2a$12$LJ3m4ys3Lk0TSwHnbfOMiOXPm1Qlq5Gz0Yq0Z0Yq0Z0Yq0Z0Yq0O';

const getUserProfile = async (userId, email) => {
  // Use the service-role client so RLS on `users` doesn't block the lookup.
  const db = supabaseAdmin;

  // First try to get from public.users table by id
  const { data: dbUser } = await db
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (dbUser) {
    return {
      ...dbUser,
      permissions: await getPermissionsForRole(supabase, dbUser.role),
    };
  }

  // The auth id may differ from public.users.id; match by email instead
  if (email) {
    const { data: dbUserByEmail } = await db
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (dbUserByEmail) {
      return {
        ...dbUserByEmail,
        permissions: await getPermissionsForRole(supabase, dbUserByEmail.role),
      };
    }
  }

  // Fallback: get from auth user metadata and ensure a public.users row exists
  // (keyed by the auth id) so foreign-key references in sales/receiving resolve.
  try {
    const { data: { user: authUser } } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authUser?.user_metadata || authUser?.email) {
      const role = authUser.user_metadata?.role || 'cashier';
      await supabaseAdmin.from('users').upsert({
        id: authUser.id,
        name: authUser.user_metadata?.name || email?.split('@')[0] || authUser.email,
        email: authUser.email,
        role,
        is_active: true,
        password_hash: PLACEHOLDER_HASH,
      }, { onConflict: 'id' });

      return {
        id: authUser.id,
        name: authUser.user_metadata?.name || email?.split('@')[0] || authUser.email,
        email: authUser.email,
        role,
        is_active: true,
        permissions: await getPermissionsForRole(supabase, role),
      };
    }
  } catch (e) {
    // Admin API might not be available
  }

  return null;
};

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    // Verify JWT
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Get user profile (from public.users or auth metadata)
    const user = await getUserProfile(decoded.userId, decoded.email);

    if (!user) {
      return res.status(401).json({ message: 'Invalid token. User not found.' });
    }

    if (user.is_active === false) {
      return res.status(403).json({ message: 'Account is deactivated.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired.' });
    }
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await getUserProfile(decoded.userId, decoded.email);
      if (user) req.user = user;
    }
  } catch (error) {
    // Ignore auth errors for optional auth
  }
  next();
};
