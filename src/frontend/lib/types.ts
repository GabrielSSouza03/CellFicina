export type Paginated<T> = {
  items: T[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export type Customer = {
  id: string
  name: string
  document: string
  documentType: string
  documentFormatted: string
  email?: string
  phone: string
  phoneFormatted: string
  city?: string
  notes?: string
  vehicleCount: number
  mainVehicle: string
  vehicles?: Vehicle[]
  updatedAt: string
}

export type Vehicle = {
  id: string
  customerId: string
  customerName?: string
  plate: string
  plateFormatted: string
  brand: string
  model: string
  version?: string
  year?: number
  mileage: number
  chassis?: string
  notes?: string
}

export type WorkOrder = {
  id: string
  number: number
  numberLabel: string
  status: string
  statusLabel: string
  customerId: string
  vehicleId: string
  customerName?: string
  vehicleLabel?: string
  plate?: string
  mechanicName?: string
  mechanicId?: string
  diagnosis?: string
  notes?: string
  mileage?: number
  entryDate: string
  deliveryDate?: string
  discount: string
  surcharge: string
  servicesTotal: string
  partsTotal: string
  subtotal: string
  total: string
  services?: WorkOrderService[]
  parts?: WorkOrderPart[]
  history?: { id: string; fromStatus?: string; toStatus: string; note?: string; createdAt: string }[]
  customer?: Customer
  vehicle?: Vehicle
}

export type WorkOrderService = {
  id: string
  serviceId: string
  description: string
  quantity: string
  unitPrice: string
  discount: string
  total: string
}

export type WorkOrderPart = {
  id: string
  productId: string
  description: string
  quantity: number
  unitPrice: string
  discount: string
  total: string
}

export type Product = {
  id: string
  sku: string
  name: string
  quantity: number
  minQuantity: number
  salePrice: string
  costPrice: string
  categoryName?: string
}

export type CatalogService = {
  id: string
  code: string
  name: string
  price: string
  categoryName?: string
}

export type Quote = {
  id: string
  number: number
  numberLabel: string
  status: string
  customerName?: string
  vehicleLabel?: string
  total: string
  subtotal: string
  discount: string
  surcharge: string
  notes?: string
  customerId: string
  vehicleId?: string
  items?: { id: string; type: string; description: string; quantity: string; unitPrice: string; total: string; serviceId?: string; productId?: string }[]
}

export type FinanceAccount = {
  id: string
  description: string
  amount: string
  paidAmount: string
  balance: string
  dueDate: string
  status: string
  customerName?: string
  supplierName?: string
}

export type DashboardData = {
  metrics: { open: number; inProgress: number; waitingApproval: number; completedMonth: number; revenue: string }
  finance: { receivablesOpen: string; payablesOpen: string; overdueReceivables: string; balance: string }
  lowStock: Product[]
  chart: { date: string; value: string }[]
  recent: WorkOrder[]
  statusDistribution: { inProgress: number; waitingApproval: number; completed: number; waitingPart: number; total: number }
}

export type Workshop = {
  id: string
  name: string
  document?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
}

export type AuthUser = {
  id: string
  name: string
  email: string
  role: string
  permissions: string[]
}
