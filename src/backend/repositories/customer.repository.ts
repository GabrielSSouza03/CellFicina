import { Prisma } from '@prisma/client'
import { getPrisma } from '../database/client'

export function buildSearch(fields: string[], search?: string): Prisma.CustomerWhereInput | undefined {
  if (!search?.trim()) return undefined
  return {
    OR: fields.map((field) => ({ [field]: { contains: search.trim() } })),
  }
}

export const customerRepository = {
  list(params: { page: number; pageSize: number; search?: string }) {
    const prisma = getPrisma()
    const where: Prisma.CustomerWhereInput = params.search?.trim()
      ? {
          OR: [
            { name: { contains: params.search.trim() } },
            { document: { contains: params.search.trim() } },
            { phone: { contains: params.search.trim() } },
            { email: { contains: params.search.trim() } },
          ],
        }
      : {}
    return Promise.all([
      prisma.customer.findMany({
        where,
        include: { vehicles: true },
        orderBy: { name: 'asc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.customer.count({ where }),
    ])
  },
  findById(id: string) {
    return getPrisma().customer.findUnique({
      where: { id },
      include: { vehicles: true, workOrders: { orderBy: { createdAt: 'desc' }, take: 10 } },
    })
  },
  create(data: Prisma.CustomerCreateInput) {
    return getPrisma().customer.create({ data, include: { vehicles: true } })
  },
  update(id: string, data: Prisma.CustomerUpdateInput) {
    return getPrisma().customer.update({ where: { id }, data, include: { vehicles: true } })
  },
  remove(id: string) {
    return getPrisma().customer.delete({ where: { id } })
  },
}
