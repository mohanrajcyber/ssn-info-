import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'dev-index-vite-html',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/' || req.url?.startsWith('/index.html') || req.url?.startsWith('/?')) {
            req.url = '/index.vite.html'
          }
          next()
        })
      },
    },
    {
      name: 'rename-vite-html',
      enforce: 'post',
      generateBundle(_options, bundle) {
        const file = bundle['index.vite.html']
        if (file) file.fileName = 'index.html'
      },
    },
  ],
  base: '/ssn-info-/',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'index.vite.html'),
    },
  },
})
