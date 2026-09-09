import { getPrisma } from '../database/client'
import { paginationQuery, payableSchema, paymentSchema, receivableSchema } from '../validators'
import { AppError, NotFoundError } from '../utils/errors'
import { money, moneyString } from '../utils/money'
import { paginated, serializeAccount } from '../utils/serialize'
import { resolveFinanceStatus } from './status-rules'

function periodFilter(query: Record<string, unknown>) {
  const from = query.from ? new Date(String(query.from)) : undefined
  const to = query.to ? new Date(String(query.to)) : undefined
  if (!from && !to) return {}
  return { dueDate: { gte: from, lte: to } }
}

async function refreshStatus(kind: 'receivable' | 'payable', id: string) {
  const prisma = getPrisma()
  if (kind === 'receivable') {
    const item = await prisma.accountReceivable.findUnique({ where: { id } })
    if (!item) return
    const status = item.status === 'CANCELLED'
      ? 'CANCELLED'
      : resolveFinanceStatus(Number(item.amount), Number(item.paidAmount), item.dueDate)
    return prisma.accountReceivable.update({ where: { id }, data: { status } })
  }
  const item = await prisma.accountPayable.findUnique({ where: { id } })
  if (!item) return
  const status = item.status === 'CANCELLED'
    ? 'CANCELLED'
    : resolveFinanceStatus(Number(item.amount), Number(item.paidAmount), item.dueDate)
  return prisma.accountPayable.update({ where: { id }, data: { status } })
}

export const financeService = {
  async listReceivables(query: unknown) {
    const params = paginationQuery.parse(query)
    const q = query as Record<string, unknown>
    const prisma = getPrisma()
    const where = {
      ...(q.status && q.status !== 'ALL' ? { status: String(q.status) } : {}),
      ...periodFilter(q),
    }
    const [rows, total] = await Promise.all([
      prisma.accountReceivable.findMany({
        where,
        include: { customer: true, workOrder: true, payments: true },
        orderBy: { dueDate: 'asc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.accountReceivable.count({ where }),
    ])
    return paginated(rows.map(serializeAccount), total, params.page, params.pageSize)
  },
  async listPayables(query: unknown) {
    const params = paginationQuery.parse(query)
    const q = query as Record<string, unknown>
    const prisma = getPrisma()
    const where = {
      ...(q.status && q.status !== 'ALL' ? { status: String(q.status) } : {}),
      ...periodFilter(q),
    }
    const [rows, total] = await Promise.all([
      prisma.accountPayable.findMany({
        where,
        include: { supplier: true, payments: true },
        orderBy: { dueDate: 'asc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.accountPayable.count({ where }),
    ])
    return paginated(rows.map(serializeAccount), total, params.page, params.pageSize)
  },
  async createReceivable(input: unknown) {
    const data = receivableSchema.parse(input)
    const created = await getPrisma().accountReceivable.create({
      data: {
        description: data.description,
        amount: data.amount,
        dueDate: new Date(data.dueDate),
        customerId: data.customerId,
        workOrderId: data.workOrderId,
        status: resolveFinanceStatus(Number(data.amount), 0, new Date(data.dueDate)),
      },
      include: { customer: true, workOrder: true },
    })
    return serializeAccount(created)
  },
  async createPayable(input: unknown) {
    const data = payableSchema.parse(input)
    const created = await getPrisma().accountPayable.create({
      data: {
        description: data.description,
        amount: data.amount,
        dueDate: new Date(data.dueDate),
        supplierId: data.supplierId,
        status: resolveFinanceStatus(Number(data.amount), 0, new Date(data.dueDate)),
      },
      include: { supplier: true },
    })
    return serializeAccount(created)
  },
  async updateReceivable(id: string, input: unknown) {
    const data = receivableSchema.parse(input)
    const updated = await getPrisma().accountReceivable.update({
      where: { id },
      data: {
        description: data.description,
        amount: data.amount,
        dueDate: new Date(data.dueDate),
        customerId: data.customerId,
        workOrderId: data.workOrderId,
      },
      include: { customer: true, workOrder: true },
    })
    await refreshStatus('receivable', id)
    return serializeAccount(updated)
  },
  async updatePayable(id: string, input: unknown) {
    const data = payableSchema.parse(input)
    const updated = await getPrisma().accountPayable.update({
      where: { id },
      data: {
        description: data.description,
        amount: data.amount,
        dueDate: new Date(data.dueDate),
        supplierId: data.supplierId,
      },
      include: { supplier: true },
    })
    await refreshStatus('payable', id)
    return serializeAccount(updated)
  },
  async payReceivable(id: string, input: unknown, userId?: string) {
    const data = paymentSchema.parse(input)
    const item = await getPrisma().accountReceivable.findUnique({ where: { id } })
    if (!item) throw new NotFoundError('Conta a receber não encontrada.')
    const nextPaid = money(item.paidAmount).plus(money(data.amount))
    if (nextPaid.greaterThan(money(item.amount))) throw new AppError('O valor pago excede o saldo da conta.')
    await getPrisma().payment.create({
      data: {
        amount: data.amount,
        paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
        notes: data.notes,
        paymentMethodId: data.paymentMethodId,
        accountReceivableId: id,
        userId,
      },
    })
    await getPrisma().accountReceivable.update({
      where: { id },
      data: { paidAmount: nextPaid.toFixed(2) },
    })
    const updated = await refreshStatus('receivable', id)
    return serializeAccount(updated)
  },
  async payPayable(id: string, input: unknown, userId?: string) {
    const data = paymentSchema.parse(input)
    const item = await getPrisma().accountPayable.findUnique({ where: { id } })
    if (!item) throw new NotFoundError('Conta a pagar não encontrada.')
    const nextPaid = money(item.paidAmount).plus(money(data.amount))
    if (nextPaid.greaterThan(money(item.amount))) throw new AppError('O valor pago excede o saldo da conta.')
    await getPrisma().payment.create({
      data: {
        amount: data.amount,
        paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
        notes: data.notes,
        paymentMethodId: data.paymentMethodId,
        accountPayableId: id,
        userId,
      },
    })
    await getPrisma().accountPayable.update({
      where: { id },
      data: { paidAmount: nextPaid.toFixed(2) },
    })
    const updated = await refreshStatus('payable', id)
    return serializeAccount(updated)
  },
  async summary() {
    const prisma = getPrisma()
    const receivables = await prisma.accountReceivable.findMany()
    const payables = await prisma.accountPayable.findMany()
    const now = new Date()
    const openReceivables = receivables.filter((item) => item.status !== 'PAID' && item.status !== 'CANCELLED')
    const openPayables = payables.filter((item) => item.status !== 'PAID' && item.status !== 'CANCELLED')
    const overdueReceivables = openReceivables.filter((item) => item.dueDate < now)
    return {
      receivablesOpen: moneyString(openReceivables.reduce((acc, item) => acc.plus(money(item.amount).minus(money(item.paidAmount))), money(0))),
      payablesOpen: moneyString(openPayables.reduce((acc, item) => acc.plus(money(item.amount).minus(money(item.paidAmount))), money(0))),
      overdueReceivables: moneyString(overdueReceivables.reduce((acc, item) => acc.plus(money(item.amount).minus(money(item.paidAmount))), money(0))),
      balance: moneyString(
        openReceivables.reduce((acc, item) => acc.plus(money(item.amount).minus(money(item.paidAmount))), money(0))
          .minus(openPayables.reduce((acc, item) => acc.plus(money(item.amount).minus(money(item.paidAmount))), money(0))),
      ),
    }
  },
}
