import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      watch: {
        ignored: ['**/backend/**', '**/backend/data/**', '**/supabase/**'],
      },
      proxy: {
        '/api': {
          target: process.env.VITE_BACKEND_URL || 'http://localhost:3005',
          changeOrigin: true,
        },
        '/agent': {
          target: process.env.VITE_BACKEND_URL || 'http://localhost:3005',
          changeOrigin: true,
        },
        '/socket.io': {
          target: process.env.VITE_BACKEND_URL || 'http://localhost:3005',
          ws: true,
        },
      },
    },

    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        // Evita warning de chunk grande do react-pdf
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'recharts': ['recharts'],
            'react-pdf': ['@react-pdf/renderer'],
          },
        },
      },
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY),
      // @react-pdf/renderer usa process.env internamente
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    optimizeDeps: {
      include: ['@react-pdf/renderer'],
    },
  };
});