import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Copy, Printer } from 'lucide-react'
import { formatBRL, formatDate } from '../hooks/useAsync'
import { publicAsset } from '../lib/assets'
import type { WorkOrder, Workshop } from '../lib/types'
import { WORKSHOP_PROFILE, isPlaceholderWorkshop } from '../../shared/workshop-profile'

export type WorkOrderPrintMode = 'a5-dupla' | 'segunda-via'

function digitsOnly(value?: string) {
  return (value || '').replace(/\D/g, '')
}

function formatDocument(value?: string) {
  const digits = digitsOnly(value)
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  return value || '—'
}

function formatPhone(value?: string) {
  const digits = digitsOnly(value)
  if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (digits.length === 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return value || '—'
}

function resolvedWorkshop(workshop?: Workshop | null) {
  if (!workshop || isPlaceholderWorkshop(workshop)) return WORKSHOP_PROFILE
  return workshop
}

function workshopValue<K extends keyof typeof WORKSHOP_PROFILE>(workshop: Workshop | null | undefined, key: K) {
  const source = resolvedWorkshop(workshop)
  return (source[key] as string | null | undefined) || WORKSHOP_PROFILE[key] || ''
}

function workshopLine(workshop?: Workshop | null) {
  const cityState = [workshopValue(workshop, 'city'), workshopValue(workshop, 'state')].filter(Boolean).join('-')
  return [workshopValue(workshop, 'address'), cityState, workshopValue(workshop, 'zipCode')].filter(Boolean).join(' - ')
}

function workshopContact(workshop?: Workshop | null) {
  const document = workshopValue(workshop, 'document')
  return [
    `Whats: ${formatPhone(workshopValue(workshop, 'phone'))}`,
    workshopValue(workshop, 'email'),
    document ? `CNPJ ${formatDocument(document)}` : '',
  ].filter(Boolean).join(' | ')
}

function PrintCopy({
  order,
  workshop,
  copyLabel,
  viaLabel,
  secondCopy,
}: {
  order: WorkOrder
  workshop?: Workshop | null
  copyLabel: string
  viaLabel: string
  secondCopy: boolean
}) {
  const customer = order.customer
  const vehicle = order.vehicle
  const items = [
    ...(order.services || []).map((item) => ({
      id: item.id,
      kind: 'Serviço',
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
    })),
    ...(order.parts || []).map((item) => ({
      id: item.id,
      kind: 'Peça',
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: item.unitPrice,
      total: item.total,
    })),
  ]

  return (
    <article className={`os-print-copy${secondCopy ? ' is-second' : ''}`}>
      <header className="os-print-header">
        <div>
          <img src={publicAsset('logo.jpg')} alt={workshopValue(workshop, 'name')} className="os-print-logo" />
          <strong>{workshopValue(workshop, 'name')}</strong>
          <small>{workshopLine(workshop)}</small>
          <small>{workshopContact(workshop)}</small>
        </div>
        <div className="os-print-os">
          <em>{viaLabel}</em>
          <b>{order.numberLabel}</b>
          <span>{copyLabel}</span>
        </div>
      </header>

      <section className="os-print-meta">
        <div><span>Entrada</span><strong>{formatDate(order.entryDate)}</strong></div>
        <div><span>Previsão</span><strong>{formatDate(order.deliveryDate)}</strong></div>
        <div><span>Status</span><strong>{order.statusLabel}</strong></div>
        <div><span>Técnico</span><strong>{order.mechanicName || '—'}</strong></div>
      </section>

      <section className="os-print-grid">
        <div>
          <h3>Cliente</h3>
          <p><b>{customer?.name || order.customerName || '—'}</b></p>
          <p>Doc.: {customer?.documentFormatted || formatDocument(customer?.document)}</p>
          <p>Tel.: {customer?.phoneFormatted || formatPhone(customer?.phone)}</p>
          {customer?.email && <p>{customer.email}</p>}
        </div>
        <div>
          <h3>Aparelho</h3>
          <p><b>{order.vehicleLabel || `${vehicle?.brand || ''} ${vehicle?.model || ''}`.trim() || '—'}</b></p>
          {vehicle?.chassis && <p>Série: {vehicle.chassis}</p>}
          <p>Ciclos: {(order.mileage ?? vehicle?.mileage ?? 0).toLocaleString('pt-BR')}</p>
        </div>
      </section>

      {order.diagnosis && (
        <section className="os-print-block">
          <h3>Defeito / diagnóstico</h3>
          <p>{order.diagnosis}</p>
        </section>
      )}

      {items.length > 0 && (
        <>
          <table className="os-print-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Tipo</th>
                <th>Qtd</th>
                <th>Unit.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td>{item.kind}</td>
                  <td>{item.quantity}</td>
                  <td>{formatBRL(item.unitPrice)}</td>
                  <td>{formatBRL(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <section className="os-print-totals">
            <div><span>Serviços</span><b>{formatBRL(order.servicesTotal)}</b></div>
            <div><span>Peças</span><b>{formatBRL(order.partsTotal)}</b></div>
            {Number(order.discount) > 0 && <div><span>Desconto</span><b>{formatBRL(order.discount)}</b></div>}
            {Number(order.surcharge) > 0 && <div><span>Acréscimo</span><b>{formatBRL(order.surcharge)}</b></div>}
            <div className="os-print-grand"><span>Total</span><strong>{formatBRL(order.total)}</strong></div>
          </section>
        </>
      )}

      {order.notes && (
        <section className="os-print-block">
          <h3>Observações</h3>
          <p>{order.notes}</p>
        </section>
      )}

      <div className="os-print-terms">
        <p>
          {secondCopy
            ? 'Esta é a 2ª via da ordem de serviço e substitui o comprovante original em caso de perda. Conferir os dados do aparelho e do cliente.'
            : 'Declaro ter deixado o aparelho nas condições descritas e autorizo o reparo.'}
        </p>
        <ul>
          <li>Retirar o aparelho com apresentação da O.S.</li>
          <li>Prazo de 90 dias para retirada ou o aparelho será vendido para cobrir custos.</li>
          <li>Não nos responsabilizamos por chips e cartões de memória deixados.</li>
        </ul>
      </div>

      <footer className="os-print-signs">
        <div>
          <span />
          <small>Assinatura do cliente</small>
        </div>
        <div>
          <span />
          <small>Carimbo / assinatura da loja</small>
        </div>
      </footer>
    </article>
  )
}

export function WorkOrderPrintDocument({
  order,
  workshop,
  mode,
}: {
  order: WorkOrder
  workshop?: Workshop | null
  mode: WorkOrderPrintMode
}) {
  const secondCopy = mode === 'segunda-via'
  const copies = secondCopy
    ? [
        { viaLabel: '2ª VIA', copyLabel: 'CLIENTE' },
        { viaLabel: '2ª VIA', copyLabel: 'LOJA' },
      ]
    : [
        { viaLabel: '1ª VIA', copyLabel: 'CLIENTE' },
        { viaLabel: '1ª VIA', copyLabel: 'LOJA' },
      ]

  return createPortal(
    <div className="os-print-root">
      <div className="os-print-sheet">
        {copies.map((copy, index) => (
          <div key={`${copy.copyLabel}-${index}`}>
            <PrintCopy
              order={order}
              workshop={workshop}
              copyLabel={copy.copyLabel}
              viaLabel={copy.viaLabel}
              secondCopy={secondCopy}
            />
            {index === 0 && <div className="os-print-cut">corte aqui — folha A5 </div>}
          </div>
        ))}
      </div>
    </div>,
    document.body,
  )
}

const PRINT_PAGE_CSS = `
@page { size: A4 portrait; margin: 7mm; }
* { box-sizing: border-box; }
html, body { margin: 0; background: #fff; color: #111; font-family: Arial, Helvetica, sans-serif; }
.os-print-sheet { width: 100%; }
.os-print-copy { position: relative; height: 134mm; overflow: hidden; border: 1px solid #222; padding: 5mm 6mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.os-print-copy.is-second:before { content: '2ª VIA'; position: absolute; inset: 38% auto auto 18%; font-size: 42px; font-weight: 800; letter-spacing: 4px; color: #000; opacity: .08; transform: rotate(-18deg); pointer-events: none; }
.os-print-cut { height: 8mm; display: flex; align-items: center; justify-content: center; color: #777; font-size: 8px; letter-spacing: 1.2px; text-transform: uppercase; border-top: 1px dashed #999; border-bottom: 1px dashed #999; margin: 2mm 0; }
.os-print-header { display: flex; justify-content: space-between; gap: 12px; border-bottom: 2px solid #111; padding-bottom: 4mm; margin-bottom: 3mm; }
.os-print-logo { display: block; height: 16mm; width: auto; margin-bottom: 2mm; }
.os-print-header strong { display: block; font-size: 16px; letter-spacing: -.3px; }
.os-print-header small { display: block; font-size: 9px; color: #333; margin-top: 2px; }
.os-print-os { text-align: right; }
.os-print-os em { display: block; font-style: normal; font-size: 10px; font-weight: 800; letter-spacing: .8px; }
.os-print-os b { display: block; font-size: 18px; }
.os-print-os span { display: inline-block; margin-top: 2px; border: 1px solid #111; padding: 1px 6px; font-size: 9px; font-weight: 700; }
.os-print-meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-bottom: 3mm; }
.os-print-meta span, .os-print-grid h3, .os-print-block h3 { display: block; font-size: 8px; text-transform: uppercase; letter-spacing: .6px; color: #555; margin: 0 0 2px; }
.os-print-meta strong { font-size: 10px; }
.os-print-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin-bottom: 3mm; }
.os-print-grid p, .os-print-block p, .os-print-terms p { margin: 0 0 1px; font-size: 10px; line-height: 1.35; }
.os-print-block { margin-bottom: 3mm; }
.os-print-table { width: 100%; border-collapse: collapse; margin-bottom: 2mm; }
.os-print-table th, .os-print-table td { border-bottom: 1px solid #ccc; padding: 2px 4px; font-size: 9px; text-align: left; }
.os-print-table th { text-transform: uppercase; font-size: 8px; letter-spacing: .4px; }
.os-print-table th:nth-child(n+3), .os-print-table td:nth-child(n+3) { text-align: right; }
.os-print-totals { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; margin-bottom: 3mm; font-size: 10px; }
.os-print-totals div { display: flex; gap: 8px; }
.os-print-grand { border-top: 1px solid #111; padding-top: 2px; font-size: 12px; }
.os-print-terms { color: #333; }
.os-print-terms ul { margin: 1mm 0 0; padding-left: 3.5mm; font-size: 9px; line-height: 1.35; font-style: italic; }
.os-print-terms li { margin: 0; }
.os-print-signs { display: grid; grid-template-columns: 1fr 1fr; gap: 12mm; margin-top: 4mm; }
.os-print-signs span { display: block; border-bottom: 1px solid #111; height: 10mm; }
.os-print-signs small { display: block; text-align: center; font-size: 8px; margin-top: 2px; }
`

async function toDataUrl(url: string) {
  const response = await fetch(url)
  if (!response.ok) return ''
  const blob = await response.blob()
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export async function serializePrintDocument() {
  const root = document.querySelector('.os-print-root')
  if (!root) throw new Error('Documento de impressão não encontrado.')
  let logo = ''
  try { logo = await toDataUrl(publicAsset('logo.jpg')) } catch { logo = '' }
  const clone = root.cloneNode(true) as HTMLElement
  clone.querySelectorAll('img').forEach((img) => {
    if (logo) img.setAttribute('src', logo)
    else img.remove()
  })
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<title>Ordem de serviço</title>
<style>${PRINT_PAGE_CSS}</style>
</head>
<body>${clone.innerHTML}</body>
</html>`
}

export function WorkOrderPrintMenu({ onPrint }: { onPrint: (mode: WorkOrderPrintMode) => void }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <div className="print-menu-wrap" ref={wrapRef}>
      <button type="button" className="btn secondary" onClick={() => setOpen((value) => !value)}>
        <Printer size={16} /> Imprimir <ChevronDown size={14} />
      </button>
      {open && (
        <div className="print-menu">
          <button type="button" onClick={() => { setOpen(false); onPrint('a5-dupla') }}>
            <Printer size={15} />
            <span>
              <strong>Folha A5 (O.S. duas vezes)</strong>
              <small>Via do cliente e via da loja na mesma folha</small>
            </span>
          </button>
          <button type="button" onClick={() => { setOpen(false); onPrint('segunda-via') }}>
            <Copy size={15} />
            <span>
              <strong>Imprimir 2ª via</strong>
              <small>Reimpressão identificada como 2ª via</small>
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
