import { api } from './api'
import type { CatalogService, Paginated, Product } from '../lib/types'

export const productsService = {
  list: (params: Record<string, string | number> = {}) => {
    const query = new URLSearchParams(params as Record<string, string>).toString()
    return api.get<Paginated<Product>>(`/products?${query}`)
  },
  get: (id: string) => api.get<Product>(`/products/${id}`),
  create: (data: unknown) => api.post<Product>('/products', data),
  update: (id: string, data: unknown) => api.put<Product>(`/products/${id}`, data),
  remove: (id: string) => api.delete(`/products/${id}`),
  entry: (data: unknown) => api.post('/stock/entries', data),
  exit: (data: unknown) => api.post('/stock/exits', data),
  movements: (params: Record<string, string | number> = {}) => {
    const query = new URLSearchParams(params as Record<string, string>).toString()
    return api.get(`/stock/movements?${query}`)
  },
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
