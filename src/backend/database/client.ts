import { PrismaClient } from '@prisma/client'
import { getDatabaseUrl } from './paths'
import { logger } from '../utils/logger'

let prisma: PrismaClient | null = null

export function getPrisma(): PrismaClient {
  if (!prisma) {
    const url = getDatabaseUrl()
    process.env.DATABASE_URL = url
    prisma = new PrismaClient({
      datasources: { db: { url } },
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
    void prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL')
    void prisma.$queryRawUnsafe('PRAGMA busy_timeout = 5000')
    logger.info('database', 'Prisma client initialized', { url: url.replace(/.*\//, 'file:…/') })
  }
  return prisma
}

export async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
  }
}

export async function reconnectPrisma() {
  await disconnectPrisma()
  return getPrisma()
}
