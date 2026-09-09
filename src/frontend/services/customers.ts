import { api } from './api'
import type { Customer, Paginated } from '../lib/types'

export const customersService = {
  list: (params: Record<string, string | number> = {}) => {
    const query = new URLSearchParams(params as Record<string, string>).toString()
    return api.get<Paginated<Customer>>(`/customers?${query}`)
  },
  get: (id: string) => api.get<Customer>(`/customers/${id}`),
  create: (data: unknown) => api.post<Customer>('/customers', data),
  update: (id: string, data: unknown) => api.put<Customer>(`/customers/${id}`, data),
  remove: (id: string) => api.delete(`/customers/${id}`),
}
