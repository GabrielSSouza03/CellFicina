import { getPrisma } from '../database/client'
import {
  paginationQuery,
  workOrderPartItemSchema,
  workOrderSchema,
  workOrderServiceItemSchema,
} from '../validators'
import { AppError, NotFoundError } from '../utils/errors'
import { lineTotal, money, orderTotals } from '../utils/money'
import { paginated, serializeWorkOrder } from '../utils/serialize'
import { assertWorkOrderTransition, type WorkOrderStatus } from './status-rules'
import { stockService } from './catalog.service'
import { logger } from '../utils/logger'

const includeOrder = {
  customer: true,
  vehicle: true,
  mechanic: true,
  services: { include: { service: true } },
  parts: { include: { product: true } },
  history: { orderBy: { createdAt: 'desc' as const } },
}

async function nextNumber() {
  const last = await getPrisma().workOrder.findFirst({ orderBy: { number: 'desc' } })
  return (last?.number ?? 1000) + 1
}

async function recalc(workOrderId: string) {
  const prisma = getPrisma()
  const order = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: { services: true, parts: true },
  })
  if (!order) throw new NotFoundError('Ordem de serviço não encontrada.')
  const servicesTotal = order.services.reduce((acc, item) => acc.plus(money(item.total)), money(0))
  const partsTotal = order.parts.reduce((acc, item) => acc.plus(money(item.total)), money(0))
  const totals = orderTotals({
    servicesTotal,
    partsTotal,
    discount: order.discount,
    surcharge: order.surcharge,
  })
  return prisma.workOrder.update({
    where: { id: workOrderId },
    data: {
      servicesTotal: totals.servicesTotal.toFixed(2),
      partsTotal: totals.partsTotal.toFixed(2),
      subtotal: totals.subtotal.toFixed(2),
      total: totals.total.toFixed(2),
    },
    include: includeOrder,
  })
}

export const workOrderService = {
  async list(query: unknown) {
    const params = paginationQuery.parse(query)
    const status = (query as { status?: string }).status
    const prisma = getPrisma()
    const where = {
      ...(status && status !== 'ALL' ? { status } : {}),
      ...(params.search
        ? {
            OR: [
              { customer: { name: { contains: params.search } } },
              { vehicle: { brand: { contains: params.search } } },
              { vehicle: { model: { contains: params.search } } },
              { vehicle: { chassis: { contains: params.search } } },
              { diagnosis: { contains: params.search } },
            ],
          }
        : {}),
    }
    const [rows, total] = await Promise.all([
      prisma.workOrder.findMany({
        where,
        include: includeOrder,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.workOrder.count({ where }),
    ])
    return paginated(rows.map(serializeWorkOrder), total, params.page, params.pageSize)
  },
  async get(id: string) {
    const order = await getPrisma().workOrder.findUnique({ where: { id }, include: includeOrder })
    if (!order) throw new NotFoundError('Ordem de serviço não encontrada.')
    return serializeWorkOrder(order)
  },
  async create(input: unknown, userId?: string) {
    const data = workOrderSchema.parse(input)
    const prisma = getPrisma()
    const number = await nextNumber()
    const created = await prisma.workOrder.create({
      data: {
        number,
        status: data.status || 'DRAFT',
        mileage: data.mileage,
        diagnosis: data.diagnosis,
        notes: data.notes,
        entryDate: data.entryDate ? new Date(data.entryDate) : new Date(),
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
        discount: data.discount,
        surcharge: data.surcharge,
        ...(data.customerId ? { customer: { connect: { id: data.customerId } } } : {}),
        ...(data.vehicleId ? { vehicle: { connect: { id: data.vehicleId } } } : {}),
        mechanic: data.mechanicId ? { connect: { id: data.mechanicId } } : undefined,
        history: {
          create: { toStatus: data.status || 'DRAFT', note: 'Ordem criada', userId },
        },
      },
      include: includeOrder,
    })
    if (data.mileage !== undefined && data.vehicleId) {
      await prisma.vehicle.update({ where: { id: data.vehicleId }, data: { mileage: data.mileage } })
    }
    logger.info('work-order', `OS ${created.number} criada`)
    return serializeWorkOrder(await recalc(created.id))
  },
  async update(id: string, input: unknown) {
    const current = await getPrisma().workOrder.findUnique({ where: { id } })
    if (!current) throw new NotFoundError('Ordem de serviço não encontrada.')
    if (current.status === 'CANCELLED' || current.status === 'DELIVERED') {
      throw new AppError('Esta ordem não pode mais ser editada.')
    }
    const data = workOrderSchema.parse(input)
    await getPrisma().workOrder.update({
      where: { id },
      data: {
        mileage: data.mileage,
        diagnosis: data.diagnosis,
        notes: data.notes,
        entryDate: data.entryDate ? new Date(data.entryDate) : undefined,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
        discount: data.discount,
        surcharge: data.surcharge,
        customer: data.customerId ? { connect: { id: data.customerId } } : { disconnect: true },
        vehicle: data.vehicleId ? { connect: { id: data.vehicleId } } : { disconnect: true },
        mechanic: data.mechanicId ? { connect: { id: data.mechanicId } } : { disconnect: true },
      },
    })
    return serializeWorkOrder(await recalc(id))
  },
  async changeStatus(id: string, toStatus: WorkOrderStatus, userId?: string, note?: string) {
    const current = await getPrisma().workOrder.findUnique({ where: { id }, include: { parts: true } })
    if (!current) throw new NotFoundError('Ordem de serviço não encontrada.')
    try {
      assertWorkOrderTransition(current.status as WorkOrderStatus, toStatus)
    } catch (error) {
      throw new AppError((error as Error).message)
    }
    if (toStatus === 'CANCELLED') {
      for (const part of current.parts) {
        await stockService.entry({
          productId: part.productId,
          quantity: part.quantity,
          reason: `Estorno OS ${current.number}`,
          reference: current.id,
        })
      }
    }
    if (toStatus === 'COMPLETED' || toStatus === 'DELIVERED') {
      const exists = await getPrisma().accountReceivable.findFirst({ where: { workOrderId: id } })
      if (!exists && money(current.total).greaterThan(0)) {
        await getPrisma().accountReceivable.create({
          data: {
            workOrderId: id,
            customerId: current.customerId,
            description: `OS-${current.number}`,
            amount: current.total,
            dueDate: new Date(),
            status: 'OPEN',
          },
        })
      }
    }
    await getPrisma().workOrder.update({
      where: { id },
      data: {
        status: toStatus,
        history: { create: { fromStatus: current.status, toStatus, note, userId } },
      },
    })
    logger.info('work-order', `OS ${current.number} ${current.status} → ${toStatus}`)
    return this.get(id)
  },
  async addService(id: string, input: unknown) {
    const order = await getPrisma().workOrder.findUnique({ where: { id } })
    if (!order) throw new NotFoundError('Ordem de serviço não encontrada.')
    const data = workOrderServiceItemSchema.parse(input)
    const service = await getPrisma().service.findUnique({ where: { id: data.serviceId } })
    if (!service) throw new NotFoundError('Serviço não encontrado.')
    const unitPrice = money(data.unitPrice || service.price)
    const total = lineTotal(data.quantity, unitPrice, data.discount)
    await getPrisma().workOrderService.create({
      data: {
        workOrderId: id,
        serviceId: service.id,
        description: data.description || service.name,
        quantity: money(data.quantity).toFixed(2),
        unitPrice: unitPrice.toFixed(2),
        discount: money(data.discount).toFixed(2),
        total: total.toFixed(2),
      },
    })
    return serializeWorkOrder(await recalc(id))
  },
  async addPart(id: string, input: unknown) {
    const order = await getPrisma().workOrder.findUnique({ where: { id } })
    if (!order) throw new NotFoundError('Ordem de serviço não encontrada.')
    const data = workOrderPartItemSchema.parse(input)
    const product = await stockService.assertStock(data.productId, data.quantity)
    const unitPrice = money(data.unitPrice || product.salePrice)
    const total = lineTotal(data.quantity, unitPrice, data.discount)
    await getPrisma().$transaction(async (tx) => {
      await tx.workOrderPart.create({
        data: {
          workOrderId: id,
          productId: product.id,
          description: data.description || product.name,
          quantity: data.quantity,
          unitPrice: unitPrice.toFixed(2),
          discount: money(data.discount).toFixed(2),
          total: total.toFixed(2),
        },
      })
      await tx.product.update({ where: { id: product.id }, data: { quantity: { decrement: data.quantity } } })
      await tx.stockMovement.create({
        data: {
          productId: product.id,
          type: 'EXIT',
          quantity: data.quantity,
          reason: `Saída para OS ${order.number}`,
          reference: id,
        },
      })
    })
    return serializeWorkOrder(await recalc(id))
  },
  async removeService(orderId: string, itemId: string) {
    await getPrisma().workOrderService.delete({ where: { id: itemId } })
    return serializeWorkOrder(await recalc(orderId))
  },
  async removePart(orderId: string, itemId: string) {
    const part = await getPrisma().workOrderPart.findUnique({ where: { id: itemId } })
    if (!part) throw new NotFoundError('Peça não encontrada.')
    await stockService.entry({
      productId: part.productId,
      quantity: part.quantity,
      reason: 'Estorno de peça da OS',
      reference: orderId,
    })
    await getPrisma().workOrderPart.delete({ where: { id: itemId } })
    return serializeWorkOrder(await recalc(orderId))
  },
  async remove(id: string) {
    const current = await getPrisma().workOrder.findUnique({ where: { id }, include: { parts: true } })
    if (!current) throw new NotFoundError('Ordem de serviço não encontrada.')
    for (const part of current.parts) {
      await stockService.entry({
        productId: part.productId,
        quantity: part.quantity,
        reason: `Estorno exclusão OS ${current.number}`,
        reference: id,
      })
    }
    await getPrisma().workOrder.delete({ where: { id } })
  },
}
