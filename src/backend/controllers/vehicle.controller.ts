import type { Request, Response } from 'express'
import { asyncHandler, param } from '../middlewares/error'
import { vehicleService } from '../services/vehicle.service'

export const vehicleController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    res.json(await vehicleService.list(req.query))
  }),
  get: asyncHandler(async (req: Request, res: Response) => {
    res.json(await vehicleService.get(param(req, 'id')))
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(await vehicleService.create(req.body))
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(await vehicleService.update(param(req, 'id'), req.body))
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await vehicleService.remove(param(req, 'id'))
    res.status(204).end()
  }),
}
