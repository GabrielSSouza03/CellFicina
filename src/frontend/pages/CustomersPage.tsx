import { useEffect, useMemo, useState } from 'react'
import { MoreHorizontal, Plus, Search, SlidersHorizontal, X } from 'lucide-react'
import { customersService } from '../services/customers'
import { EmptyBlock, ErrorBanner, FlowSteps, LoadingBlock, Pagination } from '../components/MetricCard'
import { formatDate, initials, useAsync } from '../hooks/useAsync'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../services/api'
import type { Customer } from '../lib/types'

function canDeleteCustomers(user?: { role?: string; permissions?: string[] } | null) {
  return user?.role === 'ADMIN' || Boolean(user?.permissions?.includes('*') || user?.permissions?.includes('customers.delete'))
}

function ConfirmCustomerDelete({
  name,
  deleting,
  onCancel,
  onConfirm,
}: {
  name: string
  deleting: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="modal-backdrop" onClick={() => { if (!deleting) onCancel() }}>
      <div className="modal" style={{ width: 'min(420px, 100%)' }} onClick={(event) => event.stopPropagation()}>
        <h2>Excluir cliente</h2>
        <p className="sub">Essa ação não pode ser desfeita. O cadastro de {name} será removido, incluindo aparelhos sem histórico.</p>
        <div className="modal-actions">
          <button type="button" className="btn secondary" disabled={deleting} onClick={onCancel}>Cancelar</button>
          <button type="button" className="btn danger" disabled={deleting} onClick={onConfirm}>{deleting ? 'Excluindo...' : 'Excluir'}</button>
        </div>
      </div>
    </div>
  )
}

export function CustomersPage({ onNavigate }: { onNavigate: (label: string) => void }) {
  const toast = useToast()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { data, loading, error, reload } = useAsync(() => customersService.list({ search, page, pageSize: 10 }), [search, page])
  const showDelete = canDeleteCustomers(user)

  useEffect(() => {
    if (!openMenuId) return
    const close = () => setOpenMenuId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [openMenuId])

  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await customersService.remove(pendingDelete.id)
      toast.push('success', 'Cliente excluído com sucesso.')
      setPendingDelete(null)
      reload()
    } catch (err) {
      toast.push('error', err instanceof ApiError ? err.message : 'Não foi possível excluir o cliente.')
    } finally {
      setDeleting(false)
    }
  }

  return <>
    <div className="page-heading"><div><p className="eyebrow">Gestão</p><h1>Clientes</h1><p className="subheading">Gerencie os clientes da loja e da assistência técnica.</p></div><button className="btn primary" onClick={() => onNavigate('Novo Cliente')}><Plus size={17}/> Novo cliente</button></div>
    <div className="toolbar panel"><div className="input-search"><Search size={17}/><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Buscar por nome, CPF ou telefone..." /></div><button className="btn secondary"><SlidersHorizontal size={16}/> Filtros</button></div>
    {error && <ErrorBanner message={error} />}
    <div className={`panel full-table${openMenuId ? ' menu-open' : ''}`}>
      {loading ? <LoadingBlock /> : !data?.items.length ? <EmptyBlock title="Nenhum cliente encontrado" subtitle="Cadastre o primeiro cliente para começar." /> : <div className="table-wrap"><table><thead><tr><th>Cliente</th><th>Documento</th><th>Telefone</th><th>Aparelho principal</th><th>Última visita</th><th>Aparelhos</th><th></th></tr></thead>
        <tbody>{data.items.map((row) => (
          <tr key={row.id} className="clickable-row" onClick={() => onNavigate(`Cliente:${row.id}`)}>
            <td><div className="customer-cell"><span className="avatar">{initials(row.name)}</span><strong>{row.name}</strong></div></td>
            <td className="muted">{row.documentFormatted}</td>
            <td>{row.phoneFormatted}</td>
            <td>{row.mainVehicle}</td>
            <td className="muted">{formatDate(row.updatedAt)}</td>
            <td><span className="count-pill">{row.vehicleCount} aparelho{row.vehicleCount === 1 ? '' : 's'}</span></td>
            <td>
              <div className="row-menu-wrap">
                <button type="button" className="row-menu" aria-label={`Ações de ${row.name}`} onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === row.id ? null : row.id) }}><MoreHorizontal size={17}/></button>
                {openMenuId === row.id && (
                  <div className="row-dropdown" onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => { setOpenMenuId(null); onNavigate(`Cliente:${row.id}`) }}>Editar</button>
                    {showDelete && <button type="button" className="danger" onClick={() => { setOpenMenuId(null); setPendingDelete(row) }}>Excluir</button>}
                  </div>
                )}
              </div>
            </td>
          </tr>
        ))}</tbody>
      </table></div>}
      {data && <Pagination page={data.page} pageCount={data.pageCount} total={data.total} pageSize={data.pageSize} onPage={setPage} />}
    </div>
    {pendingDelete && <ConfirmCustomerDelete name={pendingDelete.name} deleting={deleting} onCancel={() => setPendingDelete(null)} onConfirm={() => void confirmDelete()} />}
  </>
}

export function CustomerFormPage({ id, onNavigate, continueTo }: { id?: string; onNavigate: (label: string) => void; continueTo?: 'os' }) {
  const toast = useToast()
  const { user } = useAuth()
  const existing = useAsync(() => id ? customersService.get(id) : Promise.resolve(null), [id])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [formError, setFormError] = useState('')
  const [existingSearch, setExistingSearch] = useState('')
  const customer = existing.data as Customer | null
  const showDelete = Boolean(id && canDeleteCustomers(user))
  const openingOrder = continueTo === 'os' && !id
  const cancelTarget = openingOrder ? 'Ordens de Serviço' : 'Clientes'
  const matches = useAsync(
    () => openingOrder ? customersService.list({ search: existingSearch, page: 1, pageSize: 5 }) : Promise.resolve(null),
    [openingOrder, existingSearch],
  )

  function goToOrder(customerId: string) {
    onNavigate(`Nova Ordem de Serviço:${customerId}`)
  }

  async function removeCustomer() {
    if (!id) return
    setDeleting(true)
    try {
      await customersService.remove(id)
      toast.push('success', 'Cliente excluído com sucesso.')
      onNavigate('Clientes')
    } catch (err) {
      setConfirmDelete(false)
      setFormError(err instanceof ApiError ? err.message : 'Não foi possível excluir o cliente.')
    } finally {
      setDeleting(false)
    }
  }

  if (id && existing.loading) return <LoadingBlock />

  return <>
    <div className="page-heading"><div><p className="eyebrow">{openingOrder ? 'Ordens de serviço / Nova' : `Clientes / ${id ? 'Editar' : 'Novo'}`}</p><h1>{openingOrder ? 'Pré-cadastro do cliente' : id ? 'Editar cliente' : 'Novo cliente'}</h1><p className="subheading">{openingOrder ? 'Cadastre o cliente para abrir a ordem de serviço.' : 'Preencha os dados cadastrais do cliente.'}</p></div>
      <div className="heading-actions">
        {showDelete && <button type="button" className="btn danger" onClick={() => setConfirmDelete(true)}>Excluir</button>}
        <button className="btn secondary" onClick={() => onNavigate(cancelTarget)}><X size={16}/> Cancelar</button>
      </div>
    </div>
    {openingOrder && <FlowSteps steps={['Cliente', 'Ordem de serviço']} current={0} />}
    {formError && <ErrorBanner message={formError} />}
    <form className={`form-layout${openingOrder ? ' single' : ''}`} onSubmit={async (event) => {
      event.preventDefault()
      const form = new FormData(event.currentTarget)
      const payload = Object.fromEntries(form.entries())
      setSaving(true)
      setFormError('')
      try {
        if (id) {
          await customersService.update(id, payload)
          toast.push('success', 'Cliente cadastrado com sucesso.')
          onNavigate('Clientes')
        } else {
          const created = await customersService.create(payload)
          toast.push('success', openingOrder ? 'Cliente cadastrado. Continue a ordem de serviço.' : 'Cliente cadastrado com sucesso.')
          if (openingOrder) goToOrder(created.id)
          else onNavigate('Clientes')
        }
      } catch (err) {
        setFormError(err instanceof ApiError ? err.message : 'Não foi possível salvar o cliente.')
      } finally {
        setSaving(false)
      }
    }}>
      <div className="form-main"><div className="panel form-panel"><div className="section-title"><span className="step">01</span><div><h2>Dados do cliente</h2><p>{openingOrder ? 'Preencha o pré-cadastro para seguir para a OS.' : 'Informações principais de identificação.'}</p></div></div>
        {openingOrder && (
          <>
            <div className="form-grid">
              <label className="span-2">Cliente já cadastrado<input value={existingSearch} onChange={(e) => setExistingSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault() }} placeholder="Buscar por nome, CPF ou telefone..." /></label>
            </div>
            {existingSearch.trim() && (
              <div className="history-list" style={{ margin: '8px 0 18px' }}>
                {(matches.data?.items || []).length === 0 ? <p className="muted">Nenhum cliente encontrado. Cadastre abaixo.</p> : matches.data!.items.map((row) => (
                  <button type="button" key={row.id} className="history-item pick-row" onClick={() => goToOrder(row.id)}>
                    <div><strong>{row.name}</strong><small>{row.documentFormatted} · {row.phoneFormatted}</small></div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
        <div className="form-grid">
          <label className="span-2">Nome<input name="name" defaultValue={customer?.name} /></label>
          <label>CPF/CNPJ<input name="document" defaultValue={customer?.document} /></label>
          <label>Telefone<input name="phone" defaultValue={customer?.phone} /></label>
          <label>E-mail<input name="email" defaultValue={customer?.email} /></label>
          <label>Cidade<input name="city" defaultValue={customer?.city} /></label>
          <label className="span-2">Observações<textarea name="notes" defaultValue={customer?.notes} /></label>
        </div>
        <button className="btn primary" disabled={saving} style={{ marginTop: 18 }}>{saving ? 'Salvando...' : openingOrder ? 'Continuar para a OS' : 'Salvar cliente'}</button>
      </div></div>
    </form>
    {confirmDelete && customer && <ConfirmCustomerDelete name={customer.name} deleting={deleting} onCancel={() => setConfirmDelete(false)} onConfirm={() => void removeCustomer()} />}
  </>
}

export function useCustomersOptions() {
  const { data } = useAsync(() => customersService.list({ page: 1, pageSize: 100 }), [])
  return useMemo(() => data?.items || [], [data])
}
