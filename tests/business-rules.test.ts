import { describe, expect, it } from 'vitest'
import { lineTotal, orderTotals, money } from '../src/backend/utils/money'
import { assertWorkOrderTransition, canTransitionWorkOrder, canTransitionQuote, resolveFinanceStatus } from '../src/backend/services/status-rules'
import { isValidCNPJ, isValidCPF, isValidPhone } from '../src/backend/validators/brazil'
import { canDecrementStock } from '../src/backend/services/catalog.service'
import { hashPassword } from '../src/backend/services/auth.service'
import bcrypt from 'bcryptjs'

describe('cálculo de valores da OS', () => {
  it('calcula total da linha com desconto', () => {
    expect(lineTotal(4, '62.50', '0').toFixed(2)).toBe('250.00')
    expect(lineTotal(1, '890', '90').toFixed(2)).toBe('800.00')
  })

  it('calcula subtotal, desconto, acréscimo e total', () => {
    const totals = orderTotals({ servicesTotal: '890.00', partsTotal: '250.00', discount: '40', surcharge: '10' })
    expect(totals.subtotal.toFixed(2)).toBe('1140.00')
    expect(totals.total.toFixed(2)).toBe('1110.00')
  })

  it('não permite total negativo', () => {
    const totals = orderTotals({ servicesTotal: '10', partsTotal: '0', discount: '50' })
    expect(totals.total.toFixed(2)).toBe('0.00')
  })

  it('evita erro de ponto flutuante em dinheiro', () => {
    expect(money('0.1').plus(money('0.2')).toFixed(2)).toBe('0.30')
  })
})

describe('transição de status da OS', () => {
  it('permite o fluxo principal', () => {
    expect(canTransitionWorkOrder('DRAFT', 'WAITING_APPROVAL')).toBe(true)
    expect(canTransitionWorkOrder('WAITING_APPROVAL', 'APPROVED')).toBe(true)
    expect(canTransitionWorkOrder('APPROVED', 'IN_PROGRESS')).toBe(true)
    expect(canTransitionWorkOrder('IN_PROGRESS', 'COMPLETED')).toBe(true)
    expect(canTransitionWorkOrder('COMPLETED', 'DELIVERED')).toBe(true)
  })

  it('bloqueia transições inválidas', () => {
    expect(canTransitionWorkOrder('DELIVERED', 'DRAFT')).toBe(false)
    expect(canTransitionWorkOrder('CANCELLED', 'IN_PROGRESS')).toBe(false)
    expect(() => assertWorkOrderTransition('DRAFT', 'DELIVERED')).toThrow()
  })
})

describe('orçamentos', () => {
  it('só converte a partir de aprovado na regra de transição', () => {
    expect(canTransitionQuote('DRAFT', 'APPROVED')).toBe(false)
    expect(canTransitionQuote('WAITING_APPROVAL', 'APPROVED')).toBe(true)
  })
})

describe('financeiro', () => {
  it('marca atraso e pagamento parcial', () => {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
    expect(resolveFinanceStatus(100, 0, yesterday)).toBe('OVERDUE')
    expect(resolveFinanceStatus(100, 40, new Date(Date.now() + 86400000))).toBe('PARTIAL')
    expect(resolveFinanceStatus(100, 100, yesterday)).toBe('PAID')
  })
})

describe('validação brasileira', () => {
  it('valida CPF, CNPJ e telefone', () => {
    expect(isValidCPF('390.533.447-05')).toBe(true)
    expect(isValidCPF('111.111.111-11')).toBe(false)
    expect(isValidCNPJ('04.252.011/0001-10')).toBe(true)
    expect(isValidPhone('(11) 99842-1098')).toBe(true)
  })
})

describe('estoque', () => {
  it('impede estoque negativo por padrão', () => {
    expect(canDecrementStock(2, 3, false)).toBe(false)
    expect(canDecrementStock(2, 2, false)).toBe(true)
    expect(canDecrementStock(2, 3, true)).toBe(true)
  })
})

describe('autenticação', () => {
  it('nunca armazena senha em texto puro', async () => {
    const hash = await hashPassword('Admin@123')
    expect(hash).not.toBe('Admin@123')
    expect(await bcrypt.compare('Admin@123', hash)).toBe(true)
    expect(await bcrypt.compare('outra', hash)).toBe(false)
  })
})
