import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase': ['firebase/app', '@firebase/firestore'],
          'leaflet': ['leaflet', 'leaflet.markercluster'],
          'vue-vendor': ['vue']
        }
      }
    },
    chunkSizeWarningLimit: 600
  }
})