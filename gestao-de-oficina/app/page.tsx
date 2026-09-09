'use client'

import { useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Box,
  BriefcaseBusiness,
  Car,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  FileBarChart,
  FileText,
  Gauge,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Truck,
  UserRound,
  Users,
  Wrench,
  X,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Ordens de Serviço', icon: ClipboardList, badge: '12' },
  { label: 'Clientes', icon: Users },
  { label: 'Veículos', icon: Car },
  { label: 'Orçamentos', icon: FileText, badge: '4' },
  { label: 'Estoque', icon: Package, badge: '3' },
  { label: 'Produtos e Serviços', icon: Box },
  { label: 'Financeiro', icon: CircleDollarSign },
  { label: 'Relatórios', icon: FileBarChart },
  { label: 'Configurações', icon: Settings },
]

const orders = [
  { id: '#OS-2481', client: 'Mariana Costa', vehicle: 'Honda Civic 2020', plate: 'RTA-4J82', service: 'Revisão completa', status: 'Em execução', value: 'R$ 1.248,90', date: 'Hoje, 09:42', tone: 'blue' },
  { id: '#OS-2480', client: 'Ricardo Almeida', vehicle: 'Toyota Corolla 2022', plate: 'FDP-9A31', service: 'Troca de óleo e filtros', status: 'Aguardando aprovação', value: 'R$ 684,50', date: 'Hoje, 08:16', tone: 'amber' },
  { id: '#OS-2479', client: 'Auto Peças Central', vehicle: 'VW T-Cross 2021', plate: 'GKA-7C05', service: 'Diagnóstico eletrônico', status: 'Concluída', value: 'R$ 390,00', date: 'Ontem, 16:28', tone: 'green' },
  { id: '#OS-2478', client: 'Juliana Mendes', vehicle: 'Jeep Renegade 2019', plate: 'QWE-2H44', service: 'Suspensão dianteira', status: 'Aguardando peça', value: 'R$ 2.190,00', date: 'Ontem, 14:05', tone: 'purple' },
  { id: '#OS-2477', client: 'Paulo Nogueira', vehicle: 'Fiat Toro 2023', plate: 'SDF-8B19', service: 'Alinhamento e balanceamento', status: 'Entregue', value: 'R$ 220,00', date: '12 jun, 11:37', tone: 'slate' },
]

const statusStyles: Record<string, string> = {
  'Em execução': 'status-blue',
  'Aguardando aprovação': 'status-amber',
  Concluída: 'status-green',
  'Aguardando peça': 'status-purple',
  Entregue: 'status-slate',
}

const customers = [
  ['Mariana Costa', 'CPF 284.***.***-10', '(11) 99842-1098', 'Honda Civic', '12 jun 2024'],
  ['Ricardo Almeida', 'CPF 391.***.***-44', '(11) 98730-4421', 'Toyota Corolla', '05 jun 2024'],
  ['Juliana Mendes', 'CPF 105.***.***-72', '(11) 99102-3880', 'Jeep Renegade', '28 mai 2024'],
  ['Paulo Nogueira', 'CNPJ 28.***.***/0001-90', '(11) 98210-7782', 'Fiat Toro', '12 jun 2024'],
]

function MetricCard({ icon: Icon, label, value, detail, trend, tone = 'blue' }: { icon: any; label: string; value: string; detail: string; trend?: string; tone?: string }) {
  return <div className="metric-card">
    <div className={`metric-icon ${tone}`}><Icon size={18} /></div>
    <div className="metric-copy"><span>{label}</span><strong>{value}</strong><small className={trend?.startsWith('+') ? 'positive' : ''}>{trend && <ArrowUpRight size={13} />} {detail}</small></div>
    <MoreHorizontal size={17} className="metric-more" />
  </div>
}

function Dashboard({ onNavigate }: { onNavigate: (label: string) => void }) {
  const [period, setPeriod] = useState('Últimos 30 dias')
  return <>
    <div className="page-heading"><div><p className="eyebrow">Visão geral</p><h1>Bom dia, Alemão</h1><p className="subheading">Acompanhe o desempenho da sua oficina hoje.</p></div><div className="heading-actions"><button className="btn secondary" onClick={() => onNavigate('Relatórios')}><BarChart3 size={16} /> Ver relatórios</button><button className="btn primary" onClick={() => onNavigate('Nova Ordem de Serviço')}><Plus size={17} /> Nova ordem</button></div></div>
    <section className="metric-grid">
      <MetricCard icon={ClipboardList} label="OS abertas" value="24" detail="+8,2% vs. mês anterior" trend="+" />
      <MetricCard icon={Wrench} label="Em andamento" value="12" detail="5 com entrega hoje" tone="violet" />
      <MetricCard icon={Clock3} label="Aguardando aprovação" value="07" detail="R$ 8.420,00 em propostas" tone="amber" />
      <MetricCard icon={CheckCircle2} label="Concluídas no mês" value="86" detail="+12,4% vs. mês anterior" trend="+" tone="green" />
    </section>
    <section className="analytics-grid">
      <div className="panel revenue-panel"><div className="panel-header"><div><h2>Faturamento</h2><p>Receita acumulada no período</p></div><select value={period} onChange={e => setPeriod(e.target.value)}><option>Últimos 30 dias</option><option>Últimos 7 dias</option><option>Este ano</option></select></div><div className="revenue-total">R$ 48.290,00 <span><ArrowUpRight size={14}/> 14,8%</span></div><div className="chart"><div className="chart-labels"><span>R$ 8k</span><span>R$ 6k</span><span>R$ 4k</span><span>R$ 2k</span><span>R$ 0</span></div><div className="chart-area"><div className="grid-lines" /> <svg viewBox="0 0 700 180" preserveAspectRatio="none" aria-label="Gráfico de faturamento"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#2f6df6" stopOpacity=".28"/><stop offset="100%" stopColor="#2f6df6" stopOpacity="0"/></linearGradient></defs><path d="M0 140 C45 132, 55 110, 100 118 S150 146, 190 100 S235 95, 280 112 S320 80, 355 83 S400 108, 438 62 S485 70, 520 75 S555 30, 600 48 S650 66, 700 18 L700 180 L0 180 Z" fill="url(#fill)"/><path d="M0 140 C45 132, 55 110, 100 118 S150 146, 190 100 S235 95, 280 112 S320 80, 355 83 S400 108, 438 62 S485 70, 520 75 S555 30, 600 48 S650 66, 700 18" fill="none" stroke="#2f6df6" strokeWidth="3" strokeLinecap="round"/></svg><div className="x-labels"><span>18 mai</span><span>24 mai</span><span>30 mai</span><span>05 jun</span><span>11 jun</span><span>17 jun</span></div></div></div></div>
      <div className="panel status-panel"><div className="panel-header"><div><h2>Status das OS</h2><p>Distribuição atual</p></div><button className="icon-button"><MoreHorizontal size={18}/></button></div><div className="donut-wrap"><div className="donut"><div><strong>24</strong><span>ordens</span></div></div><div className="legend"><div><i className="dot blue-dot"/>Em execução <b>12</b></div><div><i className="dot amber-dot"/>Aguardando aprovação <b>7</b></div><div><i className="dot green-dot"/>Concluídas <b>5</b></div></div></div><div className="mini-note"><Activity size={16}/><span>Fluxo saudável <strong>+8,2%</strong> neste mês</span></div></div>
    </section>
    <section className="lower-grid"><div className="panel orders-panel"><div className="panel-header"><div><h2>Ordens de serviço recentes</h2><p>Últimas movimentações da oficina</p></div><button className="text-button" onClick={() => onNavigate('Ordens de Serviço')}>Ver todas <ArrowUpRight size={15}/></button></div><div className="table-wrap"><table><thead><tr><th>OS</th><th>Cliente / veículo</th><th>Serviço</th><th>Status</th><th>Valor</th><th>Data</th><th></th></tr></thead><tbody>{orders.map(order => <tr key={order.id}><td><strong className="order-id">{order.id}</strong></td><td><div className="customer-cell"><span className="avatar">{order.client.split(' ').map(n => n[0]).join('').slice(0,2)}</span><div><strong>{order.client}</strong><small>{order.vehicle} · {order.plate}</small></div></div></td><td>{order.service}</td><td><span className={`status ${statusStyles[order.status]}`}>{order.status}</span></td><td><strong>{order.value}</strong></td><td className="muted">{order.date}</td><td><button className="row-menu"><MoreHorizontal size={17}/></button></td></tr>)}</tbody></table></div></div><div className="side-stack"><div className="panel quick-panel"><div className="panel-header"><div><h2>Ações rápidas</h2><p>Atalhos para o dia a dia</p></div></div><button onClick={() => onNavigate('Nova Ordem de Serviço')}><span className="quick-icon blue"><Plus size={17}/></span><span><strong>Novo atendimento</strong><small>Abra uma nova OS</small></span><ArrowUpRight size={15}/></button><button onClick={() => onNavigate('Clientes')}><span className="quick-icon violet"><Users size={17}/></span><span><strong>Cadastrar cliente</strong><small>Adicione um novo cliente</small></span><ArrowUpRight size={15}/></button><button onClick={() => onNavigate('Estoque')}><span className="quick-icon amber"><Package size={17}/></span><span><strong>Entrada de estoque</strong><small>Registre produtos recebidos</small></span><ArrowUpRight size={15}/></button></div><div className="panel attention-panel"><div className="panel-header"><div><h2>Requer atenção</h2><p>Itens que precisam de ação</p></div><span className="attention-count">3</span></div><div className="attention-item"><span className="alert-icon"><AlertTriangle size={15}/></span><div><strong>Estoque baixo</strong><small>Pastilha de freio · 2 un.</small></div><ArrowUpRight size={15}/></div><div className="attention-item"><span className="alert-icon orange"><Clock3 size={15}/></span><div><strong>Entrega hoje</strong><small>OS-2481 · Honda Civic</small></div><ArrowUpRight size={15}/></div></div></div></section>
  </>
}

function ListPage({ title, subtitle, type, onNavigate }: { title: string; subtitle: string; type: string; onNavigate: (label: string) => void }) {
  const isCustomers = type === 'Clientes'
  const rows = isCustomers ? customers : orders.map(o => [o.id, o.client, o.vehicle, o.plate, o.date, o.status, o.value])
  return <><div className="page-heading"><div><p className="eyebrow">Gestão</p><h1>{title}</h1><p className="subheading">{subtitle}</p></div><button className="btn primary" onClick={() => onNavigate(isCustomers ? 'Novo Cliente' : 'Nova Ordem de Serviço')}><Plus size={17}/> {isCustomers ? 'Novo cliente' : 'Nova ordem de serviço'}</button></div><div className="toolbar panel"><div className="input-search"><Search size={17}/><input placeholder={isCustomers ? 'Buscar por nome, CPF ou telefone...' : 'Buscar por OS, cliente ou placa...'} /></div><button className="btn secondary"><SlidersHorizontal size={16}/> Filtros</button><select><option>Todos os status</option><option>Em execução</option><option>Concluída</option></select></div><div className="panel full-table"><div className="table-wrap"><table><thead><tr>{isCustomers ? <><th>Cliente</th><th>Documento</th><th>Telefone</th><th>Veículo principal</th><th>Última visita</th><th>Veículos</th><th></th></> : <><th>Nº OS</th><th>Cliente</th><th>Veículo</th><th>Placa</th><th>Entrada</th><th>Status</th><th>Valor</th><th></th></>}</tr></thead><tbody>{rows.map((row: any, i) => <tr key={i}>{isCustomers ? <><td><div className="customer-cell"><span className="avatar">{row[0].split(' ').map((n:string) => n[0]).join('').slice(0,2)}</span><strong>{row[0]}</strong></div></td><td className="muted">{row[1]}</td><td>{row[2]}</td><td>{row[3]}</td><td className="muted">{row[4]}</td><td><span className="count-pill">{i % 2 + 1} veículo{ i % 2 ? 's' : ''}</span></td><td><button className="row-menu"><MoreHorizontal size={17}/></button></td></> : <>{row.map((cell: any, j: number) => <td key={j}>{j === 0 ? <strong className="order-id">{cell}</strong> : j === 5 ? <span className={`status ${statusStyles[cell] || 'status-slate'}`}>{cell}</span> : j === 6 ? <strong>{cell}</strong> : <span className={j === 4 ? 'muted' : ''}>{cell}</span>}</td>)}<td><button className="row-menu"><MoreHorizontal size={17}/></button></td></>}</tr>)}</tbody></table></div><div className="table-footer"><span>Mostrando 1–{rows.length} de {isCustomers ? '248' : '124'} registros</span><div><button className="page-btn">‹</button><button className="page-btn active">1</button><button className="page-btn">2</button><button className="page-btn">3</button><button className="page-btn">›</button></div></div></div></>
}

function NewOrder({ onNavigate }: { onNavigate: (label: string) => void }) {
  return <><div className="page-heading"><div><p className="eyebrow">Ordens de serviço / Nova</p><h1>Nova ordem de serviço</h1><p className="subheading">Preencha os dados para iniciar um novo atendimento.</p></div><button className="btn secondary" onClick={() => onNavigate('Ordens de Serviço')}><X size={16}/> Cancelar</button></div><div className="form-layout"><div className="form-main"><div className="panel form-panel"><div className="section-title"><span className="step">01</span><div><h2>Cliente e veículo</h2><p>Quem trouxe o veículo para manutenção?</p></div></div><div className="form-grid"><label>Cliente existente<select><option>Mariana Costa — CPF 284.***.***-10</option><option>Ricardo Almeida — CPF 391.***.***-44</option></select></label><label>Veículo<select><option>Honda Civic 2020 — RTA-4J82</option><option>Adicionar novo veículo</option></select></label><label>Quilometragem<input defaultValue="68.420 km" /></label><label>Responsável<select><option>Fernando Oliveira</option><option>Beatriz Santos</option></select></label></div></div><div className="panel form-panel"><div className="section-title"><span className="step">02</span><div><h2>Detalhes do atendimento</h2><p>Informações importantes sobre o serviço.</p></div></div><div className="form-grid"><label>Data de entrada<input type="date" defaultValue="2024-06-18" /></label><label>Previsão de entrega<input type="date" defaultValue="2024-06-20" /></label><label className="span-2">Diagnóstico inicial<textarea placeholder="Descreva os sintomas relatados e o diagnóstico inicial..." /></label><label className="span-2">Observações<textarea placeholder="Observações internas para a equipe..." /></label></div></div><div className="panel form-panel"><div className="section-title"><span className="step">03</span><div><h2>Serviços e peças</h2><p>Adicione os itens que serão realizados.</p></div><button className="btn secondary small"><Plus size={15}/> Adicionar item</button></div><div className="line-item"><div><strong>Revisão periódica completa</strong><small>SRV-001 · Serviço</small></div><span>1 × R$ 890,00</span><button className="row-menu"><X size={15}/></button></div><div className="line-item"><div><strong>Óleo sintético 5W30</strong><small>PRD-048 · Produto</small></div><span>4 × R$ 62,50</span><button className="row-menu"><X size={15}/></button></div></div></div><aside className="order-summary panel"><div className="summary-title"><h2>Resumo da ordem</h2><span className="status status-amber">Orçamento</span></div><div className="summary-client"><span className="avatar large">MC</span><div><strong>Mariana Costa</strong><small>Honda Civic 2020 · RTA-4J82</small></div></div><div className="summary-lines"><div><span>Serviços <small>1 item</small></span><b>R$ 890,00</b></div><div><span>Peças <small>1 item</small></span><b>R$ 250,00</b></div><div><span>Desconto</span><b>R$ 0,00</b></div></div><div className="summary-total"><span>Total da ordem</span><strong>R$ 1.140,00</strong></div><button className="btn primary wide" onClick={() => onNavigate('Ordens de Serviço')}>Salvar ordem <ArrowUpRight size={16}/></button><button className="btn secondary wide" onClick={() => onNavigate('Ordens de Serviço')}>Salvar e enviar orçamento</button><p className="secure-note"><CheckCircle2 size={14}/> Você poderá editar esta ordem depois.</p></aside></div></>
}

function GenericPage({ label, onNavigate }: { label: string; onNavigate: (label: string) => void }) {
  const configs: Record<string, [string, string, any]> = { 'Veículos': ['Veículos', 'Acompanhe os veículos cadastrados e seus históricos.', Car], 'Orçamentos': ['Orçamentos', 'Gerencie propostas comerciais e aprovações.', FileText], 'Estoque': ['Estoque', 'Controle produtos, entradas e saídas da oficina.', Package], 'Produtos e Serviços': ['Produtos e Serviços', 'Catálogo de itens e serviços oferecidos.', Box], 'Financeiro': ['Financeiro', 'Visão geral das receitas, despesas e caixa.', CircleDollarSign], 'Relatórios': ['Relatórios', 'Indicadores para apoiar as decisões da oficina.', FileBarChart], 'Configurações': ['Configurações', 'Ajuste os parâmetros e preferências do sistema.', Settings] }
  const [title, sub, Icon] = configs[label] || [label, 'Organize sua operação em um só lugar.', Gauge]
  return <><div className="page-heading"><div><p className="eyebrow">Módulo</p><h1>{title}</h1><p className="subheading">{sub}</p></div><button className="btn primary" onClick={() => onNavigate(label === 'Estoque' ? 'Entrada de estoque' : `Novo ${label.slice(0, -1).toLowerCase()}`)}><Plus size={17}/> Nova movimentação</button></div><div className="module-hero panel"><div className="hero-icon"><Icon size={26}/></div><div><h2>Seu módulo de {title.toLowerCase()}</h2><p>Esta área está pronta para receber os dados reais do backend local. Explore os controles e filtros para visualizar o fluxo completo.</p></div><button className="btn secondary">Configurar módulo</button></div><div className="metric-grid three"><MetricCard icon={Activity} label="Movimentações no mês" value="128" detail="+12,4% vs. mês anterior" trend="+"/><MetricCard icon={CircleDollarSign} label="Valor movimentado" value="R$ 38.420" detail="Atualizado hoje" tone="green"/><MetricCard icon={AlertTriangle} label="Requer atenção" value="06" detail="Itens pendentes" tone="amber"/></div><div className="empty-module panel"><div className="empty-icon"><Icon size={23}/></div><h2>Visualização pronta para seus dados</h2><p>Use a ação principal acima para começar ou conecte o backend quando estiver disponível.</p><button className="btn secondary" onClick={() => onNavigate('Dashboard')}>Voltar ao dashboard</button></div></>
}

export default function Page() {
  const [active, setActive] = useState('Dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifications, setNotifications] = useState(false)
  const navigate = (label: string) => { setActive(label); setMobileOpen(false) }
  const content = useMemo(() => active === 'Dashboard' ? <Dashboard onNavigate={navigate} /> : active === 'Ordens de Serviço' ? <ListPage title="Ordens de serviço" subtitle="Acompanhe e gerencie todos os atendimentos da oficina." type="Orders" onNavigate={navigate}/> : active === 'Clientes' ? <ListPage title="Clientes" subtitle="Gerencie os clientes e o relacionamento da sua oficina." type="Clientes" onNavigate={navigate}/> : active === 'Nova Ordem de Serviço' ? <NewOrder onNavigate={navigate}/> : <GenericPage label={active} onNavigate={navigate}/>, [active])
  return <div className="app-shell"><aside className={`sidebar ${mobileOpen ? 'open' : ''}`}><div className="brand"><img src="/logo.jpg" alt="Loja do Alemão Celulares" className="brand-logo" /><button className="mobile-close" onClick={() => setMobileOpen(false)}><X size={18}/></button></div><div className="workspace"><span className="workspace-dot"/><div><strong>Loja do Alemão</strong><small>Unidade principal</small></div><ChevronDown size={15}/></div><nav>{navItems.map(item => { const Icon = item.icon; return <button key={item.label} className={`nav-item ${active === item.label ? 'active' : ''}`} onClick={() => navigate(item.label)}><Icon size={18}/><span>{item.label}</span>{item.badge && <em>{item.badge}</em>}</button>})}</nav><div className="sidebar-bottom"><div className="help-card"><LifeBuoy size={18}/><div><strong>Precisa de ajuda?</strong><span>Acesse nossa central</span></div><ArrowUpRight size={14}/></div><div className="user-mini"><span className="avatar">E</span><div><strong>Edson</strong><small>Administrador</small></div><MoreHorizontal size={17}/></div></div></aside><main className="main"><header className="topbar"><button className="mobile-menu" onClick={() => setMobileOpen(true)}><Menu size={20}/></button><div className="breadcrumb"><span>Loja do Alemão</span><span>/</span><strong>{active === 'Nova Ordem de Serviço' ? 'Ordens de serviço' : active}</strong></div><div className="top-actions"><div className="global-search"><Search size={17}/><input placeholder="Buscar em tudo..."/><kbd>⌘ K</kbd></div><button className="notification-button" onClick={() => setNotifications(!notifications)}><Bell size={19}/><i/></button><button className="profile-button"><span className="avatar">E</span><span>Edson</span><ChevronDown size={14}/></button></div>{notifications && <div className="notification-popover"><strong>Notificações</strong><p><AlertTriangle size={14}/> 3 produtos estão com estoque baixo.</p><p><Clock3 size={14}/> A OS-2481 tem entrega prevista para hoje.</p></div>}</header><div className="content">{content}</div><footer>CellFicina <span>•</span> Sistema de gestão para celulares <span>•</span> v2.4.0</footer></main></div>
}
