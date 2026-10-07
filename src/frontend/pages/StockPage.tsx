import { useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, Calendar, Package, Plus, Search, X } from 'lucide-react'
import { productsService } from '../services/products'
import { EmptyBlock, ErrorBanner, LoadingBlock, MetricCard, Pagination } from '../components/MetricCard'
import { formatBRL, statusStyles, useAsync } from '../hooks/useAsync'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../services/api'
import { ENTRY_ORIGINS, EXIT_REASONS, ORIGIN_LABELS, STOCK_STATUS_LABELS } from '../../shared/stock'
import type { Product, StockMovement, StockMutationResult } from '../lib/types'

const UNITS = ['UN', 'PC', 'CX', 'KIT', 'PAR', 'M', 'KG']

function StockSubnav({ active, onNavigate }: { active: string; onNavigate: (label: string) => void }) {
  const items = [
    { label: 'Estoque', text: 'Produtos', on: active === 'Estoque' || active === 'Novo produto' || active.startsWith('Produto:') || active.startsWith('Editar produto:') },
    { label: 'Movimentações', text: 'Movimentações', on: active === 'Movimentações' },
    { label: 'Painel de estoque', text: 'Painel', on: active === 'Painel de estoque' },
  ]
  return <div className="subnav">{items.map((item) => <button key={item.label} type="button" className={item.on ? 'active' : ''} onClick={() => onNavigate(item.label)}>{item.text}</button>)}</div>
}

function formatMovementDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function localDateTimeInput(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function Qty({ value }: { value: number }) {
  return <strong className={value > 0 ? 'qty-in' : 'qty-out'}>{value > 0 ? `+${value}` : value}</strong>
}

function canWrite(user?: { role?: string; permissions?: string[] } | null, code = 'stock.write') {
  return user?.role === 'ADMIN' || Boolean(user?.permissions?.includes('*') || user?.permissions?.includes(code))
}

function MovementDialog({
  mode,
  product,
  onClose,
  onDone,
}: {
  mode: 'entry' | 'exit'
  product: Product
  onClose: () => void
  onDone: (result: StockMutationResult) => void
}) {
  const toast = useToast()
  const suppliers = useAsync(() => mode === 'entry' ? productsService.suppliers() : Promise.resolve([]), [mode])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitCost, setUnitCost] = useState(product.costPrice || '')
  const [occurredAt, setOccurredAt] = useState(localDateTimeInput())
  const [supplierId, setSupplierId] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [documentNumber, setDocumentNumber] = useState('')
  const [description, setDescription] = useState('')
  const [originType, setOriginType] = useState('COMPRA')
  const [reason, setReason] = useState('CONSUMO')
  const parsedQty = Number(quantity)
  const nextStock = Number.isInteger(parsedQty) && parsedQty > 0
    ? mode === 'entry' ? product.quantity + parsedQty : product.quantity - parsedQty
    : null

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
      setError('A quantidade deve ser um inteiro maior que zero.')
      return
    }
    if (mode === 'entry' && unitCost !== '' && Number(String(unitCost).replace(',', '.')) < 0) {
      setError('O custo unitário não pode ser negativo.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = mode === 'entry'
        ? await productsService.entry({
            productId: product.id,
            quantity: parsedQty,
            unitCost: unitCost === '' ? undefined : String(unitCost).replace(',', '.'),
            occurredAt: new Date(occurredAt).toISOString(),
            supplierId: supplierId || undefined,
            supplierName: supplierName.trim() || undefined,
            documentNumber: documentNumber.trim() || undefined,
            description: description.trim() || undefined,
            originType,
          })
        : await productsService.exit({
            productId: product.id,
            quantity: parsedQty,
            reason,
            occurredAt: new Date(occurredAt).toISOString(),
            description: description.trim() || undefined,
          })
      const warning = result.aboveMaximum ? ` Acima do estoque máximo (${product.maxQuantity}).` : ''
      toast.push('success', `${mode === 'entry' ? 'Entrada' : 'Saída'} registrada. Estoque: ${result.previousStock} → ${result.resultingStock}.${warning}`)
      onDone(result)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível registrar a movimentação.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="modal-backdrop" onClick={() => { if (!saving) onClose() }}>
    <form className="modal" onClick={(event) => event.stopPropagation()} onSubmit={(event) => void submit(event)}>
      <h2>{mode === 'entry' ? 'Registrar entrada' : 'Registrar saída'}</h2>
      <p className="sub">{product.sku} · {product.name}. Estoque atual: {product.quantity} {product.unit}.</p>
      {error && <ErrorBanner message={error} />}
      <div className="form-grid">
        <label>Quantidade<input value={quantity} onChange={(event) => setQuantity(event.target.value)} inputMode="numeric" required /></label>
        <label>Data<input type="datetime-local" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} required /></label>
        {mode === 'entry' ? <>
          <label>Custo unitário<input value={unitCost} onChange={(event) => setUnitCost(event.target.value)} inputMode="decimal" placeholder="0,00" /></label>
          <label>Origem<select value={originType} onChange={(event) => setOriginType(event.target.value)}>{ENTRY_ORIGINS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label>Fornecedor<select value={supplierId} onChange={(event) => setSupplierId(event.target.value)}><option value="">Não informado</option>{(suppliers.data || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Novo fornecedor<input value={supplierName} onChange={(event) => setSupplierName(event.target.value)} placeholder="Se não estiver na lista" /></label>
          <label className="span-2">Documento<input value={documentNumber} onChange={(event) => setDocumentNumber(event.target.value)} placeholder="NF 12345" /></label>
        </> : <label className="span-2">Motivo<select value={reason} onChange={(event) => setReason(event.target.value)}>{EXIT_REASONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>}
        <label className="span-2">Observação<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label>
      </div>
      {nextStock != null && <p className="help-inline">Saldo previsto: {product.quantity} {mode === 'entry' ? '+' : '−'} {parsedQty} = {nextStock} {product.unit}</p>}
      <div className="modal-actions">
        <button type="button" className="btn secondary" disabled={saving} onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn primary" disabled={saving}>{saving ? 'Salvando...' : 'Confirmar'}</button>
      </div>
    </form>
  </div>
}

function MovementTable({ rows, showProduct = false }: { rows: StockMovement[]; showProduct?: boolean }) {
  if (!rows.length) return <EmptyBlock title="Nenhuma movimentação" subtitle="As entradas e saídas aparecem aqui." />
  return <div className="table-wrap"><table><thead><tr>
    <th>Data</th>{showProduct && <th>Produto</th>}<th>Tipo</th><th>Quantidade</th><th>Saldo anterior</th><th>Saldo posterior</th><th>Motivo</th><th>Origem</th><th>Usuário</th>
  </tr></thead><tbody>
    {rows.map((row) => <tr key={row.id}>
      <td className="muted">{formatMovementDate(row.occurredAt)}</td>
      {showProduct && <td><strong>{row.productName}</strong><small className="muted"> {row.productSku}</small></td>}
      <td><span className={`status ${statusStyles[row.typeLabel] || ''}`}>{row.typeLabel}</span></td>
      <td><Qty value={row.signedQuantity} /></td>
      <td>{row.previousStock}</td>
      <td>{row.resultingStock}</td>
      <td>{row.reasonLabel}</td>
      <td>{row.originLabel || ORIGIN_LABELS[row.originType]}</td>
      <td>{row.userName || '—'}</td>
    </tr>)}
  </tbody></table></div>
}

export function StockProductsPage({ active, onNavigate }: { active: string; onNavigate: (label: string) => void }) {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [stockStatus, setStockStatus] = useState('ALL')
  const [page, setPage] = useState(1)
  const categories = useAsync(() => productsService.categories(), [])
  const { data, loading, error } = useAsync(
    () => productsService.list({ search, categoryId, stockStatus, page, pageSize: 10 }),
    [search, categoryId, stockStatus, page],
  )

  return <>
    <div className="page-heading"><div><p className="eyebrow">Estoque</p><h1>Produtos</h1><p className="subheading">Cadastre peças e acompanhe o saldo. O estoque só muda por movimentação.</p></div><button className="btn primary" onClick={() => onNavigate('Novo produto')}><Plus size={17} /> Novo produto</button></div>
    <StockSubnav active={active} onNavigate={onNavigate} />
    <div className="toolbar panel">
      <div className="input-search"><Search size={17} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Buscar por nome ou código..." /></div>
      <select value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1) }}><option value="">Todas as categorias</option>{(categories.data || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <select value={stockStatus} onChange={(event) => { setStockStatus(event.target.value); setPage(1) }}><option value="ALL">Todas as situações</option>{Object.entries(STOCK_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
    </div>
    {error && <ErrorBanner message={error} />}
    <div className="panel full-table">
      {loading ? <LoadingBlock /> : !data?.items.length ? <EmptyBlock title="Nenhum produto encontrado" subtitle="Cadastre o primeiro produto para controlar o estoque." /> : <div className="table-wrap"><table><thead><tr><th>Código</th><th>Produto</th><th>Categoria</th><th>Estoque</th><th>Status</th></tr></thead>
        <tbody>{data.items.map((row) => <tr key={row.id} className="clickable-row" onClick={() => onNavigate(`Produto:${row.id}`)}>
          <td><strong className="order-id">{row.sku}</strong></td>
          <td><strong>{row.name}</strong>{!row.active && <small className="muted"> · inativo</small>}</td>
          <td>{row.categoryName || '—'}</td>
          <td>{row.quantity} {row.unit}</td>
          <td><span className={`status ${statusStyles[row.stockStatusLabel] || ''}`}>{row.stockStatusLabel}</span></td>
        </tr>)}</tbody>
      </table></div>}
      {data && <Pagination page={data.page} pageCount={data.pageCount} total={data.total} pageSize={data.pageSize} onPage={setPage} />}
    </div>
  </>
}

export function StockProductFormPage({ id, active, onNavigate }: { id?: string; active: string; onNavigate: (label: string) => void }) {
  const toast = useToast()
  const { user } = useAuth()
  const existing = useAsync(() => id ? productsService.get(id) : Promise.resolve(null), [id])
  const categories = useAsync(() => productsService.categories(), [])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const product = existing.data
  const showDelete = Boolean(id && canWrite(user, 'products.delete'))

  if ((id && existing.loading) || categories.loading) return <LoadingBlock />
  if (id && existing.error) return <ErrorBanner message={existing.error} />

  return <>
    <div className="page-heading"><div><p className="eyebrow">Estoque / {id ? 'Editar' : 'Novo'}</p><h1>{id ? 'Editar produto' : 'Novo produto'}</h1><p className="subheading">{id ? 'Os dados cadastrais não alteram o saldo.' : 'O produto entra com estoque zero. Depois registre uma entrada.'}</p></div>
      <div className="heading-actions">{showDelete && <DeleteProduct id={id!} name={product?.name || 'produto'} onDone={() => onNavigate('Estoque')} />} <button className="btn secondary" onClick={() => onNavigate(id ? `Produto:${id}` : 'Estoque')}><X size={16} /> Cancelar</button></div>
    </div>
    <StockSubnav active={active} onNavigate={onNavigate} />
    {formError && <ErrorBanner message={formError} />}
    <form className="form-layout single" onSubmit={async (event) => {
      event.preventDefault()
      const form = new FormData(event.currentTarget)
      const sku = String(form.get('sku') || '').trim()
      const name = String(form.get('name') || '').trim()
      const minQuantity = Number(form.get('minQuantity') || 0)
      const maxQuantity = Number(form.get('maxQuantity') || 0)
      const costPrice = String(form.get('costPrice') || '0').replace(',', '.')
      const salePrice = String(form.get('salePrice') || '0').replace(',', '.')
      if (!sku) return setFormError('Informe o código do produto.')
      if (!name) return setFormError('Informe o nome do produto.')
      if (Number(costPrice) < 0 || Number(salePrice) < 0) return setFormError('Os preços não podem ser negativos.')
      if (minQuantity < 0 || maxQuantity < 0) return setFormError('Os limites de estoque não podem ser negativos.')
      if (maxQuantity > 0 && maxQuantity < minQuantity) return setFormError('O estoque máximo deve ser maior ou igual ao mínimo.')
      setSaving(true)
      setFormError('')
      try {
        const newCategory = String(form.get('newCategory') || '').trim()
        let categoryId = String(form.get('categoryId') || '')
        if (newCategory) categoryId = (await productsService.createCategory(newCategory)).id
        const payload = {
          sku,
          name,
          description: String(form.get('description') || ''),
          categoryId: categoryId || undefined,
          costPrice,
          salePrice,
          minQuantity,
          maxQuantity,
          unit: String(form.get('unit') || 'UN'),
          active: String(form.get('active') || 'true') === 'true',
        }
        if (id) {
          await productsService.update(id, payload)
          toast.push('success', 'Produto atualizado.')
          onNavigate(`Produto:${id}`)
        } else {
          const created = await productsService.create(payload)
          toast.push('success', 'Produto cadastrado. Registre uma entrada para abastecer o estoque.')
          onNavigate(`Produto:${created.id}`)
        }
      } catch (err) {
        setFormError(err instanceof ApiError ? err.message : 'Não foi possível salvar o produto.')
      } finally {
        setSaving(false)
      }
    }}>
      <div className="panel form-panel">
        <div className="section-title"><span className="step">01</span><div><h2>Identificação</h2><p>Código, nome e classificação.</p></div></div>
        <div className="form-grid">
          <label>Código / SKU<input name="sku" defaultValue={product?.sku} placeholder="FIL-001" /></label>
          <label>Nome<input name="name" defaultValue={product?.name} placeholder="Filtro de óleo" /></label>
          <label className="span-2">Descrição<textarea name="description" defaultValue={product?.description} /></label>
          <label>Categoria<select name="categoryId" defaultValue={product?.categoryId || ''}><option value="">Sem categoria</option>{(categories.data || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Nova categoria<input name="newCategory" placeholder="Cria se ainda não existir" /></label>
        </div>
      </div>
      <div className="panel form-panel">
        <div className="section-title"><span className="step">02</span><div><h2>Preço e limites</h2><p>O saldo atual não é editado neste cadastro.</p></div></div>
        {id && <p className="help-inline">Estoque atual: {product?.quantity ?? 0} {product?.unit || 'UN'}</p>}
        <div className="form-grid">
          <label>Unidade<select name="unit" defaultValue={product?.unit || 'UN'}>{UNITS.map((unit) => <option key={unit}>{unit}</option>)}{product?.unit && !UNITS.includes(product.unit) && <option>{product.unit}</option>}</select></label>
          <label>Situação<select name="active" defaultValue={product?.active === false ? 'false' : 'true'}><option value="true">Ativo</option><option value="false">Inativo</option></select></label>
          <label>Preço de custo<input name="costPrice" defaultValue={product?.costPrice || '0.00'} inputMode="decimal" /></label>
          <label>Preço de venda<input name="salePrice" defaultValue={product?.salePrice || '0.00'} inputMode="decimal" /></label>
          <label>Estoque mínimo<input name="minQuantity" type="number" min={0} defaultValue={product?.minQuantity ?? 0} /></label>
          <label>Estoque máximo<input name="maxQuantity" type="number" min={0} defaultValue={product?.maxQuantity ?? 0} /></label>
        </div>
        <p className="help-inline">Estoque máximo 0 significa sem limite.</p>
        <button className="btn primary" disabled={saving} style={{ marginTop: 8 }}>{saving ? 'Salvando...' : id ? 'Salvar alterações' : 'Cadastrar produto'}</button>
      </div>
    </form>
  </>
}

function DeleteProduct({ id, name, onDone }: { id: string; name: string; onDone: () => void }) {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  return <>
    <button type="button" className="btn danger" onClick={() => setOpen(true)}>Excluir</button>
    {open && <div className="modal-backdrop" onClick={() => { if (!deleting) setOpen(false) }}>
      <div className="modal" style={{ width: 'min(420px, 100%)' }} onClick={(event) => event.stopPropagation()}>
        <h2>Excluir produto</h2>
        <p className="sub">O cadastro de {name} será removido. Produtos com movimentações devem ser inativados.</p>
        <div className="modal-actions">
          <button type="button" className="btn secondary" disabled={deleting} onClick={() => setOpen(false)}>Cancelar</button>
          <button type="button" className="btn danger" disabled={deleting} onClick={async () => {
            setDeleting(true)
            try {
              await productsService.remove(id)
              toast.push('success', 'Produto excluído.')
              onDone()
            } catch (err) {
              toast.push('error', err instanceof ApiError ? err.message : 'Não foi possível excluir o produto.')
              setOpen(false)
            } finally {
              setDeleting(false)
            }
          }}>{deleting ? 'Excluindo...' : 'Excluir'}</button>
        </div>
      </div>
    </div>}
  </>
}

export function StockProductPage({ id, active, onNavigate }: { id: string; active: string; onNavigate: (label: string) => void }) {
  const toast = useToast()
  const { user } = useAuth()
  const product = useAsync(() => productsService.get(id), [id])
  const history = useAsync(() => productsService.movements({ productId: id, page: 1, pageSize: 20 }), [id])
  const [dialog, setDialog] = useState<'entry' | 'exit' | null>(null)
  const [statusSaving, setStatusSaving] = useState(false)
  const item = product.data
  const writable = canWrite(user)

  async function toggleStatus() {
    if (!item) return
    setStatusSaving(true)
    try {
      await productsService.setStatus(item.id, !item.active)
      toast.push('success', item.active ? 'Produto inativado.' : 'Produto reativado.')
      product.reload()
    } catch (err) {
      toast.push('error', err instanceof ApiError ? err.message : 'Não foi possível alterar o status.')
    } finally {
      setStatusSaving(false)
    }
  }

  if (product.loading && !item) return <LoadingBlock />
  if (product.error) return <ErrorBanner message={product.error} />
  if (!item) return null

  return <>
    <div className="page-heading"><div><p className="eyebrow">Estoque / {item.sku}</p><h1>{item.name}</h1><p className="subheading">{item.categoryName || 'Sem categoria'} · {item.active ? 'Ativo' : 'Inativo'}</p></div>
      <div className="heading-actions">
        <button className="btn secondary" onClick={() => onNavigate(`Editar produto:${item.id}`)}>Editar</button>
        {canWrite(user, 'products.write') && <button className="btn secondary" disabled={statusSaving} onClick={() => void toggleStatus()}>{item.active ? 'Inativar' : 'Reativar'}</button>}
        <button className="btn secondary" disabled={!writable || !item.active} onClick={() => setDialog('exit')}><ArrowDown size={16} /> Registrar saída</button>
        <button className="btn primary" disabled={!writable || !item.active} onClick={() => setDialog('entry')}><ArrowUp size={16} /> Registrar entrada</button>
      </div>
    </div>
    <StockSubnav active={active} onNavigate={onNavigate} />
    {!item.active && <ErrorBanner message="Produto inativo. Reative-o para registrar saídas." />}
    <div className="stock-levels">
      <div className="stock-level"><span>Estoque atual</span><strong>{item.quantity} {item.unit}</strong></div>
      <div className="stock-level"><span>Estoque mínimo</span><strong>{item.minQuantity} {item.unit}</strong></div>
      <div className="stock-level"><span>Estoque máximo</span><strong>{item.maxQuantity > 0 ? `${item.maxQuantity} ${item.unit}` : 'Sem limite'}</strong></div>
    </div>
    <div className="panel" style={{ marginBottom: 17, padding: '16px 18px' }}>
      <div className="summary-lines"><div><span>Custo</span><b>{formatBRL(item.costPrice)}</b></div><div><span>Venda</span><b>{formatBRL(item.salePrice)}</b></div><div><span>Situação</span><b>{item.stockStatusLabel}</b></div></div>
      {item.description && <p className="help-inline" style={{ marginTop: 8 }}>{item.description}</p>}
    </div>
    <div className="panel full-table">
      <div className="panel-header"><div><h2>Histórico</h2><p>Saldo anterior, quantidade e saldo posterior de cada movimento.</p></div></div>
      {history.loading ? <LoadingBlock /> : history.error ? <ErrorBanner message={history.error} /> : <MovementTable rows={history.data?.items || []} />}
    </div>
    {dialog && <MovementDialog mode={dialog} product={item} onClose={() => setDialog(null)} onDone={() => { setDialog(null); product.reload(); history.reload() }} />}
  </>
}

function formatFilterDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'dd/mm/aaaa'
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function DateFilter({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="date-filter">
      <span>{label}</span>
      <span className={value ? 'date-filter-value' : 'date-filter-value is-empty'}>{formatFilterDate(value)}</span>
      <Calendar size={14} />
      <input type="date" lang="pt-BR" value={value} aria-label={label} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

export function StockMovementsPage({ active, onNavigate }: { active: string; onNavigate: (label: string) => void }) {
  const [productId, setProductId] = useState('')
  const [type, setType] = useState('ALL')
  const [reason, setReason] = useState('ALL')
  const [originType, setOriginType] = useState('ALL')
  const [userId, setUserId] = useState('ALL')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const products = useAsync(() => productsService.options(), [])
  const users = useAsync(() => productsService.users(), [])
  const { data, loading, error } = useAsync(
    () => productsService.movements({ productId, type, reason, originType, userId, from, to, page, pageSize: 15 }),
    [productId, type, reason, originType, userId, from, to, page],
  )

  return <>
    <div className="page-heading"><div><p className="eyebrow">Estoque</p><h1>Movimentações</h1><p className="subheading">Histórico auditável de entradas e saídas.</p></div></div>
    <StockSubnav active={active} onNavigate={onNavigate} />
    <div className="toolbar panel">
      <select value={productId} onChange={(event) => { setProductId(event.target.value); setPage(1) }}><option value="">Todos os produtos</option>{(products.data || []).map((item) => <option key={item.id} value={item.id}>{item.sku} · {item.name}</option>)}</select>
      <select value={type} onChange={(event) => { setType(event.target.value); setPage(1) }}><option value="ALL">Tipo</option><option value="ENTRADA">Entrada</option><option value="SAIDA">Saída</option></select>
      <select value={reason} onChange={(event) => { setReason(event.target.value); setPage(1) }}><option value="ALL">Motivo</option>{EXIT_REASONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}<option value="COMPRA">Compra</option></select>
      <select value={originType} onChange={(event) => { setOriginType(event.target.value); setPage(1) }}><option value="ALL">Origem</option>{Object.entries(ORIGIN_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <select value={userId} onChange={(event) => { setUserId(event.target.value); setPage(1) }}><option value="ALL">Usuário</option>{(users.data || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <div className="date-range">
        <DateFilter label="De" value={from} onChange={(value) => { setFrom(value); setPage(1) }} />
        <DateFilter label="Até" value={to} onChange={(value) => { setTo(value); setPage(1) }} />
      </div>
    </div>
    {error && <ErrorBanner message={error} />}
    <div className="panel full-table">
      {loading ? <LoadingBlock /> : <MovementTable rows={data?.items || []} showProduct />}
      {data && <Pagination page={data.page} pageCount={data.pageCount} total={data.total} pageSize={data.pageSize} onPage={setPage} />}
    </div>
  </>
}

export function StockDashboardPage({ active, onNavigate }: { active: string; onNavigate: (label: string) => void }) {
  const { data, loading, error } = useAsync(() => productsService.dashboard(), [])
  if (loading && !data) return <LoadingBlock label="Carregando estoque..." />
  if (error) return <ErrorBanner message={error} />
  if (!data) return null

  return <>
    <div className="page-heading"><div><p className="eyebrow">Estoque</p><h1>Painel</h1><p className="subheading">Posição, alertas e movimentações recentes.</p></div><button className="btn primary" onClick={() => onNavigate('Novo produto')}><Plus size={17} /> Novo produto</button></div>
    <StockSubnav active={active} onNavigate={onNavigate} />
    <section className="metric-grid">
      <MetricCard icon={Package} label="Produtos" value={String(data.totalProducts)} detail={`${data.activeProducts} ativos`} />
      <MetricCard icon={Package} label="Estoque baixo" value={String(data.lowStockCount)} detail="Abaixo do mínimo" tone="amber" />
      <MetricCard icon={Package} label="Sem estoque" value={String(data.outOfStockCount)} detail="Saldo zerado" tone="amber" />
      <MetricCard icon={Package} label="Valor do estoque" value={formatBRL(data.stockValue)} detail="Pelo custo dos ativos" tone="green" />
    </section>
    <div className="panel full-table" style={{ marginBottom: 17 }}>
      <div className="panel-header"><div><h2>Estoque baixo</h2><p>Produtos ativos no mínimo ou zerados.</p></div></div>
      {!data.lowStock.length ? <EmptyBlock title="Nenhum alerta" subtitle="Todos os produtos ativos estão com saldo normal." /> : <div className="table-wrap"><table><thead><tr><th>Produto</th><th>Estoque atual</th><th>Estoque mínimo</th><th>Situação</th></tr></thead><tbody>
        {data.lowStock.map((row) => <tr key={row.id} className="clickable-row" onClick={() => onNavigate(`Produto:${row.id}`)}>
          <td><strong>{row.name}</strong><small className="muted"> {row.sku}</small></td>
          <td>{row.quantity} {row.unit}</td>
          <td>{row.minQuantity} {row.unit}</td>
          <td><span className={`status ${statusStyles[STOCK_STATUS_LABELS[row.stockStatus]] || ''}`}>{STOCK_STATUS_LABELS[row.stockStatus]}</span></td>
        </tr>)}
      </tbody></table></div>}
    </div>
    <section className="lower-grid">
      <div className="panel"><div className="panel-header"><div><h2>Entradas recentes</h2><p>Últimos abastecimentos</p></div></div>{!data.recentEntries.length ? <EmptyBlock title="Sem entradas" subtitle="Nenhuma entrada registrada." /> : <MovementTable rows={data.recentEntries} showProduct />}</div>
      <div className="panel"><div className="panel-header"><div><h2>Saídas recentes</h2><p>Últimos consumos</p></div></div>{!data.recentExits.length ? <EmptyBlock title="Sem saídas" subtitle="Nenhuma saída registrada." /> : <MovementTable rows={data.recentExits} showProduct />}</div>
    </section>
  </>
}

