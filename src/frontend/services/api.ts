const TOKEN_KEY = 'shoficina.token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

function apiBase() {
  const fromWindow = typeof window !== 'undefined' ? window.shoficina?.getApiUrl?.() : undefined
  return fromWindow || import.meta.env.VITE_API_URL || 'http://127.0.0.1:3456'
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const response = await fetch(`${apiBase()}${path}`, { ...options, headers })
  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(data.error || 'Não foi possível concluir a operação.', response.status)
  }
  return data as T
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

declare global {
  interface Window {
    shoficina?: {
      getApiUrl: () => string
      selectBackupPath: () => Promise<string | null>
      selectRestorePath: () => Promise<string | null>
      printHtml?: (html: string) => Promise<{ ok?: boolean; canceled?: boolean; via?: string }>
    }
  }
}
