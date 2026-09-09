import './database/env'
import { startServer } from './app'
import { runMigrations } from './database/migrate'
import { getPrisma } from './database/client'
import { seedIfEmpty } from './database/seed-runtime'
import { API_PORT } from './database/paths'
import { logger } from './utils/logger'

async function main() {
  logger.info('boot', 'Starting CellFicina backend')
  getPrisma()
  await runMigrations()
  await seedIfEmpty()
  await startServer(API_PORT)
}

main().catch((error) => {
  logger.error('boot', error instanceof Error ? error.message : 'Failed to start backend', error)
  process.exit(1)
})
