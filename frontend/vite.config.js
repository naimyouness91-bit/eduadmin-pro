import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget = env.VITE_DEV_API_PROXY || 'http://127.0.0.1:8888';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (
                id.includes('react') ||
                id.includes('react-dom') ||
                id.includes('react-router-dom')
              ) {
                return 'vendor';
              }
              if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
                return 'charts';
              }
              if (
                id.includes('@fortawesome') ||
                id.includes('fontawesome')
              ) {
                return 'icons';
              }
              if (id.includes('zustand')) {
                return 'store';
              }
            }
          },
        },
      },
    },
  };
});
