/**
 * Vercel Serverless Entry Point
 *
 * Express app exported directly for Vercel's serverless runtime.
 * Vercel handles Express natively — no need for serverless-http wrapper.
 *
 * No app.listen() here — Vercel handles invocation automatically.
 */
import app from '../src/app.js';

export default app;