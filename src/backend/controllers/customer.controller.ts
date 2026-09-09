import type { Request, Response } from 'express'
import { asyncHandler, param } from '../middlewares/error'
import { customerService } from '../services/customer.service'

export const customerController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    res.json(await customerService.list(req.query))
  }),
  get: asyncHandler(async (req: Request, res: Response) => {
    res.json(await customerService.get(param(req, 'id')))
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(await customerService.create(req.body))
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(await customerService.update(param(req, 'id'), req.body))
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await customerService.remove(param(req, 'id'))
    res.status(204).end()
  }),
}
