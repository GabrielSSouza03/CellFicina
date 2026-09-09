import { useMemo, useState } from 'react'
import {
  ChevronDown, ClipboardList, FileText, LayoutDashboard, Menu, MoreHorizontal, Search, Settings, Smartphone, Users, X,
} from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { LoginPage } from './pages/LoginPage'
import { Dashboard } from './pages/Dashboard'
import { CustomersPage, CustomerFormPage } from './pages/CustomersPage'
import { VehiclesPage, VehicleFormPage } from './pages/VehiclesPage'
import { WorkOrdersPage, WorkOrderFormPage } from './pages/WorkOrdersPage'
import { QuotesPage, QuoteFormPage } from './pages/QuotesPage'
import { SettingsPage } from './pages/SettingsPage'
import { BrandLogo } from './components/BrandLogo'
import { LoadingBlock } from './components/MetricCard'
import { initials } from './hooks/useAsync'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Ordens de Serviço', icon: ClipboardList },
  { label: 'Clientes', icon: Users },
  { label: 'Aparelhos', icon: Smartphone },
  { label: 'Orçamentos', icon: FileText },
  { label: 'Configurações', icon: Settings },
]

function Shell() {
  const { user, logout } = useAuth()
  const [active, setActive] = useState('Dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenu, setUserMenu] = useState(false)
  const navigate = (label: string) => { setActive(label); setMobileOpen(false) }

  const content = useMemo(() => {
    if (active === 'Dashboard') return <Dashboard onNavigate={navigate} />
    if (active === 'Ordens de Serviço') return <WorkOrdersPage onNavigate={navigate} />
    if (active === 'Clientes') return <CustomersPage onNavigate={navigate} />
    if (active === 'Nova Ordem de Serviço') return <WorkOrderFormPage onNavigate={navigate} />
    if (active.startsWith('OS:')) return <WorkOrderFormPage id={active.slice(3)} onNavigate={navigate} />
    if (active === 'Novo Cliente') return <CustomerFormPage onNavigate={navigate} />
    if (active.startsWith('Cliente:')) return <CustomerFormPage id={active.slice(8)} onNavigate={navigate} />
    if (active === 'Aparelhos') return <VehiclesPage onNavigate={navigate} />
    if (active === 'Novo aparelho') return <VehicleFormPage onNavigate={navigate} />
    if (active.startsWith('Aparelho:')) return <VehicleFormPage id={active.slice(9)} onNavigate={navigate} />
    if (active === 'Orçamentos') return <QuotesPage onNavigate={navigate} />
    if (active === 'Novo orçamento') return <QuoteFormPage onNavigate={navigate} />
    if (active.startsWith('Orçamento:')) return <QuoteFormPage id={active.slice(10)} onNavigate={navigate} />
    if (active === 'Configurações') return <SettingsPage />
    return <Dashboard onNavigate={navigate} />
  }, [active])

  const breadcrumb = active.includes(':') ? active.split(':')[0] : active === 'Nova Ordem de Serviço' ? 'Ordens de serviço' : active

  const roleLabel = user?.role === 'ADMIN' ? 'Administrador' : user?.role === 'MECHANIC' ? 'Técnico' : user?.role === 'ATTENDANT' ? 'Atendente' : user?.role === 'FINANCE' ? 'Financeiro' : user?.role === 'MANAGER' ? 'Gerente' : user?.role

  return <div className="app-shell"><aside className={`sidebar ${mobileOpen ? 'open' : ''}`}><div className="brand"><BrandLogo /><button className="mobile-close" onClick={() => setMobileOpen(false)}><X size={18}/></button></div><nav>{navItems.map(item => { const Icon = item.icon; const isActive = active === item.label || (item.label === 'Ordens de Serviço' && (active === 'Nova Ordem de Serviço' || active.startsWith('OS:'))); return <button key={item.label} className={`nav-item ${isActive ? 'active' : ''}`} onClick={() => navigate(item.label)}><Icon size={18}/><span>{item.label}</span></button>})}</nav><div className="sidebar-bottom"><div className="user-mini"><span className="avatar">{initials(user?.name)}</span><div><strong>{user?.name}</strong><small>{roleLabel}</small></div><MoreHorizontal size={17}/></div></div></aside><main className="main"><header className="topbar"><button className="mobile-menu" onClick={() => setMobileOpen(true)}><Menu size={20}/></button><div className="breadcrumb"><span>Loja do Alemão</span><span>/</span><strong>{breadcrumb}</strong></div><div className="top-actions"><div className="global-search"><Search size={17}/><input placeholder="Buscar em tudo..."/><kbd>⌘ K</kbd></div><button className="profile-button" onClick={() => setUserMenu(!userMenu)}><span className="avatar">{initials(user?.name)}</span><span>{user?.name}</span><ChevronDown size={14}/></button></div>{userMenu && <div className="user-menu"><button onClick={() => { setUserMenu(false); navigate('Configurações') }}>Configurações</button><button onClick={() => logout()}>Sair</button></div>}</header><div className="content">{content}</div><footer>CellFicina <span>•</span> Gestão para lojas de celulares <span>•</span> v1.0.0</footer></main></div>
}

function Gate() {
  const { user, loading } = useAuth()
  if (loading) return <LoadingBlock label="Iniciando CellFicina..." />
  if (!user) return <LoginPage />
  return <Shell />
}

export default function App() {
  return <AuthProvider><ToastProvider><Gate /></ToastProvider></AuthProvider>
}
