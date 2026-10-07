import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { productSchema, stockEntrySchema, stockExitSchema } from '../src/backend/validators'
import { canDecrementStock, stockStatusOf } from '../src/shared/stock'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cellficina-stock-'))
const dbFile = path.join(dir, 'stock.db')
delete process.env.APP_USER_DATA
process.env.DATABASE_URL = `file:${dbFile}`

type StockModule = typeof import('../src/backend/services/stock.service')
type ClientModule = typeof import('../src/backend/database/client')

let stockService: StockModule['stockService']
let getPrisma: ClientModule['getPrisma']
let disconnectPrisma: ClientModule['disconnectPrisma']

beforeAll(async () => {
  execFileSync('npx', ['prisma', 'db', 'push', '--schema', 'database/prisma/schema.prisma', '--skip-generate', '--accept-data-loss'], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: `file:${dbFile}` },
    stdio: 'pipe',
  })
  const client = await import('../src/backend/database/client')
  const stock = await import('../src/backend/services/stock.service')
  getPrisma = client.getPrisma
  disconnectPrisma = client.disconnectPrisma
  stockService = stock.stockService
}, 60000)

afterAll(async () => {
  if (disconnectPrisma) await disconnectPrisma()
  fs.rmSync(dir, { recursive: true, force: true })
})

async function createProduct(quantity = 10, extra: { active?: boolean } = {}) {
  return getPrisma().product.create({
    data: {
      sku: `FIL-${Math.random().toString(36).slice(2, 8)}`,
      name: 'Filtro de óleo',
      costPrice: '10.00',
      salePrice: '45.00',
      quantity,
      minQuantity: 5,
      maxQuantity: 50,
      unit: 'UN',
      ...extra,
    },
  })
}

describe('validações de estoque', () => {
  it('classifica a situação do saldo', () => {
    expect(stockStatusOf(0, 5)).toBe('SEM_ESTOQUE')
    expect(stockStatusOf(3, 5)).toBe('ESTOQUE_BAIXO')
    expect(stockStatusOf(28, 5)).toBe('NORMAL')
    expect(canDecrementStock(2, 3, false)).toBe(false)
    expect(canDecrementStock(2, 3, true)).toBe(true)
  })

  it('exige nome e recusa preço negativo', () => {
    expect(() => productSchema.parse({ sku: 'FIL-001', name: '  ' })).toThrow(/nome/i)
    expect(() => productSchema.parse({ sku: 'FIL-001', name: 'Filtro', costPrice: '-1' })).toThrow()
  })

  it('aceita preço com vírgula e não expõe saldo no cadastro', () => {
    const parsed = productSchema.parse({ sku: 'FIL-001', name: 'Filtro', costPrice: '25,00', salePrice: '45' })
    expect(parsed.costPrice).toBe('25.00')
    expect('quantity' in parsed).toBe(false)
  })

  it('recusa quantidade inválida e saída sem motivo', () => {
    expect(() => stockEntrySchema.parse({ productId: 'abc', quantity: 0 })).toThrow()
    expect(() => stockExitSchema.parse({ productId: 'abc', quantity: 2 })).toThrow()
    expect(stockExitSchema.parse({ productId: 'abc', quantity: 2, reason: 'CONSUMO' }).reason).toBe('CONSUMO')
  })
})

describe('movimentação de estoque', () => {
  it('registra entrada e saída pelo contrato da API', async () => {
    const product = await createProduct(10)
    const entry = await stockService.entry({
      productId: product.id,
      quantity: '20',
      unitCost: '25,00',
      originType: 'COMPRA',
      documentNumber: 'NF 12345',
      supplierName: 'Auto Peças XYZ',
    })
    expect(entry.previousStock).toBe(10)
    expect(entry.resultingStock).toBe(30)
    expect(entry.movement?.supplierName).toBe('Auto Peças XYZ')
    expect(entry.movement?.documentNumber).toBe('NF 12345')

    const exit = await stockService.exit({ productId: product.id, quantity: 2, reason: 'CONSUMO' })
    expect(exit.previousStock).toBe(30)
    expect(exit.resultingStock).toBe(28)
    expect(await getPrisma().stockMovement.count({ where: { productId: product.id } })).toBe(2)
  })

  it('entrada aumenta o estoque e registra saldos', async () => {
    const product = await createProduct(10)
    const result = await stockService.apply({
      productId: product.id,
      direction: 'ENTRADA',
      quantity: 20,
      unitCost: '25.00',
      originType: 'COMPRA',
      reason: 'COMPRA',
      documentNumber: 'NF 12345',
    })

    expect(result.previousStock).toBe(10)
    expect(result.resultingStock).toBe(30)
    expect(result.product?.quantity).toBe(30)
    expect(result.movement?.type).toBe('ENTRADA')
    expect(result.movement?.previousStock).toBe(10)
    expect(result.movement?.resultingStock).toBe(30)
    expect(result.movement?.quantity).toBe(20)

    const stored = await getPrisma().product.findUniqueOrThrow({ where: { id: product.id } })
    expect(stored.quantity).toBe(30)
    expect(Number(stored.costPrice)).toBe(20)
    const movements = await getPrisma().stockMovement.count({ where: { productId: product.id } })
    expect(movements).toBe(1)
  })

  it('saída diminui o estoque e registra saldos', async () => {
    const product = await createProduct(30)
    const result = await stockService.apply({
      productId: product.id,
      direction: 'SAIDA',
      quantity: 2,
      reason: 'CONSUMO',
      originType: 'ORDEM_SERVICO',
      originId: 'os-1',
    })
    expect(result.previousStock).toBe(30)
    expect(result.resultingStock).toBe(28)
    expect(result.movement?.type).toBe('SAIDA')
    expect(result.movement?.originType).toBe('ORDEM_SERVICO')
    const stored = await getPrisma().product.findUniqueOrThrow({ where: { id: product.id } })
    expect(stored.quantity).toBe(28)
  })

  it('não permite saída maior que o estoque e não grava movimento', async () => {
    const product = await createProduct(2)
    await expect(stockService.apply({
      productId: product.id,
      direction: 'SAIDA',
      quantity: 3,
      reason: 'VENDA',
      originType: 'VENDA',
    })).rejects.toThrow(/insuficiente/i)
    const stored = await getPrisma().product.findUniqueOrThrow({ where: { id: product.id } })
    expect(stored.quantity).toBe(2)
    expect(await getPrisma().stockMovement.count({ where: { productId: product.id } })).toBe(0)
  })

  it('desfaz estoque e movimento se a transação falhar', async () => {
    const product = await createProduct(0)
    await expect(getPrisma().$transaction(async (tx) => {
      await stockService.apply({
        productId: product.id,
        direction: 'ENTRADA',
        quantity: 4,
        originType: 'MANUAL',
      }, tx)
      throw new Error('falha de teste')
    })).rejects.toThrow(/falha de teste/)
    const stored = await getPrisma().product.findUniqueOrThrow({ where: { id: product.id } })
    expect(stored.quantity).toBe(0)
    expect(await getPrisma().stockMovement.count({ where: { productId: product.id } })).toBe(0)
  })

  it('mantém o saldo consistente em entradas simultâneas', async () => {
    const product = await createProduct(10)
    await Promise.all([
      stockService.apply({ productId: product.id, direction: 'ENTRADA', quantity: 5, originType: 'MANUAL' }),
      stockService.apply({ productId: product.id, direction: 'ENTRADA', quantity: 3, originType: 'MANUAL' }),
    ])
    const stored = await getPrisma().product.findUniqueOrThrow({ where: { id: product.id } })
    expect(stored.quantity).toBe(18)
    const movements = await getPrisma().stockMovement.findMany({ where: { productId: product.id } })
    expect(movements).toHaveLength(2)
    const ordered = [...movements].sort((a, b) => a.previousStock - b.previousStock)
    expect(ordered[0].previousStock).toBe(10)
    expect(ordered[1].previousStock).toBe(ordered[0].resultingStock)
    expect(ordered[1].resultingStock).toBe(18)
    for (const movement of movements) {
      expect(movement.resultingStock).toBe(movement.previousStock + movement.quantity)
    }
  })

  it('não deixa duas saídas consumirem o mesmo saldo', async () => {
    const product = await createProduct(5)
    const results = await Promise.allSettled([
      stockService.apply({ productId: product.id, direction: 'SAIDA', quantity: 3, reason: 'VENDA', originType: 'VENDA' }),
      stockService.apply({ productId: product.id, direction: 'SAIDA', quantity: 3, reason: 'VENDA', originType: 'VENDA' }),
    ])
    expect(results.filter((item) => item.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((item) => item.status === 'rejected')).toHaveLength(1)
    const stored = await getPrisma().product.findUniqueOrThrow({ where: { id: product.id } })
    expect(stored.quantity).toBe(2)
    expect(await getPrisma().stockMovement.count({ where: { productId: product.id } })).toBe(1)
  })

  it('recusa quantidade inválida, produto inexistente e saída de inativo', async () => {
    await expect(stockService.apply({
      productId: 'nao-existe',
      direction: 'ENTRADA',
      quantity: 1,
      originType: 'MANUAL',
    })).rejects.toThrow(/não encontrado/i)
    await expect(stockService.apply({
      productId: (await createProduct(4)).id,
      direction: 'ENTRADA',
      quantity: 0,
      originType: 'MANUAL',
    })).rejects.toThrow(/maior que zero/i)
    const inactive = await createProduct(4, { active: false })
    await expect(stockService.apply({
      productId: inactive.id,
      direction: 'SAIDA',
      quantity: 1,
      reason: 'PERDA',
      originType: 'MANUAL',
    })).rejects.toThrow(/inativo/i)
    const stored = await getPrisma().product.findUniqueOrThrow({ where: { id: inactive.id } })
    expect(stored.quantity).toBe(4)
  })

  it('permite saldo negativo apenas quando a configuração existe', async () => {
    const workshop = await getPrisma().workshop.create({
      data: { name: 'Teste', settings: { create: { allowNegativeStock: true } } },
    })
    try {
      const product = await createProduct(1)
      const result = await stockService.apply({
        productId: product.id,
        direction: 'SAIDA',
        quantity: 3,
        reason: 'AJUSTE',
        originType: 'AJUSTE',
      })
      expect(result.previousStock).toBe(1)
      expect(result.resultingStock).toBe(-2)
    } finally {
      await getPrisma().workshop.delete({ where: { id: workshop.id } })
    }
  })
})
