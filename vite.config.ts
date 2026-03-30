import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'supabase'
            if (id.includes('@tanstack')) return 'query'
            if (id.includes('react-router')) return 'router'
            if (id.includes('react')) return 'vendor'
          }
        },
      },
    },
  },
})
