import { getPrisma } from '../database/client'
import { money, moneyString } from '../utils/money'
import { stockService } from './catalog.service'
import { financeService } from './finance.service'
import { serializeWorkOrder } from '../utils/serialize'

export const dashboardService = {
  async get(periodDays = 30) {
    const prisma = getPrisma()
    const from = new Date()
    from.setDate(from.getDate() - periodDays)

    const [
      open,
      inProgress,
      waitingApproval,
      completedMonth,
      recent,
      revenueOrders,
      finance,
      lowStock,
    ] = await Promise.all([
      prisma.workOrder.count({ where: { status: { notIn: ['DELIVERED', 'CANCELLED'] } } }),
      prisma.workOrder.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.workOrder.count({ where: { status: 'WAITING_APPROVAL' } }),
      prisma.workOrder.count({
        where: {
          status: { in: ['COMPLETED', 'DELIVERED'] },
          updatedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
      prisma.workOrder.findMany({
        include: { customer: true, vehicle: true, services: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.workOrder.findMany({
        where: { status: { in: ['COMPLETED', 'DELIVERED'] }, updatedAt: { gte: from } },
      }),
      financeService.summary(),
      stockService.lowStock(),
    ])

    const revenue = revenueOrders.reduce((acc, order) => acc.plus(money(order.total)), money(0))
    const byDay = new Map<string, ReturnType<typeof money>>()
    for (const order of revenueOrders) {
      const key = order.updatedAt.toISOString().slice(0, 10)
      byDay.set(key, (byDay.get(key) || money(0)).plus(money(order.total)))
    }
    const chart = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value: moneyString(value) }))

    const waitingPart = await prisma.workOrder.count({ where: { status: 'WAITING_PART' } })
    const completed = await prisma.workOrder.count({ where: { status: { in: ['COMPLETED', 'DELIVERED'] } } })

    return {
      metrics: {
        open,
        inProgress,
        waitingApproval,
        completedMonth,
        revenue: moneyString(revenue),
      },
      finance,
      lowStock,
      chart,
      recent: recent.map(serializeWorkOrder),
      statusDistribution: {
        inProgress,
        waitingApproval,
        completed,
        waitingPart,
        total: inProgress + waitingApproval + completed + waitingPart,
      },
    }
  },
}
