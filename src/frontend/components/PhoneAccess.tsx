import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Smartphone } from 'lucide-react'
import { api } from '../services/api'

function useShopUrl() {
  const [url, setUrl] = useState('')
  const local = typeof window !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')

  useEffect(() => {
    if (!local) return
    let active = true
    api.get<{ urls: string[] }>('/access')
      .then((data) => { if (active) setUrl(data.urls[0] || '') })
      .catch(() => { if (active) setUrl('') })
    return () => { active = false }
  }, [local])

  return local ? url : ''
}

export function PhoneAccessCard({ url }: { url: string }) {
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let active = true
    QRCode.toDataURL(url, { width: 180, margin: 1 }).then((value) => { if (active) setQr(value) }).catch(() => undefined)
    return () => { active = false }
  }, [url])

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return <div className="phone-access">
    <strong><Smartphone size={16} /> No celular</strong>
    <p>Abra a câmera no mesmo Wi-Fi e aponte para o código. O CellFicina abre no navegador, sem instalar nada.</p>
    {qr && <img src={qr} alt={`Código para abrir ${url}`} />}
    <code>{url}</code>
    <button className="btn secondary small" type="button" onClick={() => void copy()}>{copied ? 'Endereço copiado' : 'Copiar endereço'}</button>
  </div>
}

export function PhoneAccess() {
  const url = useShopUrl()
  if (!url) return null
  return <PhoneAccessCard url={url} />
}

export function PhoneAccessButton() {
  const url = useShopUrl()
  const [open, setOpen] = useState(false)
  if (!url) return null
  return <div className="phone-access-wrap">
    <button className="phone-access-button" type="button" onClick={() => setOpen((value) => !value)}><Smartphone size={16} /> Celular</button>
    {open && <div className="phone-access-popover"><PhoneAccessCard url={url} /></div>}
  </div>
}
