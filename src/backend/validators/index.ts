import { z } from 'zod'
import { documentTypeOf, isValidDocument, isValidPhone } from './brazil'

const moneyField = z.union([z.string(), z.number()]).transform((value) => String(value))

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional().default(''),
})

export const customerSchema = z.object({
  name: z.string().trim().min(3, 'Informe o nome completo do cliente.'),
  document: z.string().refine(isValidDocument, 'CPF ou CNPJ inválido.'),
  email: z.string().email('E-mail inválido.').optional().or(z.literal('')).transform((v) => v || undefined),
  phone: z.string().refine(isValidPhone, 'Telefone inválido.'),
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
  customerId: z.string().min(1, 'Selecione o cliente.'),
  brand: z.string().trim().min(2, 'Informe a marca.'),
  model: z.string().trim().min(1, 'Informe o modelo.'),
  version: z.string().optional(),
  year: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.coerce.number().int().min(1950).max(new Date().getFullYear() + 1).optional(),
  ),
  mileage: z.coerce.number().int().min(0).default(0),
  chassis: z.string().optional(),
  color: z.string().optional(),
  notes: z.string().optional(),
})

export const productSchema = z.object({
  sku: z.string().trim().min(1, 'Informe o código do produto.'),
  name: z.string().trim().min(2, 'Informe o nome do produto.'),
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
  code: z.string().trim().min(1),
  name: z.string().trim().min(2),
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
  customerId: z.string().min(1, 'Selecione o cliente.'),
  vehicleId: z.string().min(1, 'Selecione o aparelho.'),
  mechanicId: z.string().optional(),
  mileage: z.coerce.number().int().min(0).optional(),
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
  customerId: z.string().min(1),
  vehicleId: z.string().optional(),
  notes: z.string().optional(),
  discount: moneyField.default('0'),
  surcharge: moneyField.default('0'),
  validUntil: z.string().optional(),
  status: z.string().optional(),
  items: z.array(z.object({
    type: z.enum(['SERVICE', 'PART']),
    serviceId: z.string().optional(),
    productId: z.string().optional(),
    description: z.string().min(1),
    quantity: moneyField.default('1'),
    unitPrice: moneyField,
    discount: moneyField.default('0'),
  })).default([]),
})

export const receivableSchema = z.object({
  customerId: z.string().optional(),
  workOrderId: z.string().optional(),
  description: z.string().min(3),
  amount: moneyField,
  dueDate: z.string().min(1, 'Informe o vencimento.'),
})

export const payableSchema = z.object({
  supplierId: z.string().optional(),
  description: z.string().min(3),
  amount: moneyField,
  dueDate: z.string().min(1, 'Informe o vencimento.'),
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
  name: z.string().min(2).optional(),
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
