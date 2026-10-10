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
        target: 'https://pra-pdf.praverse-auth.workers.dev',
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
  test: {
    include: [
      'tests/worker_cf_prototype.test.ts',
      'tests/first_6_services.test.ts',
      'tests/ui_routes.test.ts',
      'tests/wave1_services.test.ts',
      'tests/wave2_services.test.ts',
      'tests/wave3_services.test.ts',
      'tests/wave4_services.test.ts',
      'tests/suite.test.ts',
    ],
    testTimeout: 20000,
  },
}));