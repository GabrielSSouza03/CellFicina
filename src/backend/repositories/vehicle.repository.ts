import { Prisma } from '@prisma/client'
import { getPrisma } from '../database/client'

export const vehicleRepository = {
  list(params: { page: number; pageSize: number; search?: string; customerId?: string }) {
    const prisma = getPrisma()
    const where: Prisma.VehicleWhereInput = {
      ...(params.customerId ? { customerId: params.customerId } : {}),
      ...(params.search?.trim()
        ? {
            OR: [
              { plate: { contains: params.search.trim() } },
              { brand: { contains: params.search.trim() } },
              { model: { contains: params.search.trim() } },
              { chassis: { contains: params.search.trim() } },
              { customer: { name: { contains: params.search.trim() } } },
            ],
          }
        : {}),
    }
    return Promise.all([
      prisma.vehicle.findMany({
        where,
        include: { customer: true },
        orderBy: { updatedAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.vehicle.count({ where }),
    ])
  },
  findById(id: string) {
    return getPrisma().vehicle.findUnique({ where: { id }, include: { customer: true, workOrders: true } })
  },
  create(data: Prisma.VehicleCreateInput) {
    return getPrisma().vehicle.create({ data, include: { customer: true } })
  },
  update(id: string, data: Prisma.VehicleUpdateInput) {
    return getPrisma().vehicle.update({ where: { id }, data, include: { customer: true } })
  },
  remove(id: string) {
    return getPrisma().vehicle.delete({ where: { id } })
  },
}
