import { Prisma } from '@prisma/client'
import { getPrisma } from '../database/client'
import { moneyString } from '../utils/money'
import { formatDocument, formatPhone, formatPlate } from '../validators/brazil'
import { WORK_ORDER_STATUS_LABELS, type WorkOrderStatus } from '../services/status-rules'

export function serializeDecimal(value: unknown): string {
  if (value === null || value === undefined) return '0.00'
  return moneyString(String(value))
}

export function serializeCustomer(customer: any) {
  if (!customer) return null
  return {
    ...customer,
    documentFormatted: formatDocument(customer.document),
    phoneFormatted: formatPhone(customer.phone),
    vehicleCount: customer.vehicles?.length ?? 0,
    mainVehicle: customer.vehicles?.[0]
      ? `${customer.vehicles[0].brand} ${customer.vehicles[0].model}`
      : '—',
  }
}

export function serializeVehicle(vehicle: any) {
  if (!vehicle) return null
  return {
    ...vehicle,
    plateFormatted: formatPlate(vehicle.plate),
    customerName: vehicle.customer?.name,
  }
}

export function serializeWorkOrder(order: any) {
  if (!order) return null
  const status = order.status as WorkOrderStatus
  return {
    ...order,
    numberLabel: `#OS-${String(order.number).padStart(4, '0')}`,
    statusLabel: WORK_ORDER_STATUS_LABELS[status] || order.status,
    total: serializeDecimal(order.total),
    subtotal: serializeDecimal(order.subtotal),
    discount: serializeDecimal(order.discount),
    surcharge: serializeDecimal(order.surcharge),
    servicesTotal: serializeDecimal(order.servicesTotal),
    partsTotal: serializeDecimal(order.partsTotal),
    customerName: order.customer?.name,
    vehicleLabel: order.vehicle ? `${order.vehicle.brand} ${order.vehicle.model}` : '',
    plate: order.vehicle?.plate,
    mechanicName: order.mechanic?.name,
    customer: serializeCustomer(order.customer),
    vehicle: serializeVehicle(order.vehicle),
    services: order.services?.map((item: any) => ({
      ...item,
      quantity: serializeDecimal(item.quantity),
      unitPrice: serializeDecimal(item.unitPrice),
      discount: serializeDecimal(item.discount),
      total: serializeDecimal(item.total),
    })),
    parts: order.parts?.map((item: any) => ({
      ...item,
      unitPrice: serializeDecimal(item.unitPrice),
      discount: serializeDecimal(item.discount),
      total: serializeDecimal(item.total),
    })),
  }
}

export function serializeProduct(product: any) {
  if (!product) return null
  return {
    ...product,
    costPrice: serializeDecimal(product.costPrice),
    salePrice: serializeDecimal(product.salePrice),
    categoryName: product.category?.name,
  }
}

export function serializeService(service: any) {
  if (!service) return null
  return {
    ...service,
    price: serializeDecimal(service.price),
    categoryName: service.category?.name,
  }
}

export function serializeQuote(quote: any) {
  if (!quote) return null
  return {
    ...quote,
    numberLabel: `#ORC-${String(quote.number).padStart(4, '0')}`,
    total: serializeDecimal(quote.total),
    subtotal: serializeDecimal(quote.subtotal),
    discount: serializeDecimal(quote.discount),
    surcharge: serializeDecimal(quote.surcharge),
    customerName: quote.customer?.name,
    vehicleLabel: quote.vehicle ? `${quote.vehicle.brand} ${quote.vehicle.model}` : '',
    items: quote.items?.map((item: any) => ({
      ...item,
      quantity: serializeDecimal(item.quantity),
      unitPrice: serializeDecimal(item.unitPrice),
      discount: serializeDecimal(item.discount),
      total: serializeDecimal(item.total),
    })),
  }
}

export function serializeAccount(account: any) {
  if (!account) return null
  return {
    ...account,
    amount: serializeDecimal(account.amount),
    paidAmount: serializeDecimal(account.paidAmount),
    balance: serializeDecimal(Number(account.amount) - Number(account.paidAmount)),
    customerName: account.customer?.name,
    supplierName: account.supplier?.name,
  }
}

export function paginated<T>(items: T[], total: number, page: number, pageSize: number) {
  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  }
}

export type { Prisma }
