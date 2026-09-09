import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../services/api'

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fn())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os dados.')
    } finally {
      setLoading(false)
    }
  }, deps)

  useEffect(() => { void reload() }, [reload])

  return { data, loading, error, reload, setData }
}

export function formatBRL(value?: string | number | null) {
  const amount = Number(value || 0)
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)
}

export function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return date.toLocaleDateString('pt-BR')
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  if (date.toDateString() === yesterday.toDateString()) return `Ontem, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
  return date.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function initials(name?: string) {
  return (name || '?').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
}

export const statusStyles: Record<string, string> = {
  'Em execução': 'status-blue',
  'Aguardando aprovação': 'status-amber',
  Concluída: 'status-green',
  'Aguardando peça': 'status-purple',
  Entregue: 'status-slate',
  Rascunho: 'status-slate',
  Aprovada: 'status-blue',
  Cancelada: 'status-red',
  Enviado: 'status-blue',
  Aprovado: 'status-green',
  Recusado: 'status-red',
  Expirado: 'status-slate',
  OPEN: 'status-amber',
  PARTIAL: 'status-purple',
  PAID: 'status-green',
  OVERDUE: 'status-red',
  CANCELLED: 'status-slate',
  DRAFT: 'status-slate',
  WAITING_APPROVAL: 'status-amber',
  APPROVED: 'status-blue',
  IN_PROGRESS: 'status-blue',
  WAITING_PART: 'status-purple',
  COMPLETED: 'status-green',
  DELIVERED: 'status-slate',
  SENT: 'status-blue',
  REJECTED: 'status-red',
  EXPIRED: 'status-slate',
}

export const financeLabels: Record<string, string> = {
  OPEN: 'Em aberto',
  PARTIAL: 'Parcial',
  PAID: 'Pago',
  OVERDUE: 'Em atraso',
  CANCELLED: 'Cancelado',
}

export function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}
