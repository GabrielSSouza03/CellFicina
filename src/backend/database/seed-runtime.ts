import bcrypt from 'bcryptjs'
import { getPrisma } from './client'
import { logger } from '../utils/logger'

const PERMISSIONS = [
  'customers.read', 'customers.write', 'customers.delete',
  'vehicles.read', 'vehicles.write', 'vehicles.delete',
  'work-orders.read', 'work-orders.write', 'work-orders.delete',
  'products.read', 'products.write', 'products.delete',
  'stock.read', 'stock.write',
  'quotes.read', 'quotes.write',
  'finance.read', 'finance.write',
  'dashboard.read',
  'settings.read', 'settings.write',
  'backup.write',
  '*',
]

const ROLE_MAP: Record<string, string[]> = {
  ADMIN: ['*'],
  MANAGER: PERMISSIONS.filter((code) => code !== '*'),
  MECHANIC: ['customers.read', 'vehicles.read', 'work-orders.read', 'work-orders.write', 'products.read', 'dashboard.read'],
  ATTENDANT: ['customers.read', 'customers.write', 'vehicles.read', 'vehicles.write', 'work-orders.read', 'work-orders.write', 'quotes.read', 'quotes.write', 'products.read', 'dashboard.read'],
  FINANCE: ['finance.read', 'finance.write', 'quotes.read', 'dashboard.read', 'customers.read'],
}

export async function seedIfEmpty() {
  const prisma = getPrisma()
  const users = await prisma.user.count()
  if (users > 0) return
  await seedDatabase()
}

export async function seedDatabase() {
  const prisma = getPrisma()
  logger.info('database', 'Seeding initial workshop setup')

  const permissionRecords = []
  for (const code of PERMISSIONS) {
    permissionRecords.push(await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, description: code },
    }))
  }
  const permissionByCode = Object.fromEntries(permissionRecords.map((item) => [item.code, item]))

  const roles: Record<string, { id: string }> = {}
  for (const [name, codes] of Object.entries(ROLE_MAP)) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name, description: name },
    })
    roles[name] = role
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } })
    await prisma.rolePermission.createMany({
      data: codes.map((code) => ({ roleId: role.id, permissionId: permissionByCode[code].id })),
    })
  }

  const passwordHash = await bcrypt.hash('Admin@123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@shoficina.local' },
    update: { name: 'Edson' },
    create: {
      name: 'Edson',
      email: 'admin@shoficina.local',
      passwordHash,
      roleId: roles.ADMIN.id,
    },
  })

  const existingWorkshop = await prisma.workshop.findFirst()
  const workshop = existingWorkshop || await prisma.workshop.create({
    data: {
      name: 'Loja do Alemão Celulares',
      document: '28123456000190',
      phone: '1133334444',
      email: 'contato@celularprime.com',
      city: 'São Paulo',
      state: 'SP',
      settings: { create: { allowNegativeStock: false, lowStockThreshold: 5, quoteValidityDays: 15 } },
    },
  })

  await prisma.paymentMethod.createMany({
    data: [
      { name: 'Dinheiro' },
      { name: 'PIX' },
      { name: 'Cartão de crédito' },
      { name: 'Cartão de débito' },
      { name: 'Boleto' },
    ],
    skipDuplicates: true,
  })

  logger.info('database', 'Seed completed', { workshop: workshop.name, admin: admin.email })
}

export async function clearOperationalData() {
  const prisma = getPrisma()
  logger.info('database', 'Clearing operational mock data')

  await prisma.payment.deleteMany()
  await prisma.accountReceivable.deleteMany()
  await prisma.accountPayable.deleteMany()
  await prisma.workOrder.deleteMany()
  await prisma.quote.deleteMany()
  await prisma.stockMovement.deleteMany()
  await prisma.vehicle.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.product.deleteMany()
  await prisma.service.deleteMany()
  await prisma.productCategory.deleteMany()
  await prisma.serviceCategory.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.user.deleteMany({
    where: { email: { not: 'admin@shoficina.local' } },
  })

  logger.info('database', 'Operational data cleared')
}
