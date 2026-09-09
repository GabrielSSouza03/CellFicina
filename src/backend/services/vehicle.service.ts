import { vehicleRepository } from '../repositories/vehicle.repository'
import { paginationQuery, vehicleSchema } from '../validators'
import { NotFoundError } from '../utils/errors'
import { paginated, serializeVehicle } from '../utils/serialize'
import { getPrisma } from '../database/client'

export const vehicleService = {
  async list(query: unknown) {
    const params = paginationQuery.parse(query)
    const customerId = (query as { customerId?: string }).customerId
    const [rows, total] = await vehicleRepository.list({ ...params, customerId })
    return paginated(rows.map(serializeVehicle), total, params.page, params.pageSize)
  },
  async get(id: string) {
    const vehicle = await vehicleRepository.findById(id)
    if (!vehicle) throw new NotFoundError('Aparelho não encontrado.')
    return serializeVehicle(vehicle)
  },
  async create(input: unknown) {
    const data = vehicleSchema.parse(input)
    if (data.customerId) {
      const customer = await getPrisma().customer.findUnique({ where: { id: data.customerId } })
      if (!customer) throw new NotFoundError('Cliente não encontrado.')
    }
    const created = await vehicleRepository.create({
      plate: '',
      brand: data.brand || '',
      model: data.model || '',
      version: data.version,
      year: data.year,
      mileage: data.mileage,
      chassis: data.chassis,
      color: data.color,
      notes: data.notes,
      ...(data.customerId ? { customer: { connect: { id: data.customerId } } } : {}),
    })
    return serializeVehicle(created)
  },
  async update(id: string, input: unknown) {
    await this.get(id)
    const data = vehicleSchema.parse(input)
    if (data.customerId) {
      const customer = await getPrisma().customer.findUnique({ where: { id: data.customerId } })
      if (!customer) throw new NotFoundError('Cliente não encontrado.')
    }
    const updated = await vehicleRepository.update(id, {
      brand: data.brand || '',
      model: data.model || '',
      version: data.version,
      year: data.year,
      mileage: data.mileage,
      chassis: data.chassis,
      color: data.color,
      notes: data.notes,
      customer: data.customerId ? { connect: { id: data.customerId } } : { disconnect: true },
    })
    return serializeVehicle(updated)
  },
  async remove(id: string) {
    await this.get(id)
    await vehicleRepository.remove(id)
  },
}
