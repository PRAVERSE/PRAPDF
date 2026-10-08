import { defineConfig } from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig(({ mode }) => ({
  plugins: [
    ...(mode !== 'test' && !process.env.VITEST && !process.env.NO_CF ? [cloudflare()] : []),
  ],
  root: '.',
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ['pdf-lib', 'jszip'],
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
  },
}));