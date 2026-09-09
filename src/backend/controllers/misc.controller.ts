import type { Request, Response } from 'express'
import { asyncHandler, param } from '../middlewares/error'
import { catalogService, stockService } from '../services/catalog.service'
import { quoteService } from '../services/quote.service'
import { financeService } from '../services/finance.service'
import { dashboardService } from '../services/dashboard.service'
import { settingsService } from '../services/settings.service'

export const productController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    res.json(await catalogService.listProducts(req.query))
  }),
  get: asyncHandler(async (req: Request, res: Response) => {
    res.json(await catalogService.getProduct(param(req, 'id')))
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(await catalogService.createProduct(req.body))
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(await catalogService.updateProduct(param(req, 'id'), req.body))
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await catalogService.removeProduct(param(req, 'id'))
    res.status(204).end()
  }),
}

export const serviceCatalogController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    res.json(await catalogService.listServices(req.query))
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(await catalogService.createService(req.body))
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(await catalogService.updateService(param(req, 'id'), req.body))
  }),
  remove: asyncHandler(async (req: Request, res: Response) => {
    await catalogService.removeService(param(req, 'id'))
    res.status(204).end()
  }),
}

export const stockController = {
  entry: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(await stockService.entry(req.body))
  }),
  exit: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(await stockService.exit(req.body))
  }),
  movements: asyncHandler(async (req: Request, res: Response) => {
    res.json(await stockService.movements(req.query))
  }),
}

export const quoteController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    res.json(await quoteService.list(req.query))
  }),
  get: asyncHandler(async (req: Request, res: Response) => {
    res.json(await quoteService.get(param(req, 'id')))
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(await quoteService.create(req.body))
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(await quoteService.update(param(req, 'id'), req.body))
  }),
  convert: asyncHandler(async (req: Request, res: Response) => {
    res.json(await quoteService.convertToWorkOrder(param(req, 'id'), req.user?.id))
  }),
}

export const financeController = {
  receivables: asyncHandler(async (req: Request, res: Response) => {
    res.json(await financeService.listReceivables(req.query))
  }),
  payables: asyncHandler(async (req: Request, res: Response) => {
    res.json(await financeService.listPayables(req.query))
  }),
  createReceivable: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(await financeService.createReceivable(req.body))
  }),
  createPayable: asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json(await financeService.createPayable(req.body))
  }),
  updateReceivable: asyncHandler(async (req: Request, res: Response) => {
    res.json(await financeService.updateReceivable(param(req, 'id'), req.body))
  }),
  updatePayable: asyncHandler(async (req: Request, res: Response) => {
    res.json(await financeService.updatePayable(param(req, 'id'), req.body))
  }),
  payReceivable: asyncHandler(async (req: Request, res: Response) => {
    res.json(await financeService.payReceivable(param(req, 'id'), req.body, req.user?.id))
  }),
  payPayable: asyncHandler(async (req: Request, res: Response) => {
    res.json(await financeService.payPayable(param(req, 'id'), req.body, req.user?.id))
  }),
  summary: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await financeService.summary())
  }),
}

export const dashboardController = {
  get: asyncHandler(async (req: Request, res: Response) => {
    const days = Number(req.query.days || 30)
    res.json(await dashboardService.get(days))
  }),
}

export const settingsController = {
  get: asyncHandler(async (_req: Request, res: Response) => {
    res.json(await settingsService.get())
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    res.json(await settingsService.update(req.body))
  }),
  backup: asyncHandler(async (req: Request, res: Response) => {
    res.json({ path: await settingsService.backup(req.body.path) })
  }),
  restore: asyncHandler(async (req: Request, res: Response) => {
    await settingsService.restore(req.body.path)
    res.json({ ok: true })
  }),
}
