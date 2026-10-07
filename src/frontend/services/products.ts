import { api } from './api'
import type { CatalogService, Paginated, Product, ProductCategory, StockDashboard, StockMovement, StockMutationResult, StockOption } from '../lib/types'

function query(params: Record<string, string | number | undefined> = {}) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || value === 'ALL') continue
    search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

export const productsService = {
  list: (params: Record<string, string | number | undefined> = {}) => api.get<Paginated<Product>>(`/products${query(params)}`),
  get: (id: string) => api.get<Product>(`/products/${id}`),
  create: (data: unknown) => api.post<Product>('/products', data),
  update: (id: string, data: unknown) => api.put<Product>(`/products/${id}`, data),
  remove: (id: string) => api.delete(`/products/${id}`),
  setStatus: (id: string, active: boolean) => api.patch<Product>(`/products/${id}/status`, { active }),
  categories: () => api.get<ProductCategory[]>('/products/categories'),
  createCategory: (name: string) => api.post<ProductCategory>('/products/categories', { name }),
  entry: (data: unknown) => api.post<StockMutationResult>('/stock/entries', data),
  exit: (data: unknown) => api.post<StockMutationResult>('/stock/exits', data),
  movements: (params: Record<string, string | number | undefined> = {}) => api.get<Paginated<StockMovement>>(`/stock/movements${query(params)}`),
  dashboard: () => api.get<StockDashboard>('/stock/dashboard'),
  options: () => api.get<Array<StockOption & { sku: string }>>('/stock/product-options'),
  suppliers: () => api.get<StockOption[]>('/stock/suppliers'),
  users: () => api.get<StockOption[]>('/stock/users'),
}

export const servicesService = {
  list: (params: Record<string, string | number> = {}) => {
    const query = new URLSearchParams(params as Record<string, string>).toString()
    return api.get<Paginated<CatalogService>>(`/services?${query}`)
  },
  create: (data: unknown) => api.post<CatalogService>('/services', data),
  update: (id: string, data: unknown) => api.put<CatalogService>(`/services/${id}`, data),
  remove: (id: string) => api.delete(`/services/${id}`),
}
