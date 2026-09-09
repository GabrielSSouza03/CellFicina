export const WORK_ORDER_STATUSES = [
  'DRAFT',
  'WAITING_APPROVAL',
  'APPROVED',
  'IN_PROGRESS',
  'WAITING_PART',
  'COMPLETED',
  'DELIVERED',
  'CANCELLED',
] as const

export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number]

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  DRAFT: 'Rascunho',
  WAITING_APPROVAL: 'Aguardando aprovação',
  APPROVED: 'Aprovada',
  IN_PROGRESS: 'Em execução',
  WAITING_PART: 'Aguardando peça',
  COMPLETED: 'Concluída',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelada',
}

const TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  DRAFT: ['WAITING_APPROVAL', 'APPROVED', 'CANCELLED'],
  WAITING_APPROVAL: ['DRAFT', 'APPROVED', 'CANCELLED'],
  APPROVED: ['IN_PROGRESS', 'WAITING_APPROVAL', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_PART', 'COMPLETED', 'CANCELLED'],
  WAITING_PART: ['IN_PROGRESS', 'CANCELLED'],
  COMPLETED: ['DELIVERED', 'IN_PROGRESS'],
  DELIVERED: [],
  CANCELLED: [],
}

export function canTransitionWorkOrder(from: WorkOrderStatus, to: WorkOrderStatus): boolean {
  if (from === to) return true
  return TRANSITIONS[from]?.includes(to) ?? false
}

export function assertWorkOrderTransition(from: WorkOrderStatus, to: WorkOrderStatus) {
  if (!canTransitionWorkOrder(from, to)) {
    throw new Error(
      `Transição de status inválida: ${WORK_ORDER_STATUS_LABELS[from]} → ${WORK_ORDER_STATUS_LABELS[to]}.`,
    )
  }
}

export const QUOTE_STATUSES = ['DRAFT', 'SENT', 'WAITING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED'] as const
export type QuoteStatus = (typeof QUOTE_STATUSES)[number]

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: 'Rascunho',
  SENT: 'Enviado',
  WAITING_APPROVAL: 'Aguardando aprovação',
  APPROVED: 'Aprovado',
  REJECTED: 'Recusado',
  EXPIRED: 'Expirado',
}

const QUOTE_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  DRAFT: ['SENT', 'WAITING_APPROVAL'],
  SENT: ['WAITING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED'],
  WAITING_APPROVAL: ['APPROVED', 'REJECTED', 'EXPIRED', 'SENT'],
  APPROVED: ['EXPIRED'],
  REJECTED: [],
  EXPIRED: ['DRAFT'],
}

export function canTransitionQuote(from: QuoteStatus, to: QuoteStatus): boolean {
  if (from === to) return true
  return QUOTE_TRANSITIONS[from]?.includes(to) ?? false
}

export function assertQuoteTransition(from: QuoteStatus, to: QuoteStatus) {
  if (!canTransitionQuote(from, to)) {
    throw new Error(`Transição de orçamento inválida: ${QUOTE_STATUS_LABELS[from]} → ${QUOTE_STATUS_LABELS[to]}.`)
  }
}

export const FINANCE_STATUSES = ['OPEN', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'] as const
export type FinanceStatus = (typeof FINANCE_STATUSES)[number]

export function resolveFinanceStatus(amount: number, paidAmount: number, dueDate: Date, now = new Date()): FinanceStatus {
  if (paidAmount <= 0 && dueDate < now) return 'OVERDUE'
  if (paidAmount <= 0) return 'OPEN'
  if (paidAmount >= amount) return 'PAID'
  if (dueDate < now) return 'OVERDUE'
  return 'PARTIAL'
}
