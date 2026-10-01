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
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/agent': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://localhost:3001',
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