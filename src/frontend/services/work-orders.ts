import { api } from './api'
import type { Paginated, WorkOrder } from '../lib/types'

export const workOrdersService = {
  list: (params: Record<string, string | number> = {}) => {
    const query = new URLSearchParams(params as Record<string, string>).toString()
    return api.get<Paginated<WorkOrder>>(`/work-orders?${query}`)
  },
  get: (id: string) => api.get<WorkOrder>(`/work-orders/${id}`),
  create: (data: unknown) => api.post<WorkOrder>('/work-orders', data),
  update: (id: string, data: unknown) => api.put<WorkOrder>(`/work-orders/${id}`, data),
  remove: (id: string) => api.delete(`/work-orders/${id}`),
  changeStatus: (id: string, status: string, note?: string) => api.post<WorkOrder>(`/work-orders/${id}/status`, { status, note }),
  addService: (id: string, data: unknown) => api.post<WorkOrder>(`/work-orders/${id}/services`, data),
  addPart: (id: string, data: unknown) => api.post<WorkOrder>(`/work-orders/${id}/parts`, data),
  removeService: (id: string, itemId: string) => api.delete<WorkOrder>(`/work-orders/${id}/services/${itemId}`),
  removePart: (id: string, itemId: string) => api.delete<WorkOrder>(`/work-orders/${id}/parts/${itemId}`),
}
