import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('react-syntax-highlighter') || id.includes('react-markdown') || id.includes('remark-gfm')) {
            return 'markdown-vendor';
          }

          if (id.includes('framer-motion') || id.includes('lucide-react')) {
            return 'ui-vendor';
          }

          if (id.includes('socket.io-client') || id.includes('react-router-dom') || id.includes('zustand')) {
            return 'app-vendor';
          }

          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
