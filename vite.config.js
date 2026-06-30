import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3014',
        changeOrigin: true
      },
      '/deepseek': {
        target: 'http://localhost:3014',
        changeOrigin: true
      }
    }
  }
})
