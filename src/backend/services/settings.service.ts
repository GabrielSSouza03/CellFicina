import { getPrisma } from '../database/client'
import { settingsSchema } from '../validators'
import { backupDatabase, restoreDatabase } from '../database/migrate'

export const settingsService = {
  async get() {
    const prisma = getPrisma()
    const workshop = await prisma.workshop.findFirst({ include: { settings: true } })
    const methods = await prisma.paymentMethod.findMany({ where: { active: true } })
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: { select: { name: true } }, active: true },
    })
    return { workshop, paymentMethods: methods, users }
  },
  async update(input: unknown) {
    const data = settingsSchema.parse(input)
    const prisma = getPrisma()
    const workshop = await prisma.workshop.findFirst({ include: { settings: true } })
    if (!workshop) throw new Error('Loja não inicializada.')
    const updated = await prisma.workshop.update({
      where: { id: workshop.id },
      data: {
        name: data.name ?? workshop.name,
        document: data.document || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zipCode: data.zipCode || null,
        settings: {
          update: {
            allowNegativeStock: data.allowNegativeStock,
            lowStockThreshold: data.lowStockThreshold,
            quoteValidityDays: data.quoteValidityDays,
          },
        },
      },
      include: { settings: true },
    })
    return updated
  },
  backup(destination: string) {
    return backupDatabase(destination)
  },
  restore(source: string) {
    return restoreDatabase(source)
  },
}
