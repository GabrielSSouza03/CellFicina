import {
  Activity, AlertTriangle, ArrowUpRight, CheckCircle2, ClipboardList, Clock3, FileText, MoreHorizontal, Plus, Users, Wrench,
} from 'lucide-react'
import { MetricCard, LoadingBlock, ErrorBanner } from '../components/MetricCard'
import { dashboardService } from '../services/dashboard'
import { formatBRL, formatDateTime, greeting, initials, statusStyles, useAsync } from '../hooks/useAsync'
import { useAuth } from '../context/AuthContext'

export function Dashboard({ onNavigate }: { onNavigate: (label: string) => void }) {
  const { user } = useAuth()
  const { data, loading, error } = useAsync(() => dashboardService.get(30), [])
  const firstName = user?.name?.split(' ')[0] || 'Alemão'

  if (loading && !data) return <LoadingBlock label="Carregando dashboard..." />
  if (error) return <ErrorBanner message={error} />
  if (!data) return null

  const dist = data.statusDistribution
  const total = dist.total || 1
  const p1 = (dist.inProgress / total) * 100
  const p2 = p1 + (dist.waitingApproval / total) * 100
  const donut = `conic-gradient(#2f6df6 0 ${p1}%, #edac40 ${p1}% ${p2}%, #44bd86 ${p2}% 100%)`
  const attentionCount = dist.waitingApproval + dist.waitingPart

  return <>
    <div className="page-heading"><div><p className="eyebrow">Visão geral</p><h1>{greeting()}, {firstName}</h1><p className="subheading">Acompanhe o desempenho da loja e da assistência hoje.</p></div><div className="heading-actions"><button className="btn primary" onClick={() => onNavigate('Nova Ordem de Serviço')}><Plus size={17} /> Nova ordem</button></div></div>
    <section className="metric-grid">
      <MetricCard icon={ClipboardList} label="OS abertas" value={String(data.metrics.open).padStart(2, '0')} detail="Ordens ativas agora" trend="+" />
      <MetricCard icon={Wrench} label="Em andamento" value={String(data.metrics.inProgress).padStart(2, '0')} detail="Em manutenção técnica" tone="violet" />
      <MetricCard icon={Clock3} label="Aguardando aprovação" value={String(data.metrics.waitingApproval).padStart(2, '0')} detail="Aguardando resposta do cliente" tone="amber" />
      <MetricCard icon={CheckCircle2} label="Concluídas no mês" value={String(data.metrics.completedMonth).padStart(2, '0')} detail="Finalizadas neste mês" trend="+" tone="green" />
    </section>
    <section className="analytics-grid">
      <div className="panel status-panel"><div className="panel-header"><div><h2>Status das OS</h2><p>Distribuição atual</p></div><button className="icon-button"><MoreHorizontal size={18}/></button></div><div className="donut-wrap"><div className="donut dynamic" style={{ ['--donut' as string]: donut }}><div><strong>{dist.total}</strong><span>ordens</span></div></div><div className="legend"><div><i className="dot blue-dot"/>Em execução <b>{dist.inProgress}</b></div><div><i className="dot amber-dot"/>Aguardando aprovação <b>{dist.waitingApproval}</b></div><div><i className="dot green-dot"/>Concluídas <b>{dist.completed}</b></div></div></div><div className="mini-note"><Activity size={16}/><span>Fluxo da assistência <strong>{formatBRL(data.metrics.revenue)}</strong> no período</span></div></div>
      <div className="panel quick-panel"><div className="panel-header"><div><h2>Ações rápidas</h2><p>Atalhos para o dia a dia</p></div></div><button onClick={() => onNavigate('Nova Ordem de Serviço')}><span className="quick-icon blue"><Plus size={17}/></span><span><strong>Novo atendimento</strong><small>Abra uma nova OS</small></span><ArrowUpRight size={15}/></button><button onClick={() => onNavigate('Novo Cliente')}><span className="quick-icon violet"><Users size={17}/></span><span><strong>Cadastrar cliente</strong><small>Adicione um novo cliente</small></span><ArrowUpRight size={15}/></button><button onClick={() => onNavigate('Novo orçamento')}><span className="quick-icon amber"><FileText size={17}/></span><span><strong>Novo orçamento</strong><small>Crie uma proposta comercial</small></span><ArrowUpRight size={15}/></button></div>
    </section>
    <section className="lower-grid"><div className="panel orders-panel"><div className="panel-header"><div><h2>Ordens de serviço recentes</h2><p>Últimas manutenções da assistência</p></div><button className="text-button" onClick={() => onNavigate('Ordens de Serviço')}>Ver todas <ArrowUpRight size={15}/></button></div><div className="table-wrap"><table><thead><tr><th>OS</th><th>Cliente / aparelho</th><th>Serviço</th><th>Status</th><th>Valor</th><th>Data</th><th></th></tr></thead><tbody>{data.recent.length === 0 ? <tr><td colSpan={7}><EmptyInline /></td></tr> : data.recent.map(order => <tr key={order.id} className="clickable-row" onClick={() => onNavigate(`OS:${order.id}`)}><td><strong className="order-id">{order.numberLabel}</strong></td><td><div className="customer-cell"><span className="avatar">{initials(order.customerName)}</span><div><strong>{order.customerName}</strong><small>{order.vehicleLabel}</small></div></div></td><td>{order.diagnosis || '—'}</td><td><span className={`status ${statusStyles[order.statusLabel] || statusStyles[order.status]}`}>{order.statusLabel}</span></td><td><strong>{formatBRL(order.total)}</strong></td><td className="muted">{formatDateTime(order.entryDate)}</td><td><button className="row-menu"><MoreHorizontal size={17}/></button></td></tr>)}</tbody></table></div></div><div className="side-stack"><div className="panel attention-panel"><div className="panel-header"><div><h2>Requer atenção</h2><p>Itens que precisam de ação</p></div><span className="attention-count">{attentionCount}</span></div>{attentionCount === 0 ? <div className="attention-item"><span className="alert-icon orange"><Clock3 size={15}/></span><div><strong>Tudo em dia</strong><small>Nenhuma OS pendente</small></div></div> : <>{dist.waitingApproval > 0 && <div className="attention-item" onClick={() => onNavigate('Ordens de Serviço')}><span className="alert-icon"><AlertTriangle size={15}/></span><div><strong>Aguardando aprovação</strong><small>{dist.waitingApproval} ordem{dist.waitingApproval === 1 ? '' : 's'}</small></div><ArrowUpRight size={15}/></div>}{dist.waitingPart > 0 && <div className="attention-item" onClick={() => onNavigate('Ordens de Serviço')}><span className="alert-icon"><AlertTriangle size={15}/></span><div><strong>Aguardando peça</strong><small>{dist.waitingPart} ordem{dist.waitingPart === 1 ? '' : 's'}</small></div><ArrowUpRight size={15}/></div>}</>}</div></div></section>
  </>
}

function EmptyInline() {
  return <span className="muted">Nenhuma ordem recente.</span>
}
