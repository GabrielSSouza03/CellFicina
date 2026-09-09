import { customerRepository } from '../repositories/customer.repository'
import { customerSchema, paginationQuery } from '../validators'
import { ConflictError, NotFoundError } from '../utils/errors'
import { getPrisma } from '../database/client'
import { paginated, serializeCustomer } from '../utils/serialize'
import { onlyDigits } from '../validators/brazil'

export const customerService = {
  async list(query: unknown) {
    const params = paginationQuery.parse(query)
    const [rows, total] = await customerRepository.list(params)
    return paginated(rows.map(serializeCustomer), total, params.page, params.pageSize)
  },
  async get(id: string) {
    const customer = await customerRepository.findById(id)
    if (!customer) throw new NotFoundError('Cliente não encontrado.')
    return serializeCustomer(customer)
  },
  async create(input: unknown) {
    const data = customerSchema.parse(input)
    const created = await customerRepository.create({
      name: data.name,
      document: onlyDigits(data.document),
      documentType: data.documentType,
      email: data.email,
      phone: onlyDigits(data.phone),
      phone2: data.phone2,
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      notes: data.notes,
    })
    await getPrisma().auditLog.create({
      data: { action: 'CREATE', entity: 'Customer', entityId: created.id, details: created.name },
    })
    return serializeCustomer(created)
  },
  async update(id: string, input: unknown) {
    await this.get(id)
    const data = customerSchema.parse(input)
    const updated = await customerRepository.update(id, {
      name: data.name,
      document: onlyDigits(data.document),
      documentType: data.documentType,
      email: data.email,
      phone: onlyDigits(data.phone),
      phone2: data.phone2,
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      notes: data.notes,
    })
    return serializeCustomer(updated)
  },
  async remove(id: string) {
    const customer = await customerRepository.findById(id)
    if (!customer) throw new NotFoundError('Cliente não encontrado.')
    const prisma = getPrisma()
    const [workOrders, quotes, receivables] = await Promise.all([
      prisma.workOrder.count({ where: { customerId: id } }),
      prisma.quote.count({ where: { customerId: id } }),
      prisma.accountReceivable.count({ where: { customerId: id } }),
    ])
    if (workOrders || quotes || receivables) {
      throw new ConflictError('Não é possível excluir este cliente porque há ordens de serviço, orçamentos ou contas vinculadas.')
    }
    try {
      await prisma.$transaction([
        prisma.vehicle.deleteMany({ where: { customerId: id } }),
        prisma.customer.delete({ where: { id } }),
        prisma.auditLog.create({
          data: { action: 'DELETE', entity: 'Customer', entityId: id, details: customer.name },
        }),
      ])
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'P2003' || code === 'P2014') {
        throw new ConflictError('Não é possível excluir este cliente porque há registros vinculados.')
      }
      throw err
    }
  },
}
