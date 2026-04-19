import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/pms/',
  plugins: [react()],
  server: {
    proxy: {
      '/pms/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})
