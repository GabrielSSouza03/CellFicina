import { ArrowUpRight, MoreHorizontal } from 'lucide-react'

export function MetricCard({ icon: Icon, label, value, detail, trend, tone = 'blue' }: { icon: any; label: string; value: string; detail: string; trend?: string; tone?: string }) {
  return <div className="metric-card">
    <div className={`metric-icon ${tone}`}><Icon size={18} /></div>
    <div className="metric-copy"><span>{label}</span><strong>{value}</strong><small className={trend?.startsWith('+') ? 'positive' : ''}>{trend && <ArrowUpRight size={13} />} {detail}</small></div>
    <MoreHorizontal size={17} className="metric-more" />
  </div>
}

export function LoadingBlock({ label = 'Carregando...' }: { label?: string }) {
  return <div className="loading-block"><div className="spinner" /><span>{label}</span></div>
}

export function EmptyBlock({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="empty-block"><strong>{title}</strong><span>{subtitle}</span></div>
}

export function ErrorBanner({ message }: { message: string }) {
  return <div className="banner error">{message}</div>
}

export function Pagination({ page, pageCount, total, pageSize, onPage }: { page: number; pageCount: number; total: number; pageSize: number; onPage: (page: number) => void }) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const pages = Array.from({ length: Math.min(pageCount, 5) }, (_, i) => i + 1)
  return <div className="table-footer"><span>Mostrando {from}–{to} de {total} registros</span><div>
    <button className="page-btn" onClick={() => onPage(Math.max(1, page - 1))}>‹</button>
    {pages.map((item) => <button key={item} className={`page-btn ${item === page ? 'active' : ''}`} onClick={() => onPage(item)}>{item}</button>)}
    <button className="page-btn" onClick={() => onPage(Math.min(pageCount, page + 1))}>›</button>
  </div></div>
}
