export const STOCK_MOVEMENT_TYPES = ['ENTRADA', 'SAIDA'] as const
export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number]

export const STOCK_ORIGIN_TYPES = ['MANUAL', 'COMPRA', 'ORDEM_SERVICO', 'VENDA', 'AJUSTE', 'DEVOLUCAO'] as const
export type StockOriginType = (typeof STOCK_ORIGIN_TYPES)[number]

export const EXIT_REASON_CODES = ['VENDA', 'CONSUMO', 'PERDA', 'AVARIA', 'DEVOLUCAO', 'AJUSTE', 'OUTROS'] as const
export type ExitReason = (typeof EXIT_REASON_CODES)[number]

export const STOCK_STATUSES = ['NORMAL', 'ESTOQUE_BAIXO', 'SEM_ESTOQUE'] as const
export type StockStatus = (typeof STOCK_STATUSES)[number]

export const EXIT_REASONS: { value: ExitReason; label: string }[] = [
  { value: 'VENDA', label: 'Venda' },
  { value: 'CONSUMO', label: 'Consumo' },
  { value: 'PERDA', label: 'Perda' },
  { value: 'AVARIA', label: 'Avaria' },
  { value: 'DEVOLUCAO', label: 'Devolução' },
  { value: 'AJUSTE', label: 'Ajuste' },
  { value: 'OUTROS', label: 'Outros' },
]

export const ENTRY_ORIGINS: { value: StockOriginType; label: string }[] = [
  { value: 'MANUAL', label: 'Manual' },
  { value: 'COMPRA', label: 'Compra' },
  { value: 'AJUSTE', label: 'Ajuste' },
  { value: 'DEVOLUCAO', label: 'Devolução' },
]

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  NORMAL: 'Normal',
  ESTOQUE_BAIXO: 'Estoque baixo',
  SEM_ESTOQUE: 'Sem estoque',
}

export const ORIGIN_LABELS: Record<string, string> = {
  MANUAL: 'Manual',
  COMPRA: 'Compra',
  ORDEM_SERVICO: 'OS',
  VENDA: 'Venda',
  AJUSTE: 'Ajuste',
  DEVOLUCAO: 'Devolução',
}

export const REASON_LABELS: Record<string, string> = {
  VENDA: 'Venda',
  CONSUMO: 'Consumo',
  PERDA: 'Perda',
  AVARIA: 'Avaria',
  DEVOLUCAO: 'Devolução',
  AJUSTE: 'Ajuste',
  OUTROS: 'Outros',
  COMPRA: 'Compra',
  ENTRADA: 'Entrada',
  MANUAL: 'Manual',
}

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  ENTRADA: 'Entrada',
  SAIDA: 'Saída',
  ENTRY: 'Entrada',
  EXIT: 'Saída',
}

export function normalizeMovementType(type: string): StockMovementType | string {
  if (type === 'ENTRY') return 'ENTRADA'
  if (type === 'EXIT') return 'SAIDA'
  return type
}

export function stockStatusOf(quantity: number, minQuantity: number): StockStatus {
  if (quantity <= 0) return 'SEM_ESTOQUE'
  if (minQuantity > 0 && quantity <= minQuantity) return 'ESTOQUE_BAIXO'
  return 'NORMAL'
}

export function canDecrementStock(current: number, quantity: number, allowNegative: boolean) {
  return allowNegative || current >= quantity
}

export function originFromExitReason(reason: string): StockOriginType {
  if (reason === 'VENDA') return 'VENDA'
  if (reason === 'AJUSTE') return 'AJUSTE'
  if (reason === 'DEVOLUCAO') return 'DEVOLUCAO'
  return 'MANUAL'
}
