// vite.config.js
// ─────────────────────────────────────────────────────────────────────────────
// Vite configuration for the Task Logger frontend.
//
// The `server.proxy` block is the most important part: any request from the
// React app to a path starting with `/api` is forwarded to the PHP backend
// at http://localhost:8000, with the `/api` prefix stripped.
//
// Example:
//   React calls:    fetch('/api/tasks')
//   Vite proxies:   GET http://localhost:8000/tasks
//
// This means:
//   - No CORS issues in development (same origin from browser's perspective)
//   - We don't need to hardcode http://localhost:8000 in our React code
//   - Production deployments only require pointing /api to the right URL
// ─────────────────────────────────────────────────────────────────────────────

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // Strip the /api prefix before forwarding
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})