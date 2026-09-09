import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { getJwtSecret } from '../database/paths'
import { UnauthorizedError, ForbiddenError } from '../utils/errors'
import { getPrisma } from '../database/client'

export type AuthUser = {
  id: string
  name: string
  email: string
  role: string
  permissions: string[]
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

export function signToken(payload: { id: string; email: string; role: string }) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '12h' })
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined
  if (!token) return next()
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as { id: string }
    void decoded
  } catch {
    // ignore invalid optional token
  }
  next()
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined
    if (!token) throw new UnauthorizedError()
    const decoded = jwt.verify(token, getJwtSecret()) as { id: string }
    const prisma = getPrisma()
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        role: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    })
    if (!user || !user.active) throw new UnauthorizedError('Usuário inativo ou inexistente.')
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      permissions: user.role.permissions.map((item) => item.permission.code),
    }
    next()
  } catch (error) {
    next(error instanceof Error && 'status' in error ? error : new UnauthorizedError())
  }
}

export function requirePermission(...codes: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError())
    if (req.user.role === 'ADMIN') return next()
    const allowed = codes.some((code) => req.user?.permissions.includes(code) || req.user?.permissions.includes('*'))
    if (!allowed) return next(new ForbiddenError())
    next()
  }
}
