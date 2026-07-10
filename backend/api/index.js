/**
 * Vercel Serverless Entry Point
 * 
 * This file is the entry point for Vercel Serverless Functions.
 * It exports the Express app directly — no app.listen() here.
 * 
 * Vercel will handle the serverless invocation automatically.
 */
import app from '../src/app.js';

export default app;