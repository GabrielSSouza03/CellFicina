import { api } from './api'
import type { Paginated, Vehicle } from '../lib/types'

export const vehiclesService = {
  list: (params: Record<string, string | number> = {}) => {
    const query = new URLSearchParams(params as Record<string, string>).toString()
    return api.get<Paginated<Vehicle>>(`/vehicles?${query}`)
  },
  get: (id: string) => api.get<Vehicle>(`/vehicles/${id}`),
  create: (data: unknown) => api.post<Vehicle>('/vehicles', data),
  update: (id: string, data: unknown) => api.put<Vehicle>(`/vehicles/${id}`, data),
  remove: (id: string) => api.delete(`/vehicles/${id}`),
}
