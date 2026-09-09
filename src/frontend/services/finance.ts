import { api } from './api'
import type { FinanceAccount, Paginated } from '../lib/types'

export const financeService = {
  receivables: (params: Record<string, string | number> = {}) => {
    const query = new URLSearchParams(params as Record<string, string>).toString()
    return api.get<Paginated<FinanceAccount>>(`/finance/receivables?${query}`)
  },
  payables: (params: Record<string, string | number> = {}) => {
    const query = new URLSearchParams(params as Record<string, string>).toString()
    return api.get<Paginated<FinanceAccount>>(`/finance/payables?${query}`)
  },
  createReceivable: (data: unknown) => api.post('/finance/receivables', data),
  createPayable: (data: unknown) => api.post('/finance/payables', data),
  updateReceivable: (id: string, data: unknown) => api.put(`/finance/receivables/${id}`, data),
  updatePayable: (id: string, data: unknown) => api.put(`/finance/payables/${id}`, data),
  payReceivable: (id: string, data: unknown) => api.post(`/finance/receivables/${id}/payments`, data),
  payPayable: (id: string, data: unknown) => api.post(`/finance/payables/${id}/payments`, data),
  summary: () => api.get('/finance/summary'),
}
