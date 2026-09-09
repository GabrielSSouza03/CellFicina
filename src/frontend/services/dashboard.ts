import { api } from './api'
import type { DashboardData } from '../lib/types'

export const dashboardService = {
  get: (days = 30) => api.get<DashboardData>(`/dashboard?days=${days}`),
}

export const settingsService = {
  get: () => api.get('/settings'),
  update: (data: unknown) => api.put('/settings', data),
  backup: (path: string) => api.post('/settings/backup', { path }),
  restore: (path: string) => api.post('/settings/restore', { path }),
}
