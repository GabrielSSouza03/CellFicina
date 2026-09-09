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

export const productSchema = z.object({
  sku: optionalText,
  name: optionalText,
  description: z.string().optional(),
  categoryId: z.string().optional(),
  costPrice: moneyField.default('0'),
  salePrice: moneyField.default('0'),
  quantity: z.coerce.number().int().min(0).default(0),
  minQuantity: z.coerce.number().int().min(0).default(0),
  unit: z.string().default('UN'),
  active: z.boolean().default(true),
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

export const stockMovementSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive('Informe uma quantidade válida.'),
  unitCost: moneyField.optional(),
  reason: z.string().optional(),
  reference: z.string().optional(),
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
