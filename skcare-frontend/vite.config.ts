import path   from 'path';
import react  from '@vitejs/plugin-react';
import { defineConfig, splitVendorChunkPlugin } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    // Automatically separates node_modules into a vendor chunk.
    // The vendor chunk is cached by the browser long-term because it only
    // changes when you update a dependency — not when you change your app code.
    splitVendorChunkPlugin(),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    // Raise the warning threshold slightly — our page chunks are intentionally
    // larger than Vite's default 500kb warning limit for the checkout page
    // (react-hook-form + flutterwave config).
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        // Manual chunk splitting strategy:
        // Group related dependencies together so they share a single cached chunk.
        manualChunks(id) {
          // React core — cached aggressively, almost never changes
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/')) {
            return 'react-core';
          }

          // React Router — separate from React core, changes less often
          if (id.includes('node_modules/react-router')) {
            return 'react-router';
          }

          // UI primitives — Radix, shadcn utilities
          if (id.includes('node_modules/@radix-ui') ||
              id.includes('node_modules/class-variance-authority') ||
              id.includes('node_modules/clsx') ||
              id.includes('node_modules/tailwind-merge')) {
            return 'ui-primitives';
          }

          // Form handling — only needed on checkout + admin pages
          if (id.includes('node_modules/react-hook-form')) {
            return 'forms';
          }

          // Carousel — only needed on landing page
          if (id.includes('node_modules/embla-carousel')) {
            return 'carousel';
          }

          // JWT decode — small, but logically separate
          if (id.includes('node_modules/jwt-decode')) {
            return 'auth-utils';
          }
        },
      },
    },
  },

  // Pre-bundle these dependencies for faster dev server startup.
  // Vite only needs to transform them once during dev, not on every page load.
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'react-hook-form',
      'jwt-decode',
      'axios',
    ],
  },
});
