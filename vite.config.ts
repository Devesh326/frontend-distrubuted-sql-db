import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({mode}) => {
 const env = loadEnv(mode, process.cwd(), '')
 const target = env.VITE_PROXY_TARGET || 'http://127.0.0.1:8080'
 return {
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: { proxy: {
    '/status': { target }, '/query': { target }, '/metrics': { target }, '/api': { target, ws: true },
  } },
 }
})
