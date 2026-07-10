import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { supabase, supabaseAdmin } from '../config/supabase.js';
import { getPermissionsForRole } from '../utils/permissions.js';

const generateToken = (user) => {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { userId: user.id },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
};

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
  } catch (error) {
    // Admin API might not be available
  }

  return null;
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Use Supabase Auth to sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (authError) {
      console.error('Supabase auth error:', authError.message);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!authData.user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Get user profile (from public.users table or auth metadata)
    const userProfile = await getUserProfile(authData.user.id, email);

    if (!userProfile) {
      return res.status(500).json({ message: 'User profile not found' });
    }

    // Generate tokens
    const token = generateToken(userProfile);
    const refreshToken = generateRefreshToken(userProfile);

    // Log audit (try, but don't fail if audit_logs table doesn't exist)
    try {
      await supabase.from('audit_logs').insert({
        user_id: authData.user.id,
        action: 'LOGIN',
        entity: 'users',
        entity_id: authData.user.id,
        details: { ip: req.ip },
      });
    } catch (auditError) {
      // Audit table might not exist yet, ignore
    }

    res.json({
      token,
      refreshToken,
      user: {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
        role: userProfile.role,
        permissions: userProfile.permissions || [],
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    // Sign out from Supabase Auth
    await supabase.auth.signOut();

    if (req.user) {
      try {
        await supabase.from('audit_logs').insert({
          user_id: req.user.id,
          action: 'LOGOUT',
          entity: 'users',
          entity_id: req.user.id,
          details: { ip: req.ip },
        });
      } catch (e) {
        // ignore
      }
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

export const me = async (req, res, next) => {
  try {
    const userProfile = await getUserProfile(req.user.id, req.user.email);

    if (!userProfile) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: userProfile.id,
      name: userProfile.name,
      email: userProfile.email,
      role: userProfile.role,
      permissions: userProfile.permissions || [],
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Use Supabase Auth's built-in password reset
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${config.cors.origin}/reset-password`,
    });

    if (error) {
      console.error('Password reset error:', error);
    }

    // Always return success to prevent email enumeration
    res.json({ message: 'If the email exists, a reset link has been sent.' });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { accessToken, password } = req.body;

    if (!accessToken) {
      return res.status(400).json({ message: 'Reset token is required' });
    }

    if (!password) {
      return res.status(400).json({ message: 'New password is required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    const { data: userData, error: tokenError } = await supabase.auth.getUser(accessToken);

    if (tokenError || !userData.user) {
      return res.status(401).json({ message: 'Invalid or expired reset token' });
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userData.user.id, {
      password,
    });

    if (error) {
      return res.status(400).json({ message: error.message });
    }

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.refreshSecret);
    } catch (error) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const userProfile = await getUserProfile(decoded.userId, decoded.email);

    if (!userProfile) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (userProfile.is_active === false) {
      return res.status(403).json({ message: 'Account is deactivated.' });
    }

    const newToken = generateToken(userProfile);
    const newRefreshToken = generateRefreshToken(userProfile);

    res.json({
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    next(error);
  }
};
