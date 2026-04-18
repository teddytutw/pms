import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/PMP/',
  plugins: [react()],
  server: {
    proxy: {
      '/PMP/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})
