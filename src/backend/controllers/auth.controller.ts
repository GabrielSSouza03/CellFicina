import type { Request, Response } from 'express'
import { asyncHandler } from '../middlewares/error'
import { getMe, login } from '../services/auth.service'

export const authController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const result = await login(req.body)
    res.json(result)
  }),
  me: asyncHandler(async (req: Request, res: Response) => {
    const result = await getMe(req.user!.id)
    res.json(result)
  }),
  logout: asyncHandler(async (_req: Request, res: Response) => {
    res.json({ ok: true })
  }),
}
