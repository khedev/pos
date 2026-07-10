/**
 * Vercel Serverless Entry Point
 *
 * This file is the entry point for Vercel Serverless Functions.
 * It wraps the Express app with serverless-http for proper
 * serverless request/response handling.
 *
 * No app.listen() here — Vercel handles invocation automatically.
 */
import serverless from 'serverless-http';
import app from '../src/app.js';

export const handler = serverless(app);