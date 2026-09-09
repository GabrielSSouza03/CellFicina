import bcrypt from 'bcryptjs'
import { getPrisma } from '../database/client'
import { loginSchema } from '../validators'
import { AppError, UnauthorizedError } from '../utils/errors'
import { signToken } from '../middlewares/auth'
import { logger } from '../utils/logger'

export async function login(input: unknown) {
  const data = loginSchema.parse(input)
  const prisma = getPrisma()
  const user = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  })
  if (!user || !user.active) throw new UnauthorizedError('E-mail ou senha inválidos.')
  const ok = await bcrypt.compare(data.password, user.passwordHash)
  if (!ok) throw new UnauthorizedError('E-mail ou senha inválidos.')
  const token = signToken({ id: user.id, email: user.email, role: user.role.name })
  logger.info('auth', 'Login realizado', { email: user.email, role: user.role.name })
  return {
    token,
    user: serializeUser(user),
  }
}

export function serializeUser(user: {
  id: string
  name: string
  email: string
  role: { name: string; permissions: { permission: { code: string } }[] }
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name,
    permissions: user.role.permissions.map((item) => item.permission.code),
  }
}

export async function getMe(userId: string) {
  const prisma = getPrisma()
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  })
  if (!user) throw new AppError('Usuário não encontrado.', 404)
  return serializeUser(user)
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}
