import { z } from 'zod'
import { documentTypeOf } from './brazil'

const blankToUndefined = (value: unknown) => (value === '' || value === null || value === undefined ? undefined : value)

const optionalText = z.union([z.string(), z.undefined(), z.null()]).transform((value) => (value ?? '').trim())

const optionalId = z.preprocess(blankToUndefined, z.string().min(1).optional())

const moneyField = z.union([z.string(), z.number()]).optional().transform((value) => {
  if (value === '' || value === undefined || value === null) return '0'
  return String(value)
})

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional().default(''),
})

export const customerSchema = z.object({
  name: optionalText,
  document: optionalText,
  email: optionalText.transform((value) => value || undefined),
  phone: optionalText,
  phone2: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  notes: z.string().optional(),
}).transform((data) => ({
  ...data,
  documentType: documentTypeOf(data.document),
}))

export const vehicleSchema = z.object({
  customerId: optionalId,
  brand: optionalText,
  model: optionalText,
  version: z.string().optional(),
  year: z.preprocess(blankToUndefined, z.coerce.number().int().optional()),
  mileage: z.preprocess((value) => (value === '' || value == null ? 0 : value), z.coerce.number().int().default(0)),
  chassis: z.string().optional(),
  color: z.string().optional(),
  notes: z.string().optional(),
})

const moneyPattern = /^\d+(\.\d+)?$/

function normalizeMoney(value: unknown) {
  if (value === '' || value === undefined || value === null) return undefined
  return String(value).trim().replace(/\s/g, '').replace(',', '.')
}

const requiredMoney = z.preprocess(
  (value) => normalizeMoney(value) ?? '0',
  z.string().regex(moneyPattern, 'Informe um valor monetário válido, maior ou igual a zero.'),
)

const optionalMoney = z.preprocess(
  normalizeMoney,
  z.string().regex(moneyPattern, 'Informe um valor monetário válido, maior ou igual a zero.').optional(),
)

const requiredName = (message: string) => z.string({ required_error: message }).trim().min(1, message)

const activeField = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return true
  if (value === true || value === 'true' || value === 'on' || value === 1 || value === '1') return true
  if (value === false || value === 'false' || value === 'off' || value === 0 || value === '0') return false
  return value
}, z.boolean())

export const productSchema = z.object({
  sku: requiredName('Informe o código do produto.'),
  name: requiredName('Informe o nome do produto.'),
  description: z.string().optional().transform((value) => value?.trim() || undefined),
  categoryId: optionalId,
  costPrice: requiredMoney,
  salePrice: requiredMoney,
  minQuantity: z.coerce.number().int().min(0, 'O estoque mínimo não pode ser negativo.').default(0),
  maxQuantity: z.coerce.number().int().min(0, 'O estoque máximo não pode ser negativo.').default(0),
  unit: z.string().trim().min(1, 'Informe a unidade de medida.').default('UN'),
  active: activeField,
}).superRefine((data, ctx) => {
  if (data.maxQuantity > 0 && data.maxQuantity < data.minQuantity) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'O estoque máximo deve ser maior ou igual ao mínimo.', path: ['maxQuantity'] })
  }
})

export const serviceSchema = z.object({
  code: optionalText,
  name: optionalText,
  description: z.string().optional(),
  categoryId: z.string().optional(),
  price: moneyField.default('0'),
  durationMin: z.coerce.number().int().min(0).optional(),
  active: z.boolean().default(true),
})

const movementQuantity = z.coerce.number({ invalid_type_error: 'Informe uma quantidade válida.' })
  .int('A quantidade deve ser um número inteiro.')
  .positive('A quantidade deve ser maior que zero.')

const optionalDate = z.string().optional().refine((value) => !value || !Number.isNaN(Date.parse(value)), 'Data inválida.')

export const stockEntrySchema = z.object({
  productId: z.string().trim().min(1, 'Selecione o produto.'),
  quantity: movementQuantity,
  unitCost: optionalMoney,
  occurredAt: optionalDate,
  supplierId: optionalId,
  supplierName: z.string().trim().max(120).optional(),
  documentNumber: z.string().trim().max(60).optional(),
  description: z.string().trim().max(500).optional(),
  originType: z.enum(['MANUAL', 'COMPRA', 'AJUSTE', 'DEVOLUCAO']).default('MANUAL'),
  originId: z.string().trim().optional(),
  reason: z.string().trim().max(80).optional(),
})

export const stockExitSchema = z.object({
  productId: z.string().trim().min(1, 'Selecione o produto.'),
  quantity: movementQuantity,
  reason: z.enum(['VENDA', 'CONSUMO', 'PERDA', 'AVARIA', 'DEVOLUCAO', 'AJUSTE', 'OUTROS'], {
    errorMap: () => ({ message: 'Selecione o motivo da saída.' }),
  }),
  occurredAt: optionalDate,
  description: z.string().trim().max(500).optional(),
  originType: z.enum(['MANUAL', 'COMPRA', 'ORDEM_SERVICO', 'VENDA', 'AJUSTE', 'DEVOLUCAO']).optional(),
  originId: z.string().trim().optional(),
})

export const stockMovementQuery = paginationQuery.extend({
  productId: z.string().optional(),
  type: z.string().optional(),
  reason: z.string().optional(),
  originType: z.string().optional(),
  userId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})

export const productListQuery = paginationQuery.extend({
  categoryId: z.string().optional(),
  stockStatus: z.string().optional(),
  active: z.string().optional(),
})

export const categorySchema = z.object({
  name: requiredName('Informe o nome da categoria.'),
})

export const productStatusSchema = z.object({
  active: z.boolean({ required_error: 'Informe se o produto está ativo.' }),
})

export const workOrderSchema = z.object({
  customerId: optionalId,
  vehicleId: optionalId,
  mechanicId: optionalId,
  mileage: z.preprocess(blankToUndefined, z.coerce.number().int().optional()),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  entryDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  discount: moneyField.default('0'),
  surcharge: moneyField.default('0'),
  status: z.string().optional(),
})

export const workOrderServiceItemSchema = z.object({
  serviceId: z.string().min(1),
  quantity: moneyField.default('1'),
  unitPrice: moneyField.optional(),
  discount: moneyField.default('0'),
  description: z.string().optional(),
})

export const workOrderPartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  unitPrice: moneyField.optional(),
  discount: moneyField.default('0'),
  description: z.string().optional(),
})

export const quoteSchema = z.object({
  customerId: optionalId,
  vehicleId: optionalId,
  notes: z.string().optional(),
  discount: moneyField.default('0'),
  surcharge: moneyField.default('0'),
  validUntil: z.string().optional(),
  status: z.string().optional(),
  items: z.array(z.object({
    type: z.enum(['SERVICE', 'PART']),
    serviceId: z.string().optional(),
    productId: z.string().optional(),
    description: optionalText,
    quantity: moneyField.default('1'),
    unitPrice: moneyField.default('0'),
    discount: moneyField.default('0'),
  })).default([]),
})

export const receivableSchema = z.object({
  customerId: optionalId,
  workOrderId: optionalId,
  description: optionalText,
  amount: moneyField,
  dueDate: optionalText,
})

export const payableSchema = z.object({
  supplierId: optionalId,
  description: optionalText,
  amount: moneyField,
  dueDate: optionalText,
})

export const paymentSchema = z.object({
  amount: moneyField,
  paymentMethodId: z.string().optional(),
  paidAt: z.string().optional(),
  notes: z.string().optional(),
})

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(1, 'Informe a senha.'),
})

export const settingsSchema = z.object({
  name: z.string().optional(),
  document: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  allowNegativeStock: z.boolean().optional(),
  lowStockThreshold: z.coerce.number().int().min(0).optional(),
  quoteValidityDays: z.coerce.number().int().min(1).optional(),
})
