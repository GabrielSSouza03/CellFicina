import path from 'node:path'
import './database/env'
import { startServer } from './app'
import { runMigrations } from './database/migrate'
import { getPrisma } from './database/client'
import { seedIfEmpty } from './database/seed-runtime'
import { API_PORT } from './database/paths'
import { logger } from './utils/logger'

async function main() {
  const serveWeb = process.env.SERVE_WEB === '1'
  if (serveWeb && !process.env.RENDERER_DIR) {
    process.env.RENDERER_DIR = path.resolve(process.cwd(), 'dist/renderer')
  }
  const host = process.env.HOST || (serveWeb ? '0.0.0.0' : '127.0.0.1')
  logger.info('boot', 'Starting CellFicina backend')
  getPrisma()
  await runMigrations()
  await seedIfEmpty()
  await startServer(API_PORT, host)
}

main().catch((error) => {
  logger.error('boot', error instanceof Error ? error.message : 'Failed to start backend', error)
  process.exit(1)
})
