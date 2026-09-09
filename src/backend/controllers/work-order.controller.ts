import type { Request, Response } from 'express'
import { asyncHandler, param } from '../middlewares/error'
import { workOrderService } from '../services/work-order.service'
import type { WorkOrderStatus } from '../services/status-rules'

export const workOrderController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    res.json(await workOrderService.list(req.query))
  }),
  get: asyncHandler(async (req: Request, res: Response) => {
    res.json(await workOrderService.get(param(req, 'id')))
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(await workOrderService.create(req.body, req.user?.id))
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(await workOrderService.update(param(req, 'id'), req.body))
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await workOrderService.remove(param(req, 'id'))
    res.status(204).end()
  }),
  status: asyncHandler(async (req: Request, res: Response) => {
    res.json(await workOrderService.changeStatus(param(req, 'id'), req.body.status as WorkOrderStatus, req.user?.id, req.body.note))
  }),
  addService: asyncHandler(async (req: Request, res: Response) => {
    res.json(await workOrderService.addService(param(req, 'id'), req.body))
  }),
  addPart: asyncHandler(async (req: Request, res: Response) => {
    res.json(await workOrderService.addPart(param(req, 'id'), req.body))
  }),
  removeService: asyncHandler(async (req: Request, res: Response) => {
    res.json(await workOrderService.removeService(param(req, 'id'), param(req, 'itemId')))
  }),
  removePart: asyncHandler(async (req: Request, res: Response) => {
    res.json(await workOrderService.removePart(param(req, 'id'), param(req, 'itemId')))
  }),
}
