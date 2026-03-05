import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://localhost:3029',
            changeOrigin: true,
            secure: false,
            configure: (proxy, _options) => {
              proxy.on('error', (err, _req, _res) => {
                console.log('[Proxy Error]', err);
              });
              proxy.on('proxyReq', (proxyReq, req, _res) => {
                console.log('[Proxy Request]', req.method, req.url, '→', 'http://localhost:3029' + req.url);
              });
              proxy.on('proxyRes', (proxyRes, req, _res) => {
                console.log('[Proxy Response]', proxyRes.statusCode, req.url);
              });
            },
          },
          '/socket.io': {
            target: 'http://localhost:3029',
            changeOrigin: true,
            ws: true,
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
