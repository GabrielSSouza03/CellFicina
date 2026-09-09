import { useState } from 'react'
import { MoreHorizontal, Plus, Search, X } from 'lucide-react'
import { quotesService } from '../services/quotes'
import { customersService } from '../services/customers'
import { vehiclesService } from '../services/vehicles'
import { EmptyBlock, ErrorBanner, LoadingBlock, Pagination } from '../components/MetricCard'
import { formatBRL, statusStyles, useAsync } from '../hooks/useAsync'
import { useToast } from '../context/ToastContext'
import { ApiError } from '../services/api'

const quoteLabels: Record<string, string> = {
  DRAFT: 'Rascunho', SENT: 'Enviado', WAITING_APPROVAL: 'Aguardando aprovação', APPROVED: 'Aprovado', REJECTED: 'Recusado', EXPIRED: 'Expirado',
}

export function QuotesPage({ onNavigate }: { onNavigate: (label: string) => void }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const { data, loading, error } = useAsync(() => quotesService.list({ search, page, pageSize: 10 }), [search, page])
  return <>
    <div className="page-heading"><div><p className="eyebrow">Gestão</p><h1>Orçamentos</h1><p className="subheading">Gerencie propostas comerciais e aprovações.</p></div><button className="btn primary" onClick={() => onNavigate('Novo orçamento')}><Plus size={17}/> Novo orçamento</button></div>
    <div className="toolbar panel"><div className="input-search"><Search size={17}/><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Buscar orçamentos..." /></div></div>
    {error && <ErrorBanner message={error} />}
    <div className="panel full-table">{loading ? <LoadingBlock /> : !data?.items.length ? <EmptyBlock title="Nenhum orçamento" subtitle="Crie uma proposta comercial para o cliente." /> : <div className="table-wrap"><table><thead><tr><th>Nº</th><th>Cliente</th><th>Aparelho</th><th>Status</th><th>Total</th><th></th></tr></thead><tbody>{data.items.map((row) => <tr key={row.id} className="clickable-row" onClick={() => onNavigate(`Orçamento:${row.id}`)}><td><strong className="order-id">{row.numberLabel}</strong></td><td>{row.customerName}</td><td>{row.vehicleLabel || '—'}</td><td><span className={`status ${statusStyles[row.status]}`}>{quoteLabels[row.status] || row.status}</span></td><td><strong>{formatBRL(row.total)}</strong></td><td><button className="row-menu"><MoreHorizontal size={17}/></button></td></tr>)}</tbody></table></div>}
    {data && <Pagination page={data.page} pageCount={data.pageCount} total={data.total} pageSize={data.pageSize} onPage={setPage} />}</div>
  </>
}

export function QuoteFormPage({ id, onNavigate }: { id?: string; onNavigate: (label: string) => void }) {
  const toast = useToast()
  const customers = useAsync(() => customersService.list({ page: 1, pageSize: 100 }), [])
  const existing = useAsync(() => id ? quotesService.get(id) : Promise.resolve(null), [id])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const quote = existing.data
  if (id && existing.loading) return <LoadingBlock />
  return <>
    <div className="page-heading"><div><p className="eyebrow">Orçamentos</p><h1>{id ? quote?.numberLabel : 'Novo orçamento'}</h1><p className="subheading">Monte a proposta e envie para aprovação.</p></div><button className="btn secondary" onClick={() => onNavigate('Orçamentos')}><X size={16}/> Cancelar</button></div>
    {formError && <ErrorBanner message={formError} />}
    <form className="panel form-panel" onSubmit={async (event) => {
      event.preventDefault()
      const form = Object.fromEntries(new FormData(event.currentTarget).entries())
      const typedDevice = String(form.deviceLabel || '').trim()
      delete form.deviceLabel
      setSaving(true); setFormError('')
      try {
        let vehicleId = quote?.vehicleId || ''
        if (typedDevice) {
          const space = typedDevice.indexOf(' ')
          const brand = space === -1 ? typedDevice : typedDevice.slice(0, space)
          const model = space === -1 ? '' : typedDevice.slice(space + 1)
          if (vehicleId) {
            await vehiclesService.update(vehicleId, { customerId: form.customerId, brand, model })
          } else {
            const device = await vehiclesService.create({ customerId: form.customerId, brand, model })
            vehicleId = device.id
          }
        }
        const payload = { ...form, vehicleId, items: quote?.items || [] }
        const saved = id ? await quotesService.update(id, payload) : await quotesService.create(payload)
        toast.push('success', 'Orçamento salvo com sucesso.')
        onNavigate(`Orçamento:${saved.id}`)
      } catch (err) {
        setFormError(err instanceof ApiError ? err.message : 'Não foi possível salvar o orçamento.')
      } finally { setSaving(false) }
    }}>
      <div className="form-grid">
        <label>Cliente<select name="customerId" defaultValue={quote?.customerId || ''}><option value="">Selecione o cliente</option>{(customers.data?.items || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Aparelho<input name="deviceLabel" defaultValue={quote?.vehicleLabel || ''} placeholder="Ex.: iPhone 13, Galaxy S23..." /></label>
        <label>Status<select name="status" defaultValue={quote?.status || 'DRAFT'}>{Object.entries(quoteLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Desconto<input name="discount" defaultValue={quote?.discount || '0'} /></label>
        <label className="span-2">Observações<textarea name="notes" defaultValue={quote?.notes} /></label>
      </div>
      <button className="btn primary" disabled={saving} style={{ marginTop: 18 }}>{saving ? 'Salvando...' : 'Salvar orçamento'}</button>
      {quote?.status === 'APPROVED' && <button type="button" className="btn secondary" style={{ marginLeft: 8 }} onClick={async () => {
        try {
          const order = await quotesService.convert(quote.id) as { id: string }
          toast.push('success', 'Orçamento convertido em ordem de serviço.')
          onNavigate(`OS:${order.id}`)
        } catch (err) {
          toast.push('error', err instanceof ApiError ? err.message : 'Não foi possível converter o orçamento.')
        }
      }}>Transformar em OS</button>}
    </form>
  </>
}
