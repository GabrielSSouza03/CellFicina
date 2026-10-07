import { getPrisma } from '../database/client'
import { categorySchema, paginationQuery, productListQuery, productSchema, productStatusSchema, serviceSchema } from '../validators'
import { ConflictError, NotFoundError } from '../utils/errors'
import { paginated, serializeProduct, serializeService } from '../utils/serialize'
import { stockService } from './stock.service'

export { stockService } from './stock.service'
export { canDecrementStock } from '../../shared/stock'

export const catalogService = {
  async listCategories() {
    return getPrisma().productCategory.findMany({ orderBy: { name: 'asc' } })
  },
  async createCategory(input: unknown) {
    const data = categorySchema.parse(input)
    try {
      return await getPrisma().productCategory.create({ data: { name: data.name } })
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictError('Categoria já cadastrada.')
      throw error
    }
  },
  async listProducts(query: unknown) {
    const params = productListQuery.parse(query)
    const prisma = getPrisma()
    const statusIds = await stockService.matchingProductIds(params.stockStatus)
    if (statusIds && statusIds.length === 0) {
      return paginated([], 0, params.page, params.pageSize)
    }
    const where = {
      ...(statusIds ? { id: { in: statusIds } } : {}),
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.active === 'true' ? { active: true } : params.active === 'false' ? { active: false } : {}),
      ...(params.search
        ? { OR: [{ name: { contains: params.search } }, { sku: { contains: params.search } }] }
        : {}),
    }
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
    await this.assertCategory(data.categoryId)
    try {
      const created = await getPrisma().product.create({
        data: {
          sku: data.sku,
          name: data.name,
          description: data.description ?? null,
          costPrice: data.costPrice,
          salePrice: data.salePrice,
          minQuantity: data.minQuantity,
          maxQuantity: data.maxQuantity,
          unit: data.unit,
          active: data.active,
          category: data.categoryId ? { connect: { id: data.categoryId } } : undefined,
        },
        include: { category: true },
      })
      return serializeProduct(created)
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictError('Já existe um produto com este código.')
      throw error
    }
  },
  async updateProduct(id: string, input: unknown) {
    await this.getProduct(id)
    const data = productSchema.parse(input)
    await this.assertCategory(data.categoryId)
    try {
      const updated = await getPrisma().product.update({
        where: { id },
        data: {
          sku: data.sku,
          name: data.name,
          description: data.description ?? null,
          costPrice: data.costPrice,
          salePrice: data.salePrice,
          minQuantity: data.minQuantity,
          maxQuantity: data.maxQuantity,
          unit: data.unit,
          active: data.active,
          category: data.categoryId ? { connect: { id: data.categoryId } } : { disconnect: true },
        },
        include: { category: true },
      })
      return serializeProduct(updated)
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictError('Já existe um produto com este código.')
      throw error
    }
  },
  async setProductStatus(id: string, input: unknown) {
    await this.getProduct(id)
    const data = productStatusSchema.parse(input)
    const updated = await getPrisma().product.update({
      where: { id },
      data: { active: data.active },
      include: { category: true },
    })
    return serializeProduct(updated)
  },
  async removeProduct(id: string) {
    await this.getProduct(id)
    try {
      await getPrisma().product.delete({ where: { id } })
    } catch (error) {
      if ((error as { code?: string }).code === 'P2003') {
        throw new ConflictError('Este produto possui movimentações ou vínculos e não pode ser excluído. Inative-o.')
      }
      throw error
    }
  },
  async assertCategory(categoryId?: string) {
    if (!categoryId) return
    const category = await getPrisma().productCategory.findUnique({ where: { id: categoryId } })
    if (!category) throw new NotFoundError('Categoria não encontrada.')
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

