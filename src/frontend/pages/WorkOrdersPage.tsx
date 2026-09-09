import { useMemo, useState, type FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { Copy, MoreHorizontal, Plus, Printer, Search, SlidersHorizontal, X } from 'lucide-react'
import { workOrdersService } from '../services/work-orders'
import { customersService } from '../services/customers'
import { vehiclesService } from '../services/vehicles'
import { productsService, servicesService } from '../services/products'
import { EmptyBlock, ErrorBanner, LoadingBlock, Pagination } from '../components/MetricCard'
import { WorkOrderPrintDocument, WorkOrderPrintMenu, serializePrintDocument, type WorkOrderPrintMode } from '../components/WorkOrderPrint'
import { formatBRL, formatDateTime, initials, statusStyles, useAsync } from '../hooks/useAsync'
import { useToast } from '../context/ToastContext'
import { ApiError } from '../services/api'
import { settingsService } from '../services/dashboard'
import type { WorkOrder, Workshop } from '../lib/types'

const STATUS_OPTIONS = [
  ['ALL', 'Todos os status'],
  ['IN_PROGRESS', 'Em execução'],
  ['WAITING_APPROVAL', 'Aguardando aprovação'],
  ['WAITING_PART', 'Aguardando peça'],
  ['COMPLETED', 'Concluída'],
  ['DELIVERED', 'Entregue'],
  ['DRAFT', 'Rascunho'],
  ['CANCELLED', 'Cancelada'],
]

export function WorkOrdersPage({ onNavigate }: { onNavigate: (label: string) => void }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [page, setPage] = useState(1)
  const { data, loading, error } = useAsync(() => workOrdersService.list({ search, status, page, pageSize: 10 }), [search, status, page])
  return <>
    <div className="page-heading"><div><p className="eyebrow">Gestão</p><h1>Ordens de serviço</h1><p className="subheading">Acompanhe as manutenções técnicas da assistência.</p></div><button className="btn primary" onClick={() => onNavigate('Nova Ordem de Serviço')}><Plus size={17}/> Nova ordem de serviço</button></div>
    <div className="toolbar panel"><div className="input-search"><Search size={17}/><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} placeholder="Buscar por OS, cliente ou aparelho..." /></div><button className="btn secondary"><SlidersHorizontal size={16}/> Filtros</button><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    {error && <ErrorBanner message={error} />}
    <div className="panel full-table">{loading ? <LoadingBlock /> : !data?.items.length ? <EmptyBlock title="Nenhuma ordem encontrada" subtitle="Crie uma OS para iniciar uma manutenção técnica." /> : <div className="table-wrap"><table><thead><tr><th>Nº OS</th><th>Cliente</th><th>Aparelho</th><th>Entrada</th><th>Status</th><th>Valor</th><th></th></tr></thead><tbody>{data.items.map((order) => <tr key={order.id} className="clickable-row" onClick={() => onNavigate(`OS:${order.id}`)}><td><strong className="order-id">{order.numberLabel}</strong></td><td>{order.customerName}</td><td>{order.vehicleLabel}</td><td className="muted">{formatDateTime(order.entryDate)}</td><td><span className={`status ${statusStyles[order.statusLabel] || statusStyles[order.status]}`}>{order.statusLabel}</span></td><td><strong>{formatBRL(order.total)}</strong></td><td><button className="row-menu"><MoreHorizontal size={17}/></button></td></tr>)}</tbody></table></div>}
    {data && <Pagination page={data.page} pageCount={data.pageCount} total={data.total} pageSize={data.pageSize} onPage={setPage} />}</div>
  </>
}

export function WorkOrderFormPage({ id, onNavigate }: { id?: string; onNavigate: (label: string) => void }) {
  const toast = useToast()
  const customers = useAsync(() => customersService.list({ page: 1, pageSize: 100 }), [])
  const services = useAsync(() => servicesService.list({ page: 1, pageSize: 100 }), [])
  const products = useAsync(() => productsService.list({ page: 1, pageSize: 100 }), [])
  const users = useAsync(() => settingsService.get(), [])
  const existing = useAsync(() => id ? workOrdersService.get(id) : Promise.resolve(null), [id])
  const [customerId, setCustomerId] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [printMode, setPrintMode] = useState<WorkOrderPrintMode>('a5-dupla')
  const order = existing.data as WorkOrder | null
  const workshop = (users.data as { workshop?: Workshop } | null)?.workshop
  const vehicles = useAsync(() => vehiclesService.list({ page: 1, pageSize: 100, customerId: customerId || order?.customerId || '' }), [customerId, order?.customerId])

  async function printOrder(mode: WorkOrderPrintMode) {
    flushSync(() => setPrintMode(mode))
    try {
      if (window.shoficina?.printHtml) {
        const html = await serializePrintDocument()
        const result = await window.shoficina.printHtml(html)
        if (result?.canceled) return
        toast.push('success', result?.via === 'pdf' ? 'PDF aberto para impressão.' : 'Ordem enviada para impressão.')
        return
      }
      window.print()
    } catch (err) {
      toast.push('error', err instanceof Error ? err.message : 'Não foi possível imprimir a ordem de serviço.')
    }
  }

  const selectedCustomer = useMemo(() => (customers.data?.items || []).find((item) => item.id === (customerId || order?.customerId)), [customers.data, customerId, order])
  const selectedVehicle = useMemo(() => (vehicles.data?.items || []).find((item) => item.id === order?.vehicleId), [vehicles.data, order])

  if (id && existing.loading) return <LoadingBlock />

  async function save(event: FormEvent<HTMLFormElement>, sendQuote = false) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = Object.fromEntries(form.entries())
    setSaving(true); setFormError('')
    try {
      const saved = id ? await workOrdersService.update(id, payload) : await workOrdersService.create({ ...payload, status: sendQuote ? 'WAITING_APPROVAL' : 'DRAFT' })
      toast.push('success', id ? 'Ordem de serviço atualizada.' : 'Ordem de serviço salva com sucesso.')
      onNavigate(`OS:${saved.id}`)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Não foi possível salvar a ordem de serviço.')
    } finally { setSaving(false) }
  }

  return <>
    <div className="page-heading"><div><p className="eyebrow">Ordens de serviço / {id ? order?.numberLabel : 'Nova'}</p><h1>{id ? `Ordem ${order?.numberLabel}` : 'Nova ordem de serviço'}</h1><p className="subheading">Preencha os dados para iniciar a manutenção técnica.</p></div><div className="heading-actions">{id && order && <WorkOrderPrintMenu onPrint={printOrder} />}<button className="btn secondary" onClick={() => onNavigate('Ordens de Serviço')}><X size={16}/> Cancelar</button></div></div>
    {id && order && <WorkOrderPrintDocument order={order} workshop={workshop} mode={printMode} />}
    {formError && <ErrorBanner message={formError} />}
    <form className="form-layout" onSubmit={(e) => save(e)}>
      <div className="form-main">
        <div className="panel form-panel"><div className="section-title"><span className="step">01</span><div><h2>Cliente e aparelho</h2><p>Qual celular será reparado?</p></div></div>
          <div className="form-grid">
            <label>Cliente existente<select name="customerId" defaultValue={order?.customerId} onChange={(e) => setCustomerId(e.target.value)} required>{(customers.data?.items || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Aparelho<select name="vehicleId" defaultValue={order?.vehicleId} required>{(vehicles.data?.items || []).map((item) => <option key={item.id} value={item.id}>{item.brand} {item.model}{item.chassis ? ` — ${item.chassis}` : ''}</option>)}</select></label>
            <label>Ciclos de bateria<input name="mileage" defaultValue={order?.mileage ?? selectedVehicle?.mileage} /></label>
            <label>Técnico responsável<select name="mechanicId" defaultValue={order?.mechanicId}>{((users.data as any)?.users || []).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          </div>
        </div>
        <div className="panel form-panel"><div className="section-title"><span className="step">02</span><div><h2>Detalhes do atendimento</h2><p>Informações importantes sobre o serviço.</p></div></div>
          <div className="form-grid">
            <label>Data de entrada<input name="entryDate" type="date" defaultValue={(order?.entryDate || new Date().toISOString()).slice(0, 10)} /></label>
            <label>Previsão de entrega<input name="deliveryDate" type="date" defaultValue={order?.deliveryDate?.slice(0, 10)} /></label>
            <label className="span-2">Diagnóstico inicial<textarea name="diagnosis" defaultValue={order?.diagnosis} placeholder="Descreva o defeito relatado e o diagnóstico técnico..." /></label>
            <label className="span-2">Observações<textarea name="notes" defaultValue={order?.notes} placeholder="Observações internas para a equipe..." /></label>
            <label>Desconto<input name="discount" defaultValue={order?.discount || '0'} /></label>
            <label>Acréscimo<input name="surcharge" defaultValue={order?.surcharge || '0'} /></label>
          </div>
        </div>
        <div className="panel form-panel"><div className="section-title"><span className="step">03</span><div><h2>Serviços e peças</h2><p>Adicione os reparos e as peças utilizadas.</p></div></div>
          {id && order ? <OrderItems order={order} services={services.data?.items || []} products={products.data?.items || []} onChanged={existing.reload} /> : <p className="muted">Salve a ordem para adicionar serviços e peças.</p>}
        </div>
        {id && order?.history && <div className="panel form-panel"><h2>Histórico</h2><div className="history-list">{order.history.map((item) => <div key={item.id} className="history-item"><div><strong>{item.toStatus}</strong><small>{item.note} · {formatDateTime(item.createdAt)}</small></div></div>)}</div></div>}
      </div>
      <aside className="order-summary panel">
        <div className="summary-title"><h2>Resumo da ordem</h2><span className={`status ${statusStyles[order?.statusLabel || 'Rascunho']}`}>{order?.statusLabel || 'Orçamento'}</span></div>
        <div className="summary-client"><span className="avatar large">{initials(selectedCustomer?.name || order?.customerName)}</span><div><strong>{selectedCustomer?.name || order?.customerName || 'Cliente'}</strong><small>{order?.vehicleLabel || 'Selecione o aparelho'}</small></div></div>
        <div className="summary-lines"><div><span>Serviços <small>{order?.services?.length || 0} item</small></span><b>{formatBRL(order?.servicesTotal)}</b></div><div><span>Peças <small>{order?.parts?.length || 0} item</small></span><b>{formatBRL(order?.partsTotal)}</b></div><div><span>Desconto</span><b>{formatBRL(order?.discount)}</b></div></div>
        <div className="summary-total"><span>Total da ordem</span><strong>{formatBRL(order?.total)}</strong></div>
        <button className="btn primary wide" disabled={saving}>{saving ? 'Salvando...' : 'Salvar ordem'}</button>
        {id && order && <>
          <button type="button" className="btn secondary wide" onClick={() => printOrder('a5-dupla')}><Printer size={16}/> Imprimir A5 (O.S. duas vezes)</button>
          <button type="button" className="btn secondary wide" onClick={() => printOrder('segunda-via')}><Copy size={16}/> Imprimir 2ª via</button>
          <StatusActions order={order} onChanged={existing.reload} />
        </>}
      </aside>
    </form>
  </>
}

function OrderItems({ order, services, products, onChanged }: { order: WorkOrder; services: any[]; products: any[]; onChanged: () => void }) {
  const toast = useToast()
  return <>
    {(order.services || []).map((item) => <div className="line-item" key={item.id}><div><strong>{item.description}</strong><small>Serviço</small></div><span>{item.quantity} × {formatBRL(item.unitPrice)}</span><button type="button" className="row-menu" onClick={async () => { await workOrdersService.removeService(order.id, item.id); onChanged() }}><X size={15}/></button></div>)}
    {(order.parts || []).map((item) => <div className="line-item" key={item.id}><div><strong>{item.description}</strong><small>Produto</small></div><span>{item.quantity} × {formatBRL(item.unitPrice)}</span><button type="button" className="row-menu" onClick={async () => { await workOrdersService.removePart(order.id, item.id); onChanged() }}><X size={15}/></button></div>)}
    <div className="form-grid" style={{ marginTop: 16 }}>
      <label>Adicionar serviço<select id="svc">{services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <button type="button" className="btn secondary" onClick={async () => {
        const serviceId = (document.getElementById('svc') as HTMLSelectElement)?.value
        try { await workOrdersService.addService(order.id, { serviceId, quantity: '1' }); onChanged() }
        catch (err) { toast.push('error', err instanceof ApiError ? err.message : 'Não foi possível adicionar o serviço.') }
      }}>Adicionar serviço</button>
      <label>Adicionar peça<select id="prd">{products.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.quantity})</option>)}</select></label>
      <button type="button" className="btn secondary" onClick={async () => {
        const productId = (document.getElementById('prd') as HTMLSelectElement)?.value
        try { await workOrdersService.addPart(order.id, { productId, quantity: 1 }); onChanged() }
        catch (err) { toast.push('error', err instanceof ApiError ? err.message : 'Não foi possível adicionar a peça.') }
      }}>Adicionar peça</button>
    </div>
  </>
}

function StatusActions({ order, onChanged }: { order: WorkOrder; onChanged: () => void }) {
  const toast = useToast()
  const next: Record<string, [string, string][]> = {
    DRAFT: [['WAITING_APPROVAL', 'Enviar para aprovação'], ['CANCELLED', 'Cancelar']],
    WAITING_APPROVAL: [['APPROVED', 'Aprovar'], ['DRAFT', 'Voltar para rascunho']],
    APPROVED: [['IN_PROGRESS', 'Iniciar execução']],
    IN_PROGRESS: [['WAITING_PART', 'Aguardando peça'], ['COMPLETED', 'Concluir']],
    WAITING_PART: [['IN_PROGRESS', 'Retomar']],
    COMPLETED: [['DELIVERED', 'Entregar']],
  }
  return <>{(next[order.status] || []).map(([status, label]) => <button key={status} type="button" className="btn secondary wide" onClick={async () => {
    try { await workOrdersService.changeStatus(order.id, status); toast.push('success', 'Status atualizado.'); onChanged() }
    catch (err) { toast.push('error', err instanceof ApiError ? err.message : 'Não foi possível alterar o status.') }
  }}>{label}</button>)}</>
}
