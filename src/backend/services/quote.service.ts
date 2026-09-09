import { getPrisma } from '../database/client'
import { paginationQuery, quoteSchema } from '../validators'
import { AppError, NotFoundError } from '../utils/errors'
import { lineTotal, money, orderTotals } from '../utils/money'
import { paginated, serializeQuote } from '../utils/serialize'
import { assertQuoteTransition, type QuoteStatus } from './status-rules'
import { workOrderService } from './work-order.service'

const includeQuote = {
  customer: true,
  vehicle: true,
  items: { include: { service: true, product: true } },
}

async function nextQuoteNumber() {
  const last = await getPrisma().quote.findFirst({ orderBy: { number: 'desc' } })
  return (last?.number ?? 1000) + 1
}

function computeQuote(items: { total: string }[], discount: string, surcharge: string) {
  const subtotal = items.reduce((acc, item) => acc.plus(money(item.total)), money(0))
  return orderTotals({ servicesTotal: subtotal, partsTotal: 0, discount, surcharge })
}

export const quoteService = {
  async list(query: unknown) {
    const params = paginationQuery.parse(query)
    const status = (query as { status?: string }).status
    const prisma = getPrisma()
    const where = {
      ...(status && status !== 'ALL' ? { status } : {}),
      ...(params.search
        ? { OR: [{ customer: { name: { contains: params.search } } }, { notes: { contains: params.search } }] }
        : {}),
    }
    const [rows, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        include: includeQuote,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.quote.count({ where }),
    ])
    return paginated(rows.map(serializeQuote), total, params.page, params.pageSize)
  },
  async get(id: string) {
    const quote = await getPrisma().quote.findUnique({ where: { id }, include: includeQuote })
    if (!quote) throw new NotFoundError('Orçamento não encontrado.')
    return serializeQuote(quote)
  },
  async create(input: unknown) {
    const data = quoteSchema.parse(input)
    const items = data.items.map((item) => {
      const total = lineTotal(item.quantity, item.unitPrice, item.discount)
      return {
        type: item.type,
        serviceId: item.serviceId,
        productId: item.productId,
        description: item.description,
        quantity: money(item.quantity).toFixed(2),
        unitPrice: money(item.unitPrice).toFixed(2),
        discount: money(item.discount).toFixed(2),
        total: total.toFixed(2),
      }
    })
    const totals = computeQuote(items, data.discount, data.surcharge)
    const created = await getPrisma().quote.create({
      data: {
        number: await nextQuoteNumber(),
        status: data.status || 'DRAFT',
        notes: data.notes,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        discount: totals.discount.toFixed(2),
        surcharge: totals.surcharge.toFixed(2),
        subtotal: totals.subtotal.toFixed(2),
        total: totals.total.toFixed(2),
        customer: { connect: { id: data.customerId } },
        vehicle: data.vehicleId ? { connect: { id: data.vehicleId } } : undefined,
        items: { create: items },
      },
      include: includeQuote,
    })
    return serializeQuote(created)
  },
  async update(id: string, input: unknown) {
    const current = await getPrisma().quote.findUnique({ where: { id } })
    if (!current) throw new NotFoundError('Orçamento não encontrado.')
    const data = quoteSchema.parse(input)
    if (data.status && data.status !== current.status) {
      try {
        assertQuoteTransition(current.status as QuoteStatus, data.status as QuoteStatus)
      } catch (error) {
        throw new AppError((error as Error).message)
      }
    }
    await getPrisma().quoteItem.deleteMany({ where: { quoteId: id } })
    const items = data.items.map((item) => {
      const total = lineTotal(item.quantity, item.unitPrice, item.discount)
      return {
        type: item.type,
        serviceId: item.serviceId,
        productId: item.productId,
        description: item.description,
        quantity: money(item.quantity).toFixed(2),
        unitPrice: money(item.unitPrice).toFixed(2),
        discount: money(item.discount).toFixed(2),
        total: total.toFixed(2),
      }
    })
    const totals = computeQuote(items, data.discount, data.surcharge)
    const updated = await getPrisma().quote.update({
      where: { id },
      data: {
        status: data.status || current.status,
        notes: data.notes,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        discount: totals.discount.toFixed(2),
        surcharge: totals.surcharge.toFixed(2),
        subtotal: totals.subtotal.toFixed(2),
        total: totals.total.toFixed(2),
        customer: { connect: { id: data.customerId } },
        vehicle: data.vehicleId ? { connect: { id: data.vehicleId } } : { disconnect: true },
        items: { create: items },
      },
      include: includeQuote,
    })
    return serializeQuote(updated)
  },
  async convertToWorkOrder(id: string, userId?: string) {
    const quote = await getPrisma().quote.findUnique({ where: { id }, include: { items: true } })
    if (!quote) throw new NotFoundError('Orçamento não encontrado.')
    if (quote.status !== 'APPROVED') throw new AppError('Somente orçamentos aprovados podem virar OS.')
    if (!quote.vehicleId) throw new AppError('O orçamento precisa de um aparelho para gerar a OS.')
    const order = await workOrderService.create({
      customerId: quote.customerId,
      vehicleId: quote.vehicleId,
      notes: quote.notes,
      discount: String(quote.discount),
      surcharge: String(quote.surcharge),
      status: 'APPROVED',
    }, userId)
    for (const item of quote.items) {
      if (item.type === 'SERVICE' && item.serviceId) {
        await workOrderService.addService(order.id, {
          serviceId: item.serviceId,
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
          discount: String(item.discount),
          description: item.description,
        })
      }
      if (item.type === 'PART' && item.productId) {
        await workOrderService.addPart(order.id, {
          productId: item.productId,
          quantity: Number(item.quantity),
          unitPrice: String(item.unitPrice),
          discount: String(item.discount),
          description: item.description,
        })
      }
    }
    await getPrisma().workOrder.update({ where: { id: order.id }, data: { quoteId: quote.id } })
    return workOrderService.get(order.id)
  },
}
