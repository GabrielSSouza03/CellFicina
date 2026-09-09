import { useState } from 'react'
import { MoreHorizontal, Plus, Search, X } from 'lucide-react'
import { vehiclesService } from '../services/vehicles'
import { EmptyBlock, ErrorBanner, LoadingBlock, Pagination } from '../components/MetricCard'
import { initials, useAsync } from '../hooks/useAsync'
import { useToast } from '../context/ToastContext'
import { ApiError } from '../services/api'
import { useCustomersOptions } from './CustomersPage'
import type { Vehicle } from '../lib/types'

export function VehiclesPage({ onNavigate }: { onNavigate: (label: string) => void }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { data, loading, error } = useAsync(() => vehiclesService.list({ search, page, pageSize: 10 }), [search, page])
  return <>
    <div className="page-heading"><div><p className="eyebrow">Gestão</p><h1>Aparelhos</h1><p className="subheading">Cadastre os celulares da loja e os aparelhos em manutenção.</p></div><button className="btn primary" onClick={() => onNavigate('Novo aparelho')}><Plus size={17}/> Novo aparelho</button></div>
    <div className="toolbar panel"><div className="input-search"><Search size={17}/><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Buscar por marca, modelo, série ou cliente..." /></div></div>
    {error && <ErrorBanner message={error} />}
    <div className="panel full-table">{loading ? <LoadingBlock /> : !data?.items.length ? <EmptyBlock title="Nenhum aparelho encontrado" subtitle="Cadastre um celular vinculado a um cliente." /> : <div className="table-wrap"><table><thead><tr><th>Aparelho</th><th>Cliente</th><th>Ano</th><th>Ciclos</th><th>Nº de série</th><th></th></tr></thead><tbody>{data.items.map((row) => <tr key={row.id} className="clickable-row" onClick={() => onNavigate(`Aparelho:${row.id}`)}><td><div className="customer-cell"><span className="avatar">{initials(row.brand)}</span><div><strong>{row.brand} {row.model}</strong><small>{row.version || '—'}</small></div></div></td><td>{row.customerName}</td><td>{row.year || '—'}</td><td>{row.mileage.toLocaleString('pt-BR')}</td><td className="muted">{row.chassis || '—'}</td><td><button className="row-menu"><MoreHorizontal size={17}/></button></td></tr>)}</tbody></table></div>}
    {data && <Pagination page={data.page} pageCount={data.pageCount} total={data.total} pageSize={data.pageSize} onPage={setPage} />}</div>
  </>
}

export function VehicleFormPage({ id, onNavigate }: { id?: string; onNavigate: (label: string) => void }) {
  const toast = useToast()
  const customers = useCustomersOptions()
  const existing = useAsync(() => id ? vehiclesService.get(id) : Promise.resolve(null), [id])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const vehicle = existing.data as Vehicle | null
  if (id && existing.loading) return <LoadingBlock />
  return <>
    <div className="page-heading"><div><p className="eyebrow">Aparelhos</p><h1>{id ? 'Editar aparelho' : 'Novo aparelho'}</h1><p className="subheading">Vincule o celular ao cliente da loja.</p></div><button className="btn secondary" onClick={() => onNavigate('Aparelhos')}><X size={16}/> Cancelar</button></div>
    {formError && <ErrorBanner message={formError} />}
    <form className="panel form-panel" onSubmit={async (event) => {
      event.preventDefault()
      const payload = Object.fromEntries(new FormData(event.currentTarget).entries())
      setSaving(true); setFormError('')
      try {
        if (id) await vehiclesService.update(id, payload)
        else await vehiclesService.create(payload)
        toast.push('success', 'Aparelho salvo com sucesso.')
        onNavigate('Aparelhos')
      } catch (err) {
        setFormError(err instanceof ApiError ? err.message : 'Não foi possível salvar o aparelho.')
      } finally { setSaving(false) }
    }}>
      <div className="form-grid">
        <label>Cliente<select name="customerId" defaultValue={vehicle?.customerId} required>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Marca<input name="brand" defaultValue={vehicle?.brand} required /></label>
        <label>Modelo<input name="model" defaultValue={vehicle?.model} required /></label>
        <label>Armazenamento / versão<input name="version" defaultValue={vehicle?.version} placeholder="128 GB" /></label>
        <label>Ano<input name="year" type="number" defaultValue={vehicle?.year} /></label>
        <label>Ciclos de bateria<input name="mileage" type="number" defaultValue={vehicle?.mileage ?? 0} /></label>
        <label>Número de série<input name="chassis" defaultValue={vehicle?.chassis} /></label>
        <label className="span-2">Observações<textarea name="notes" defaultValue={vehicle?.notes} /></label>
      </div>
      <button className="btn primary" disabled={saving} style={{ marginTop: 18 }}>{saving ? 'Salvando...' : 'Salvar aparelho'}</button>
    </form>
  </>
}
