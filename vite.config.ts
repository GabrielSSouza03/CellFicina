import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  root: path.resolve(__dirname, 'src/frontend'),
  publicDir: path.resolve(__dirname, 'public'),
  envDir: path.resolve(__dirname),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/frontend'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },
})
