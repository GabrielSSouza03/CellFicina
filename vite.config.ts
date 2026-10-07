import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

const apiTarget = process.env.VITE_API_URL || 'http://127.0.0.1:3456'
const apiPrefixes = ['/health', '/access', '/auth', '/customers', '/vehicles', '/work-orders', '/products', '/services', '/stock', '/quotes', '/finance', '/dashboard', '/settings']

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['icon.png', 'apple-icon.png', 'logo.jpg'],
      manifest: {
        id: '/',
        name: 'CellFicina — Loja do Alemão',
        short_name: 'CellFicina',
        description: 'Gestão para loja de celulares e assistência técnica',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f5f7fb',
        theme_color: '#ffffff',
        categories: ['business', 'productivity'],
        icons: [
          { src: 'pwa-192.png?v=2', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png?v=2', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'pwa-maskable-512.png?v=2', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,webp,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/(health|access|auth|customers|vehicles|work-orders|products|services|stock|quotes|finance|dashboard|settings)(\/|$)/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => apiPrefixes.some((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`)),
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  base: '/',
  root: path.resolve(__dirname, 'src/frontend'),
  publicDir: path.resolve(__dirname, 'public'),
  envDir: path.resolve(__dirname),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/frontend'),
    },
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: Object.fromEntries(apiPrefixes.map((prefix) => [prefix, {
      target: apiTarget,
      changeOrigin: true,
      bypass(req) {
        const pathname = req.url?.split('?')[0] ?? ''
        if (/\.[a-z0-9]+$/i.test(pathname)) return pathname
      },
    }])),
    fs: {
      allow: [path.resolve(__dirname)],
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
  },
})
