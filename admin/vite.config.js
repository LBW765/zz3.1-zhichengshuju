import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'utf8-content-type',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const setHeader = res.setHeader.bind(res)
          res.setHeader = (name, value) => {
            if (
              String(name).toLowerCase() === 'content-type' &&
              typeof value === 'string' &&
              /^(text\/|application\/(?:javascript|json))/.test(value) &&
              !/charset=/i.test(value)
            ) {
              return setHeader(name, `${value}; charset=utf-8`)
            }
            return setHeader(name, value)
          }
          next()
        })
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 8131,
    host: '0.0.0.0',
    open: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3131',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/uploads': {
        target: 'http://127.0.0.1:3131',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500
  }
})
