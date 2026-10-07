import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import express from 'express'
import cors from 'cors'
import { router } from './routes'
import { errorHandler, requestLogger } from './middlewares/error'
import { logger } from './utils/logger'

const API_PREFIXES = ['/auth', '/customers', '/vehicles', '/work-orders', '/products', '/services', '/stock', '/quotes', '/finance', '/dashboard', '/settings']

function isApiPath(pathname: string) {
  return pathname === '/health' || pathname === '/access' || API_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function attachWebApp(app: express.Express) {
  const rendererDir = process.env.RENDERER_DIR
  if (!rendererDir || !fs.existsSync(path.join(rendererDir, 'index.html'))) return
  app.use(express.static(rendererDir, {
    index: false,
    setHeaders(res, filePath) {
      const base = path.basename(filePath)
      if (base === 'index.html' || base === 'sw.js' || base === 'manifest.webmanifest' || base.startsWith('workbox-')) {
        res.setHeader('Cache-Control', 'no-cache')
      }
    },
  }))
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    if (isApiPath(req.path)) return next()
    res.sendFile(path.join(rendererDir, 'index.html'))
  })
}

export function createApp() {
  const app = express()
  app.use(cors({ origin: true, credentials: true }))
  app.use(express.json({ limit: '2mb' }))
  app.use(requestLogger)
  app.get('/health', (_req, res) => res.json({ ok: true, name: 'CellFicina' }))
  app.get('/access', (_req, res) => {
    const port = Number(process.env.API_PORT || 3456)
    const host = process.env.HOST || '127.0.0.1'
    const urls = shareableUrls(host, port).filter((url) => !url.includes('127.0.0.1') && !url.includes('localhost'))
    res.json({ urls })
  })
  app.use(router)
  attachWebApp(app)
  app.use(errorHandler)
  return app
}

function lanAddresses() {
  const preferred: string[] = []
  const virtual: string[] = []
  for (const [name, entries] of Object.entries(os.networkInterfaces())) {
    const hidden = /^(docker|br-|veth|virbr|tun|tap|cni|flannel)/i.test(name)
    for (const entry of entries || []) {
      const family = String(entry.family)
      if ((family !== 'IPv4' && family !== '4') || entry.internal) continue
      ;(hidden ? virtual : preferred).push(entry.address)
    }
  }
  return preferred.length ? preferred : virtual
}

function shareableUrls(host: string, port: number) {
  const webPort = process.env.PUBLIC_WEB_PORT
  if (webPort) return lanAddresses().map((ip) => `http://${ip}:${webPort}`)
  if (host !== '0.0.0.0') return [`http://${host}:${port}`]
  return [`http://127.0.0.1:${port}`, ...lanAddresses().map((ip) => `http://${ip}:${port}`)]
}

export async function startServer(port: number, host = process.env.HOST || '127.0.0.1') {
  const app = createApp()
  const listen = (chosen: number): Promise<{ close: () => Promise<void> }> =>
    new Promise((resolve, reject) => {
      const server = app.listen(chosen, host)
      server.once('error', (error: NodeJS.ErrnoException) => {
        if (chosen !== 0 && error.code === 'EADDRINUSE') {
          logger.warn('api', `Porta ${chosen} já está em uso. Encerrando a instância antiga ou escolhendo outra porta.`)
          listen(0).then(resolve, reject)
          return
        }
        reject(error)
      })
      server.once('listening', () => {
        const addr = server.address()
        const actual = typeof addr === 'object' && addr ? addr.port : chosen
        process.env.API_PORT = String(actual)
        for (const url of shareableUrls(host, actual)) {
          logger.info('api', `CellFicina em ${url}`)
        }
        resolve({
          close: () => new Promise((done, fail) => server.close((err) => (err ? fail(err) : done()))),
        })
      })
    })
  return listen(port)
}
