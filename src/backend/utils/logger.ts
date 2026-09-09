import fs from 'node:fs'
import path from 'node:path'

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

const SENSITIVE = /password|senha|token|secret|authorization|hash/i

function redact(value: unknown): unknown {
  if (typeof value === 'string') {
    return SENSITIVE.test(value) ? '[redacted]' : value
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE.test(key) ? '[redacted]' : redact(item),
    ])
    return Object.fromEntries(entries)
  }
  return value
}

let logDir = path.resolve(process.cwd(), 'logs')

export function setLogDirectory(dir: string) {
  logDir = dir
  fs.mkdirSync(logDir, { recursive: true })
}

function write(level: LogLevel, scope: string, message: string, extra?: unknown) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    extra: extra === undefined ? undefined : redact(extra),
  })
  try {
    fs.mkdirSync(logDir, { recursive: true })
    fs.appendFileSync(path.join(logDir, 'shoficina.log'), `${line}\n`, 'utf8')
  } catch {
    // logging must never crash the app
  }
  const printer = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  printer(`[${level.toUpperCase()}] [${scope}] ${message}`)
}

export const logger = {
  info: (scope: string, message: string, extra?: unknown) => write('info', scope, message, extra),
  warn: (scope: string, message: string, extra?: unknown) => write('warn', scope, message, extra),
  error: (scope: string, message: string, extra?: unknown) => write('error', scope, message, extra),
  debug: (scope: string, message: string, extra?: unknown) => write('debug', scope, message, extra),
}
