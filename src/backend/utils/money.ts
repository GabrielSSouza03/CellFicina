import Decimal from 'decimal.js'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export type MoneyInput = string | number | Decimal

export function money(value: MoneyInput | null | undefined): Decimal {
  if (value === null || value === undefined || value === '') return new Decimal(0)
  try {
    return new Decimal(value)
  } catch {
    return new Decimal(0)
  }
}

export function moneyString(value: MoneyInput | null | undefined): string {
  return money(value).toFixed(2)
}

export function addMoney(...values: MoneyInput[]): Decimal {
  return values.reduce<Decimal>((acc, value) => acc.plus(money(value)), new Decimal(0))
}

export function lineTotal(quantity: MoneyInput, unitPrice: MoneyInput, discount: MoneyInput = 0): Decimal {
  const gross = money(quantity).times(money(unitPrice))
  const net = Decimal.max(gross.minus(money(discount)), new Decimal(0))
  return net.toDecimalPlaces(2)
}

export function orderTotals(params: {
  servicesTotal: MoneyInput
  partsTotal: MoneyInput
  discount?: MoneyInput
  surcharge?: MoneyInput
}) {
  const servicesTotal = money(params.servicesTotal).toDecimalPlaces(2)
  const partsTotal = money(params.partsTotal).toDecimalPlaces(2)
  const discount = money(params.discount).toDecimalPlaces(2)
  const surcharge = money(params.surcharge).toDecimalPlaces(2)
  const subtotal = servicesTotal.plus(partsTotal).toDecimalPlaces(2)
  const total = Decimal.max(subtotal.minus(discount).plus(surcharge), new Decimal(0)).toDecimalPlaces(2)
  return {
    servicesTotal,
    partsTotal,
    discount,
    surcharge,
    subtotal,
    total,
  }
}

export function formatBRL(value: MoneyInput | null | undefined): string {
  const amount = money(value).toNumber()
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)
}
