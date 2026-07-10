import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file only if it exists (for local development)
// On Vercel, environment variables are provided by the platform
const envPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

export const config = {
  port: parseInt(process.env.PORT, 10) || 5001,
  nodeEnv: process.env.NODE_ENV || 'development',

  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
      : (process.env.NODE_ENV === 'production'
          ? ['https://pos-pg-virid.vercel.app']
          : ['http://localhost:5173', 'http://localhost:4173']),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },
};

export default config;