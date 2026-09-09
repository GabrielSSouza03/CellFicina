import fs from 'node:fs'
import path from 'node:path'
import { getPrisma } from './client'
import { getMigrationsPath } from './paths'
import { logger } from '../utils/logger'

async function ensureMigrationsTable() {
  const prisma = getPrisma()
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "checksum" TEXT NOT NULL,
      "finished_at" DATETIME,
      "migration_name" TEXT NOT NULL,
      "logs" TEXT,
      "rolled_back_at" DATETIME,
      "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )
  `)
}

function splitSql(sql: string): string[] {
  return sql
    .split(/;\s*\n/)
    .map((stmt) => stmt
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n')
      .trim())
    .filter(Boolean)
}

export async function runMigrations() {
  const prisma = getPrisma()
  const migrationsDir = getMigrationsPath()
  await ensureMigrationsTable()

  if (!fs.existsSync(migrationsDir)) {
    logger.warn('database', 'No migrations directory found', { migrationsDir })
    return
  }

  const applied = await prisma.$queryRawUnsafe<Array<{ migration_name: string }>>(
    'SELECT migration_name FROM "_prisma_migrations"',
  )
  const appliedSet = new Set(applied.map((row) => row.migration_name))
  const folders = fs
    .readdirSync(migrationsDir)
    .filter((name) => fs.existsSync(path.join(migrationsDir, name, 'migration.sql')))
    .sort()

  for (const folder of folders) {
    if (appliedSet.has(folder)) continue
    const sqlPath = path.join(migrationsDir, folder, 'migration.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    logger.info('database', `Applying migration ${folder}`)
    const statements = splitSql(sql)
    for (const statement of statements) {
      await prisma.$executeRawUnsafe(statement.endsWith(';') ? statement : `${statement};`)
    }
    await prisma.$executeRawUnsafe(
      `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
       VALUES (?, ?, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP, ?)`,
      folder,
      'manual',
      folder,
      statements.length,
    )
  }
}

export async function backupDatabase(destination: string) {
  const prisma = getPrisma()
  await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(FULL)')
  const dbUrl = process.env.DATABASE_URL || ''
  const dbPath = dbUrl.replace(/^file:/, '')
  fs.copyFileSync(dbPath, destination)
  logger.info('database', 'Backup created', { destination })
  return destination
}

export async function restoreDatabase(source: string) {
  const { reconnectPrisma, disconnectPrisma } = await import('./client')
  const dbUrl = process.env.DATABASE_URL || ''
  const dbPath = dbUrl.replace(/^file:/, '')
  await disconnectPrisma()
  fs.copyFileSync(source, dbPath)
  const wal = `${dbPath}-wal`
  const shm = `${dbPath}-shm`
  if (fs.existsSync(wal)) fs.rmSync(wal)
  if (fs.existsSync(shm)) fs.rmSync(shm)
  await reconnectPrisma()
  logger.info('database', 'Backup restored', { source })
}
