import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../utils/errors'
import { logger } from '../utils/logger'

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const message = err.issues[0]?.message || 'Dados inválidos.'
    return res.status(400).json({
      error: message,
      details: err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    })
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, code: err.code })
  }

  const error = err as { message?: string; status?: number }
  logger.error('api', error.message || 'Unhandled error', { path: req.path })
  return res.status(error.status || 500).json({
    error: error.message || 'Ocorreu um erro inesperado. Tente novamente.',
  })
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const started = Date.now()
  res.on('finish', () => {
    if (req.path === '/health') return
    logger.info('api', `${req.method} ${req.path} ${res.statusCode}`, { ms: Date.now() - started, user: req.user?.email })
  })
  next()
}

export function asyncHandler<T extends Request>(handler: (req: T, res: Response) => Promise<unknown>) {
  return (req: T, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res)).catch(next)
  }
}

export function param(req: Request, name: string): string {
  const value = req.params[name]
  return Array.isArray(value) ? String(value[0]) : String(value)
}
