import { useState } from 'react'
import { ClipboardList, Ellipsis, FileText, LayoutDashboard, Package, Settings, Smartphone, Users, X } from 'lucide-react'

const primary = [
  { label: 'Dashboard', short: 'Início', icon: LayoutDashboard },
  { label: 'Ordens de Serviço', short: 'OS', icon: ClipboardList },
  { label: 'Clientes', short: 'Clientes', icon: Users },
  { label: 'Aparelhos', short: 'Aparelhos', icon: Smartphone },
]

const moreItems = [
  { label: 'Estoque', icon: Package },
  { label: 'Orçamentos', icon: FileText },
  { label: 'Configurações', icon: Settings },
]

function isActive(active: string, label: string) {
  if (label === 'Ordens de Serviço') {
    return active === label || active === 'Nova Ordem de Serviço' || active.startsWith('Nova Ordem de Serviço:') || active.startsWith('OS:')
  }
  if (label === 'Clientes') return active === label || active === 'Novo Cliente' || active.startsWith('Cliente:')
  if (label === 'Aparelhos') return active === label || active === 'Novo aparelho' || active.startsWith('Aparelho:')
  if (label === 'Orçamentos') return active === label || active === 'Novo orçamento' || active.startsWith('Orçamento:')
  if (label === 'Estoque') return active === label || active === 'Movimentações' || active === 'Painel de estoque' || active === 'Novo produto' || active.startsWith('Produto:') || active.startsWith('Editar produto:')
  return active === label
}

export function BottomNav({ active, onNavigate }: { active: string; onNavigate: (label: string) => void }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const moreActive = moreItems.some((item) => isActive(active, item.label))

  return <>
    {moreOpen && <button className="bottom-sheet-scrim" aria-label="Fechar menu" onClick={() => setMoreOpen(false)} />}
    {moreOpen && <div className="bottom-sheet" role="menu">
      <div className="bottom-sheet-head"><strong>Mais</strong><button className="icon-button" type="button" aria-label="Fechar" onClick={() => setMoreOpen(false)}><X size={18} /></button></div>
      {moreItems.map((item) => {
        const Icon = item.icon
        return <button key={item.label} type="button" className={isActive(active, item.label) ? 'active' : ''} onClick={() => { setMoreOpen(false); onNavigate(item.label) }}><Icon size={18} /> {item.label}</button>
      })}
    </div>}
    <nav className="bottom-nav" aria-label="Navegação principal">
      {primary.map((item) => {
        const Icon = item.icon
        return <button key={item.label} type="button" className={isActive(active, item.label) ? 'active' : ''} onClick={() => { setMoreOpen(false); onNavigate(item.label) }}><Icon size={20} /><span>{item.short}</span></button>
      })}
      <button type="button" className={moreActive || moreOpen ? 'active' : ''} onClick={() => setMoreOpen((open) => !open)}><Ellipsis size={20} /><span>Mais</span></button>
    </nav>
  </>
}
