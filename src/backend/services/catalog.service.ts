import { getPrisma } from '../database/client'
import { paginationQuery, productSchema, serviceSchema, stockMovementSchema } from '../validators'
import { AppError, NotFoundError } from '../utils/errors'
import { paginated, serializeProduct, serializeService } from '../utils/serialize'
import { money } from '../utils/money'

export const catalogService = {
  async listProducts(query: unknown) {
    const params = paginationQuery.parse(query)
    const prisma = getPrisma()
    const where = params.search
      ? { OR: [{ name: { contains: params.search } }, { sku: { contains: params.search } }] }
      : {}
    const [rows, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { name: 'asc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.product.count({ where }),
    ])
    return paginated(rows.map(serializeProduct), total, params.page, params.pageSize)
  },
  async getProduct(id: string) {
    const product = await getPrisma().product.findUnique({ where: { id }, include: { category: true } })
    if (!product) throw new NotFoundError('Produto não encontrado.')
    return serializeProduct(product)
  },
  async createProduct(input: unknown) {
    const data = productSchema.parse(input)
    const created = await getPrisma().product.create({
      data: {
        sku: data.sku,
        name: data.name,
        description: data.description,
        costPrice: data.costPrice,
        salePrice: data.salePrice,
        quantity: data.quantity,
        minQuantity: data.minQuantity,
        unit: data.unit,
        active: data.active,
        category: data.categoryId ? { connect: { id: data.categoryId } } : undefined,
      },
      include: { category: true },
    })
    return serializeProduct(created)
  },
  async updateProduct(id: string, input: unknown) {
    await this.getProduct(id)
    const data = productSchema.parse(input)
    const updated = await getPrisma().product.update({
      where: { id },
      data: {
        sku: data.sku,
        name: data.name,
        description: data.description,
        costPrice: data.costPrice,
        salePrice: data.salePrice,
        minQuantity: data.minQuantity,
        unit: data.unit,
        active: data.active,
        category: data.categoryId ? { connect: { id: data.categoryId } } : { disconnect: true },
      },
      include: { category: true },
    })
    return serializeProduct(updated)
  },
  async removeProduct(id: string) {
    await this.getProduct(id)
    await getPrisma().product.delete({ where: { id } })
  },
  async listServices(query: unknown) {
    const params = paginationQuery.parse(query)
    const prisma = getPrisma()
    const where = params.search
      ? { OR: [{ name: { contains: params.search } }, { code: { contains: params.search } }] }
      : {}
    const [rows, total] = await Promise.all([
      prisma.service.findMany({
        where,
        include: { category: true },
        orderBy: { name: 'asc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.service.count({ where }),
    ])
    return paginated(rows.map(serializeService), total, params.page, params.pageSize)
  },
  async createService(input: unknown) {
    const data = serviceSchema.parse(input)
    const created = await getPrisma().service.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        price: data.price,
        durationMin: data.durationMin,
        active: data.active,
        category: data.categoryId ? { connect: { id: data.categoryId } } : undefined,
      },
      include: { category: true },
    })
    return serializeService(created)
  },
  async updateService(id: string, input: unknown) {
    const data = serviceSchema.parse(input)
    const updated = await getPrisma().service.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        price: data.price,
        durationMin: data.durationMin,
        active: data.active,
      },
      include: { category: true },
    })
    return serializeService(updated)
  },
  async removeService(id: string) {
    await getPrisma().service.delete({ where: { id } })
  },
}

export function canDecrementStock(current: number, quantity: number, allowNegative: boolean) {
  return allowNegative || current >= quantity
}

export const stockService = {
  async settings() {
    const settings = await getPrisma().workshopSettings.findFirst()
    return settings
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
  async entry(input: unknown) {
    const data = stockMovementSchema.parse(input)
    const prisma = getPrisma()
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id: data.productId },
        data: { quantity: { increment: data.quantity } },
      })
      const movement = await tx.stockMovement.create({
        data: {
          productId: data.productId,
          type: 'ENTRY',
          quantity: data.quantity,
          unitCost: data.unitCost,
          reason: data.reason || 'Entrada de estoque',
          reference: data.reference,
        },
        include: { product: true },
      })
      return { movement, product }
    })
  },
  async exit(input: unknown) {
    const data = stockMovementSchema.parse(input)
    await this.assertStock(data.productId, data.quantity)
    const prisma = getPrisma()
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id: data.productId },
        data: { quantity: { decrement: data.quantity } },
      })
      const movement = await tx.stockMovement.create({
        data: {
          productId: data.productId,
          type: 'EXIT',
          quantity: data.quantity,
          unitCost: data.unitCost,
          reason: data.reason || 'Saída de estoque',
          reference: data.reference,
        },
        include: { product: true },
      })
      return { movement, product }
    })
  },
  async movements(query: unknown) {
    const params = paginationQuery.parse(query)
    const prisma = getPrisma()
    const [rows, total] = await Promise.all([
      prisma.stockMovement.findMany({
        include: { product: true },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.stockMovement.count(),
    ])
    return paginated(rows, total, params.page, params.pageSize)
  },
  async lowStock() {
    const settings = await this.settings()
    const threshold = settings?.lowStockThreshold ?? 5
    return getPrisma().product.findMany({
      where: { quantity: { lte: threshold }, active: true },
      include: { category: true },
      orderBy: { quantity: 'asc' },
    }).then((rows) => rows.map(serializeProduct))
  },
}

export { money }
