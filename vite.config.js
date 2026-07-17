import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// NIXXY runs as its own stack:
//   frontend (this Vite server / preview)  -> :9922
//   backend  (server/index.js, PORT in .env) -> :4100
// /api is proxied to the NIXXY backend so the two ports act as one origin.
const FRONTEND_PORT = 9922;
const API_TARGET = 'http://localhost:4100';
const allowedHosts = ['70.36.107.109', 'localhost', '127.0.0.1', '.nixxy.com', 'nixxy.com'];

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: FRONTEND_PORT,
    strictPort: true,
    allowedHosts,
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: FRONTEND_PORT,
    strictPort: true,
    allowedHosts,
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
});
