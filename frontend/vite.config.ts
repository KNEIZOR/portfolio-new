import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, '..', 'VITE_');
  const apiProxy = environment.VITE_API_PROXY || 'http://localhost:4000';
  return {
    envDir: '..',
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      proxy: {
        '/api': { target: apiProxy, changeOrigin: true },
        '/uploads': { target: apiProxy, changeOrigin: true },
      },
    },
    build: { target: 'es2022', sourcemap: false, assetsInlineLimit: 4096 },
  };
});
