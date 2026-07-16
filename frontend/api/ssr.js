/**
 * Vercel Serverless Function for SSR.
 * Handles all incoming requests and renders the React app on the server.
 *
 * Architecture:
 * 1. Request comes in → Vercel edge → this serverless function
 * 2. Parse cookies for auth state
 * 3. Call the SSR render function (entry-server.jsx)
 * 4. Inject dehydrated query state and auth state into HTML
 * 5. Return fully rendered HTML to the client
 *
 * This function runs on Vercel's Node.js runtime (Serverless Functions).
 * For maximum performance, consider using Edge Functions for static routes.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In production, the SSR build output is at frontend/dist/server/entry-server.js
// In development, we use the Vite dev server
let render;
let template;

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

async function loadProductionBuild() {
  // Load the server entry point
  const serverEntryPath = path.resolve(__dirname, '../dist/server/entry-server.js');
  const serverEntry = await import(serverEntryPath);
  render = serverEntry.render;

  // Load the HTML template
  template = fs.readFileSync(
    path.resolve(__dirname, '../dist/client/index.html'),
    'utf-8'
  );
}

async function loadDevServer() {
  // In development, we use Vite's SSR middleware
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  // Load the server entry point via Vite
  const serverEntry = await vite.ssrLoadModule('/src/entry-server.jsx');
  render = serverEntry.render;

  // Read the index.html template
  template = fs.readFileSync(
    path.resolve(__dirname, '../index.html'),
    'utf-8'
  );

  return vite;
}

/**
 * Parse cookies from the request header.
 * @param {string} cookieHeader - The Cookie header value
 * @returns {Object} Parsed cookies
 */
function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, cookie) => {
    const [key, ...val] = cookie.trim().split('=');
    if (key) {
      acc[key.trim()] = decodeURIComponent(val.join('='));
    }
    return acc;
  }, {});
}

/**
 * Inject serialized state into the HTML template.
 * Replaces placeholders with actual data.
 */
function injectStateIntoHTML(html, { queryState, auth, renderedHtml }) {
  // Serialize state
  const queryStateScript = queryState
    ? `<script>window.__INITIAL_QUERY_STATE__ = ${JSON.stringify(queryState).replace(/</g, '\\u003c')}</script>`
    : '';

  const authStateScript = auth
    ? `<script>window.__INITIAL_AUTH_STATE__ = ${JSON.stringify(auth).replace(/</g, '\\u003c')}</script>`
    : '';

  // Replace SSR content placeholder
  let result = html.replace('<!--ssr-outlet-->', renderedHtml);

  // Inject state scripts before the closing body tag
  result = result.replace('</body>', `${queryStateScript}${authStateScript}</body>`);

  return result;
}

/**
 * Main request handler for Vercel Serverless Function.
 */
export default async function handler(req, res) {
  try {
    const url = req.url;

    // Skip API routes — they're handled by the backend
    if (url.startsWith('/api/')) {
      res.status(404).json({ error: 'API routes are handled by the backend' });
      return;
    }

    // Skip static assets
    if (url.startsWith('/assets/') || url.match(/\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|avif|ico)$/)) {
      res.status(404).json({ error: 'Static assets are served directly' });
      return;
    }

    // Load the render function and template
    if (!render) {
      if (isProduction) {
        await loadProductionBuild();
      } else {
        await loadDevServer();
      }
    }

    // Parse cookies for auth
    const cookies = parseCookies(req.headers.cookie);

    // Render the app
    const { html: renderedHtml, queryState, auth } = await render(url, { cookies });

    // Inject state into HTML template
    const finalHtml = injectStateIntoHTML(template, {
      queryState,
      auth,
      renderedHtml,
    });

    // Set caching headers based on route
    const pathname = new URL(url, 'http://localhost').pathname;
    if (pathname === '/login' || pathname.startsWith('/forgot-password') || pathname.startsWith('/reset-password')) {
      // Static pages — cache for 1 hour on CDN
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    } else if (auth?.isAuthenticated) {
      // Authenticated pages — don't cache on CDN (private data)
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    } else {
      // Public pages — cache briefly
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
    }

    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Send the rendered HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(finalHtml);
  } catch (error) {
    console.error('SSR Error:', error);

    // Fallback: serve the client-side app (CSR fallback)
    try {
      const fallbackHtml = fs.readFileSync(
        path.resolve(__dirname, '../dist/client/index.html'),
        'utf-8'
      );
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(fallbackHtml);
    } catch {
      res.status(500).send('Internal Server Error');
    }
  }
}