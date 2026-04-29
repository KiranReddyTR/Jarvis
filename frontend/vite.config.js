import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor':  ['react', 'react-dom'],
          'three-vendor':  ['three'],
          'r3f-vendor':    ['@react-three/fiber', '@react-three/drei'],
          'ui-vendor':     ['axios', 'lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 5173,
    proxy: {
      '/plan':     'http://127.0.0.1:8000',
      '/route':    'http://127.0.0.1:8000',
      '/prompt':   'http://127.0.0.1:8000',
      '/memory':   'http://127.0.0.1:8000',
      '/health':   'http://127.0.0.1:8000',
      '/feedback': 'http://127.0.0.1:8000',
    },
  },
})
