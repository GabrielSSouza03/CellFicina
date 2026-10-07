import type { Prisma } from '@prisma/client'
import { getPrisma } from '../database/client'
import { AppError, NotFoundError } from '../utils/errors'
import { logger } from '../utils/logger'
import { money, moneyString } from '../utils/money'
import { paginated, serializeMovement, serializeProduct } from '../utils/serialize'
import { stockEntrySchema, stockExitSchema, stockMovementQuery } from '../validators'
import {
  canDecrementStock,
  normalizeMovementType,
  originFromExitReason,
  STOCK_ORIGIN_TYPES,
  stockStatusOf,
  type StockMovementType,
  type StockOriginType,
} from '../../shared/stock'

type Tx = Prisma.TransactionClient

const movementInclude = {
  product: true,
  user: { select: { id: true, name: true } },
  supplier: { select: { id: true, name: true } },
} satisfies Prisma.StockMovementInclude

export type ApplyStockMovementInput = {
  productId: string
  direction: StockMovementType
  quantity: number
  unitCost?: string | number | null
  reason?: string | null
  originType?: StockOriginType | string | null
  originId?: string | null
  description?: string | null
  documentNumber?: string | null
  supplierId?: string | null
  supplierName?: string | null
  userId?: string | null
  occurredAt?: Date | null
  updateCost?: boolean
}

function isDatabaseBusy(error: unknown) {
  const code = (error as { code?: string }).code
  const message = error instanceof Error ? error.message : String(error)
  return code === 'P2034' || /SQLITE_BUSY|database is locked/i.test(message)
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function assertDirection(direction: string): StockMovementType {
  const normalized = normalizeMovementType(direction)
  if (normalized !== 'ENTRADA' && normalized !== 'SAIDA') {
    throw new AppError('Tipo de movimentação inválido.')
  }
  return normalized
}

function assertOrigin(origin: string): StockOriginType {
  if (!(STOCK_ORIGIN_TYPES as readonly string[]).includes(origin)) {
    throw new AppError('Origem da movimentação inválida.')
  }
  return origin as StockOriginType
}

async function resolveSupplier(tx: Tx, supplierId?: string | null, supplierName?: string | null) {
  if (supplierId) {
    const supplier = await tx.supplier.findUnique({ where: { id: supplierId } })
    if (!supplier) throw new NotFoundError('Fornecedor não encontrado.')
    return supplier.id
  }
  const name = supplierName?.trim()
  if (!name) return null
  const existing = await tx.supplier.findFirst({ where: { name } })
  if (existing) return existing.id
  const created = await tx.supplier.create({ data: { name } })
  return created.id
}

async function applyInTransaction(input: ApplyStockMovementInput, tx: Tx) {
  await tx.$queryRawUnsafe('PRAGMA busy_timeout = 5000')
  const direction = assertDirection(input.direction)
  const quantity = input.quantity
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new AppError('A quantidade deve ser um inteiro maior que zero.')
  }
  if (!input.productId) throw new AppError('Selecione o produto.')

  const originType = assertOrigin(input.originType || 'MANUAL')
  const occurredAt = input.occurredAt ?? new Date()
  if (Number.isNaN(occurredAt.getTime())) throw new AppError('Data inválida.')

  const unitCost = input.unitCost === '' || input.unitCost == null ? null : money(input.unitCost)
  if (unitCost?.isNegative()) throw new AppError('O custo unitário não pode ser negativo.')

  const supplierId = await resolveSupplier(tx, input.supplierId, input.supplierName)
  const product = await tx.product.findUnique({ where: { id: input.productId } })
  if (!product) throw new NotFoundError('Produto não encontrado.')
  if (!product.active && direction === 'SAIDA') {
    throw new AppError('Produto inativo. Reative-o para registrar saídas.')
  }

  const settings = await tx.workshopSettings.findFirst()
  const allowNegative = Boolean(settings?.allowNegativeStock)

  let changed = 0
  if (direction === 'ENTRADA') {
    changed = Number(await tx.$executeRaw`
      UPDATE "Product"
      SET "quantity" = "quantity" + ${quantity}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${product.id}
    `)
  } else if (allowNegative) {
    changed = Number(await tx.$executeRaw`
      UPDATE "Product"
      SET "quantity" = "quantity" - ${quantity}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${product.id}
    `)
  } else {
    changed = Number(await tx.$executeRaw`
      UPDATE "Product"
      SET "quantity" = "quantity" - ${quantity}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${product.id} AND "quantity" >= ${quantity}
    `)
  }

  if (changed === 0) {
    const current = await tx.product.findUnique({ where: { id: product.id } })
    if (!current) throw new NotFoundError('Produto não encontrado.')
    throw new AppError(`Estoque insuficiente para ${current.name}. Disponível: ${current.quantity}.`, 400, 'STOCK')
  }

  const fresh = await tx.product.findUniqueOrThrow({ where: { id: product.id } })
  const resultingStock = fresh.quantity
  const previousStock = direction === 'ENTRADA' ? resultingStock - quantity : resultingStock + quantity

  if (direction === 'ENTRADA' && unitCost && input.updateCost !== false) {
    const baseQty = Math.max(previousStock, 0)
    const average = baseQty + quantity === 0
      ? unitCost
      : money(fresh.costPrice).times(baseQty).plus(unitCost.times(quantity)).div(baseQty + quantity)
    await tx.product.update({
      where: { id: product.id },
      data: { costPrice: average.toFixed(2) },
    })
  }

  const description = input.description?.trim() || null
  const documentNumber = input.documentNumber?.trim() || null
  const originId = input.originId?.trim() || null
  const reason = input.reason?.trim() || originType

  const movement = await tx.stockMovement.create({
    data: {
      productId: product.id,
      type: direction,
      quantity,
      unitCost: unitCost ? unitCost.toFixed(2) : null,
      previousStock,
      resultingStock,
      reason,
      originType,
      originId,
      description,
      documentNumber,
      reference: originId || documentNumber,
      supplierId,
      userId: input.userId || null,
      occurredAt,
    },
    include: movementInclude,
  })

  const updated = await tx.product.findUniqueOrThrow({
    where: { id: product.id },
    include: { category: true },
  })

  logger.info('stock', `${direction} ${product.sku} ${previousStock} -> ${resultingStock}`)

  return {
    movement: serializeMovement(movement),
    product: serializeProduct(updated),
    previousStock,
    resultingStock,
    aboveMaximum: updated.maxQuantity > 0 && resultingStock > updated.maxQuantity,
  }
}

export const stockService = {
  async settings() {
    return getPrisma().workshopSettings.findFirst()
  },

  async assertStock(productId: string, quantity: number) {
    const product = await getPrisma().product.findUnique({ where: { id: productId } })
    if (!product) throw new NotFoundError('Produto não encontrado.')
    const settings = await this.settings()
    if (!canDecrementStock(product.quantity, quantity, Boolean(settings?.allowNegativeStock))) {
      throw new AppError(`Estoque insuficiente para ${product.name}. Disponível: ${product.quantity}.`, 400, 'STOCK')
    }
    return product
  },

  async apply(input: ApplyStockMovementInput, externalTx?: Tx) {
    if (externalTx) return applyInTransaction(input, externalTx)

    let lastError: unknown
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        return await getPrisma().$transaction((tx) => applyInTransaction(input, tx), { timeout: 15000 })
      } catch (error) {
        if (error instanceof AppError || !isDatabaseBusy(error) || attempt === 4) throw error
        lastError = error
        await delay(40 * attempt)
      }
    }
    throw lastError
  },

  async entry(input: unknown, userId?: string) {
    const data = stockEntrySchema.parse(input)
    return this.apply({
      productId: data.productId,
      direction: 'ENTRADA',
      quantity: data.quantity,
      unitCost: data.unitCost,
      reason: data.reason || data.originType,
      originType: data.originType,
      originId: data.originId,
      description: data.description,
      documentNumber: data.documentNumber,
      supplierId: data.supplierId,
      supplierName: data.supplierName,
      userId,
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
      updateCost: data.unitCost != null,
    })
  },

  async exit(input: unknown, userId?: string) {
    const data = stockExitSchema.parse(input)
    return this.apply({
      productId: data.productId,
      direction: 'SAIDA',
      quantity: data.quantity,
      reason: data.reason,
      originType: data.originType || originFromExitReason(data.reason),
      originId: data.originId,
      description: data.description,
      userId,
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
      updateCost: false,
    })
  },

  async movements(query: unknown) {
    const params = stockMovementQuery.parse(query)
    const type = params.type && params.type !== 'ALL' ? normalizeMovementType(params.type) : undefined
    const occurredAt = params.from || params.to
      ? {
          ...(params.from ? { gte: startOfDay(params.from) } : {}),
          ...(params.to ? { lte: endOfDay(params.to) } : {}),
        }
      : undefined
    const where: Prisma.StockMovementWhereInput = {
      ...(params.productId ? { productId: params.productId } : {}),
      ...(type ? { type } : {}),
      ...(params.reason && params.reason !== 'ALL' ? { reason: params.reason } : {}),
      ...(params.originType && params.originType !== 'ALL' ? { originType: params.originType } : {}),
      ...(params.userId && params.userId !== 'ALL' ? { userId: params.userId } : {}),
      ...(params.search
        ? {
            OR: [
              { product: { name: { contains: params.search } } },
              { product: { sku: { contains: params.search } } },
              { description: { contains: params.search } },
              { documentNumber: { contains: params.search } },
            ],
          }
        : {}),
      ...(occurredAt ? { occurredAt } : {}),
    }
    const prisma = getPrisma()
    const [rows, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: movementInclude,
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.stockMovement.count({ where }),
    ])
    return paginated(rows.map(serializeMovement), total, params.page, params.pageSize)
  },

  async matchingProductIds(stockStatus?: string) {
    if (!stockStatus || stockStatus === 'ALL') return null
    const prisma = getPrisma()
    let rows: { id: string }[] = []
    if (stockStatus === 'SEM_ESTOQUE') {
      rows = await prisma.$queryRaw`SELECT "id" FROM "Product" WHERE "quantity" <= 0`
    } else if (stockStatus === 'ESTOQUE_BAIXO') {
      rows = await prisma.$queryRaw`SELECT "id" FROM "Product" WHERE "quantity" > 0 AND "minQuantity" > 0 AND "quantity" <= "minQuantity"`
    } else if (stockStatus === 'NORMAL') {
      rows = await prisma.$queryRaw`SELECT "id" FROM "Product" WHERE "quantity" > 0 AND ("minQuantity" <= 0 OR "quantity" > "minQuantity")`
    } else {
      throw new AppError('Situação de estoque inválida.')
    }
    return rows.map((row) => row.id)
  },

  async lowStock() {
    const prisma = getPrisma()
    const rows = await prisma.product.findMany({
      where: { active: true },
      include: { category: true },
      orderBy: [{ quantity: 'asc' }, { name: 'asc' }],
    })
    return rows
      .filter((row) => stockStatusOf(row.quantity, row.minQuantity) !== 'NORMAL')
      .slice(0, 50)
      .map(serializeProduct)
  },

  async dashboard() {
    const prisma = getPrisma()
    const [products, recentEntries, recentExits] = await Promise.all([
      prisma.product.findMany({
        select: {
          id: true,
          sku: true,
          name: true,
          quantity: true,
          minQuantity: true,
          maxQuantity: true,
          costPrice: true,
          unit: true,
          active: true,
        },
      }),
      prisma.stockMovement.findMany({
        where: { type: 'ENTRADA' },
        include: movementInclude,
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        take: 5,
      }),
      prisma.stockMovement.findMany({
        where: { type: 'SAIDA' },
        include: movementInclude,
        orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
        take: 5,
      }),
    ])

    const active = products.filter((item) => item.active)
    const low = active.filter((item) => stockStatusOf(item.quantity, item.minQuantity) === 'ESTOQUE_BAIXO')
    const empty = active.filter((item) => stockStatusOf(item.quantity, item.minQuantity) === 'SEM_ESTOQUE')
    const stockValue = active.reduce((acc, item) => {
      if (item.quantity <= 0) return acc
      return acc.plus(money(item.costPrice).times(item.quantity))
    }, money(0))

    const attention = [...empty, ...low].sort((a, b) => a.quantity - b.quantity || a.name.localeCompare(b.name))

    return {
      totalProducts: products.length,
      activeProducts: active.length,
      lowStockCount: low.length,
      outOfStockCount: empty.length,
      stockValue: moneyString(stockValue),
      lowStock: attention.map((item) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        minQuantity: item.minQuantity,
        unit: item.unit,
        stockStatus: stockStatusOf(item.quantity, item.minQuantity),
      })),
      recentEntries: recentEntries.map(serializeMovement),
      recentExits: recentExits.map(serializeMovement),
    }
  },

  async listProductOptions() {
    return getPrisma().product.findMany({
      select: { id: true, sku: true, name: true },
      orderBy: { name: 'asc' },
    })
  },

  async listSuppliers() {
    return getPrisma().supplier.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
  },

  async listUsers() {
    return getPrisma().user.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
  },
}

function startOfDay(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new AppError('Data inicial inválida.')
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) date.setHours(0, 0, 0, 0)
  return date
}

function endOfDay(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new AppError('Data final inválida.')
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) date.setHours(23, 59, 59, 999)
  return date
}

export { canDecrementStock }
