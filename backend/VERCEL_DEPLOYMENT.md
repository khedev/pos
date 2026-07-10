# PGPOS Backend - Vercel Serverless Deployment Guide

## Overview

This document explains how to deploy the PGPOS backend as Vercel Serverless Functions, eliminating the need for Render, Railway, or any other backend hosting service.

## Deployment Steps

### 1. Create a Vercel Project for the Backend

1. Go to [Vercel Dashboard](https://vercel.com) and click **Add New > Project**
2. Import your Git repository
3. Set the **Root Directory** to `backend`
4. Vercel will auto-detect the `vercel.json` configuration

### 2. Configure Environment Variables

In the Vercel project settings, add the following environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | `https://your-project.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase anon/public key | `sb_publishable_...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `sb_secret_...` |
| `JWT_SECRET` | JWT signing secret | `your-jwt-secret` |
| `JWT_EXPIRES_IN` | JWT expiration | `24h` |
| `JWT_REFRESH_SECRET` | JWT refresh secret | `your-refresh-secret` |
| `JWT_REFRESH_EXPIRES_IN` | JWT refresh expiration | `7d` |
| `CORS_ORIGIN` | Frontend URL(s) | `https://pos-pg-virid.vercel.app` |
| `NODE_ENV` | Environment | `production` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` |
| `RATE_LIMIT_MAX` | Max requests per window | `100` |

### 3. Deploy

Vercel will automatically deploy when you push to your repository.

### 4. Update Frontend

In the frontend Vercel project, set:
```
VITE_API_URL=https://your-backend-project.vercel.app/api
```

## Project Structure (After Refactor)

```
backend/
├── api/
│   └── index.js              # Vercel serverless entry point
├── src/
│   ├── app.js                # Express app (middleware + routes, no listen())
│   ├── server.js             # Local dev server (contains app.listen())
│   ├── config/
│   │   ├── env.js            # Environment configuration
│   │   └── supabase.js       # Supabase client
│   ├── controllers/          # Route handlers
│   ├── middleware/            # Express middleware
│   ├── routes/               # Express route definitions
│   ├── sockets/              # Socket.IO (not supported on Vercel)
│   └── utils/                # Utility functions
├── uploads/                  # Local uploads directory (dev only)
├── .env                      # Local environment variables
├── vercel.json               # Vercel configuration
└── package.json
```

## Limitations & Incompatibilities with Vercel Serverless

### 1. WebSocket / Socket.IO ❌ NOT SUPPORTED

Vercel Serverless Functions are stateless and short-lived. **Socket.IO and WebSocket connections are not supported.** The `backend/src/sockets/index.js` file is defined but **not imported anywhere** in the current codebase, so this does not affect functionality.

If real-time features are needed in the future, consider:
- **Supabase Realtime** (built-in, uses PostgreSQL replication)
- **Pusher** or **Ably** (third-party WebSocket services)
- **Vercel Edge Functions** with WebSocket support (limited)

### 2. Ephemeral File System ⚠️ LIMITED

Vercel Serverless Functions have an **ephemeral filesystem** — files written to disk are temporary and will be lost after the function completes.

**Impact on uploads:**
- File uploads via multer will work **within a single request** (e.g., importing an Excel file, processing it, and returning results)
- Uploaded files will **NOT persist** across requests
- The `/uploads` static file serving will only work for files uploaded in the same function invocation

**Recommended solution for production:**
- Use **Supabase Storage** for permanent file storage
- Upload files directly from the frontend to Supabase Storage
- Store only the file URL/ID in the database

### 3. Request Timeout ⏱️ 30 seconds

Vercel Serverless Functions have a maximum execution time of:
- **30 seconds** on the Pro plan (configurable up to 900s)
- **10 seconds** on the Hobby plan

Long-running operations (large Excel exports, PDF generation for many records) may time out. The `vercel.json` configures `maxDuration: 30` for the API function.

### 4. Cold Starts ❄️

Serverless functions may experience cold starts (1-3 seconds) after periods of inactivity. This is normal for serverless architectures.

### 5. Memory Limit 💾 512 MB

The function is configured with 512 MB memory in `vercel.json`. This can be increased up to 3008 MB on paid plans.

### 6. No `app.listen()` in Serverless

The `api/index.js` file exports the Express app directly — it does **not** call `app.listen()`. Vercel handles the serverless invocation automatically. The `server.js` file still contains `app.listen()` for local development only.

## Local Development

The following commands continue to work as before:

```bash
# From the backend directory
npm start       # Start production server on port 5001
npm run dev     # Start dev server with hot reload
npm run seed    # Run database seeder
```

```bash
# From the root directory (monorepo)
pnpm run dev:backend   # Start backend only
pnpm run dev           # Start both frontend and backend
```

## Files Modified/Added

| File | Action | Description |
|------|--------|-------------|
| `backend/api/index.js` | **NEW** | Vercel serverless entry point |
| `backend/vercel.json` | **NEW** | Vercel deployment configuration |
| `backend/VERCEL_DEPLOYMENT.md` | **NEW** | This deployment guide |
| `backend/src/app.js` | **MODIFIED** | Added Vercel-aware uploads path, `__dirname` import |
| `backend/src/config/env.js` | **MODIFIED** | Removed hardcoded localhost CORS fallbacks, production-aware defaults |
| `backend/src/middleware/upload.js` | **MODIFIED** | Uses `/tmp` on Vercel, local `uploads/` directory otherwise |
| `backend/.env` | **MODIFIED** | Updated comments for Vercel deployment |
| `backend/package.json` | **MODIFIED** | Added `vercel-build` script |
| `frontend/.env` | **MODIFIED** | Added production VITE_API_URL comment |