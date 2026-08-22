import path  from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    // Raise warning threshold slightly for the checkout page
    chunkSizeWarningLimit: 600,
  },

  // Pre-bundle these for faster dev server cold starts
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
