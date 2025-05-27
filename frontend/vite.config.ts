import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.PORT || '5173'),
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // Reduce chunk size warnings
    chunkSizeWarningLimit: 800,
  },
})
