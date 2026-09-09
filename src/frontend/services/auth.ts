import { api } from './api'
import type { AuthUser } from '../lib/types'

export const authService = {
  login: (email: string, password: string) => api.post<{ token: string; user: AuthUser }>('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get<AuthUser>('/auth/me'),
}
