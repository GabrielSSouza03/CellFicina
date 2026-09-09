import fs from 'node:fs'
import path from 'node:path'

export const isDev = process.env.NODE_ENV === 'development' || !process.env.APP_USER_DATA

export function getUserDataDir(): string {
  if (process.env.APP_USER_DATA) return process.env.APP_USER_DATA
  return path.resolve(process.cwd(), '.shoficina-data')
}

export function getDatabasePath(): string {
  if (process.env.APP_USER_DATA) {
    return path.join(process.env.APP_USER_DATA, 'shoficina.db')
  }
  if (process.env.DATABASE_URL?.startsWith('file:')) {
    const raw = process.env.DATABASE_URL.slice('file:'.length)
    if (path.isAbsolute(raw)) return raw
  }
  return path.resolve(process.cwd(), 'database/prisma/dev.db')
}

export function getDatabaseUrl(): string {
  const dbPath = getDatabasePath()
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  return `file:${dbPath.replace(/\\/g, '/')}`
}

export function getMigrationsPath(): string {
  const extra = process.env.PRISMA_SCHEMA_PATH
  if (extra) return path.join(path.dirname(extra), 'migrations')
  const packaged = process.env.PRISMA_RESOURCES
  if (packaged) return path.join(packaged, 'migrations')
  return path.resolve(process.cwd(), 'database/prisma/migrations')
}

export const API_PORT = Number(process.env.API_PORT || 3456)

export function getJwtSecret(): string {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET
  const secretFile = path.join(getUserDataDir(), 'jwt.secret')
  if (fs.existsSync(secretFile)) return fs.readFileSync(secretFile, 'utf8').trim()
  const generated = `shoficina-${Date.now()}-${Math.random().toString(36).slice(2)}`
  fs.mkdirSync(path.dirname(secretFile), { recursive: true })
  fs.writeFileSync(secretFile, generated, 'utf8')
  return generated
}
