import { api } from './api'
import type { Paginated, Quote } from '../lib/types'

export const quotesService = {
  list: (params: Record<string, string | number> = {}) => {
    const query = new URLSearchParams(params as Record<string, string>).toString()
    return api.get<Paginated<Quote>>(`/quotes?${query}`)
  },
  get: (id: string) => api.get<Quote>(`/quotes/${id}`),
  create: (data: unknown) => api.post<Quote>('/quotes', data),
  update: (id: string, data: unknown) => api.put<Quote>(`/quotes/${id}`, data),
  convert: (id: string) => api.post(`/quotes/${id}/convert`),
}
