import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'tunnel-url-api',
      configureServer(server) {
        server.middlewares.use('/api/tunnel-url', (_req, res) => {
          res.setHeader('Content-Type', 'application/json')
          
          try {
            const tunnelUrl = execSync('cat /tmp/tunnel-url.txt 2>/dev/null || echo ""', { encoding: 'utf-8' }).trim()
            
            if (tunnelUrl) {
              res.end(JSON.stringify({ url: tunnelUrl }))
            } else {
              res.end(JSON.stringify({ url: 'http://localhost:5173' }))
            }
          } catch (e) {
            res.end(JSON.stringify({ url: 'http://localhost:5173' }))
          }
        })
      }
    }
  ],
  server: {
    allowedHosts: ['.trycloudflare.com']
  }
})
