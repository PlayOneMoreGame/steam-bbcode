import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  // Tauri expects a fixed port
  server: {
    port: 3000,
    strictPort: true,
    open: !process.env.TAURI_PLATFORM, // Don't open browser when running in Tauri
  },
  // Tauri uses this for production builds
  build: {
    outDir: 'dist',
    sourcemap: true,
    // Tauri supports ES2021
    target: process.env.TAURI_PLATFORM ? 'es2021' : 'modules',
    // Reduce chunk warnings
    chunkSizeWarningLimit: 1000,
  },
  // Prevent Vite from clearing terminal with Tauri output
  clearScreen: false,
});
