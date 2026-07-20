import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ command, mode, isSsrBuild }) => {
  return {
    plugins: [
      react(),
      visualizer({
        filename: 'dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
      }),
    ],
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    build: {
      outDir: isSsrBuild ? 'dist/server' : 'dist/client',
      target: 'es2020',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      // Only apply manualChunks for client build, not SSR
      rollupOptions: isSsrBuild ? undefined : {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'query-vendor': [
              '@tanstack/react-query',
              '@tanstack/react-query-persist-client',
              '@tanstack/query-sync-storage-persister',
            ],
            'ui-vendor': [
              'lucide-react',
              'react-hot-toast',
              'react-hook-form',
              'zod',
              'date-fns',
            ],
            'chart-vendor': ['recharts'],
            'table-vendor': ['@tanstack/react-table', '@tanstack/react-virtual'],
          },
        },
      },
      chunkSizeWarningLimit: 500,
      sourcemap: false,
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:5001',
          changeOrigin: true,
        },
      },
    },
    // SSR Configuration
    ssr: {
      // Externalize Node.js-compatible packages
      external: [
        'react',
        'react-dom',
      ],
      // Inline ESM-only packages that need bundling
      noExternal: [
        'react-router-dom',
        '@tanstack/react-query',
        '@tanstack/react-query-persist-client',
        '@tanstack/query-sync-storage-persister',
        'zustand',
        'react-hook-form',
        'react-hot-toast',
      ],
    },
  };
});