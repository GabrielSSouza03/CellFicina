import express from 'express'
import cors from 'cors'
import { router } from './routes'
import { errorHandler, requestLogger } from './middlewares/error'
import { logger } from './utils/logger'

export function createApp() {
  const app = express()
  app.use(cors({ origin: true, credentials: true }))
  app.use(express.json({ limit: '2mb' }))
  app.use(requestLogger)
  app.get('/health', (_req, res) => res.json({ ok: true, name: 'CellFicina' }))
  app.use(router)
  app.use(errorHandler)
  return app
}

export async function startServer(port: number) {
  const app = createApp()
  const listen = (chosen: number): Promise<{ close: () => Promise<void> }> =>
    new Promise((resolve, reject) => {
      const server = app.listen(chosen, '127.0.0.1')
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
        logger.info('api', `API listening on http://127.0.0.1:${actual}`)
        resolve({
          close: () => new Promise((done, fail) => server.close((err) => (err ? fail(err) : done()))),
        })
      })
    })
  return listen(port)
}
