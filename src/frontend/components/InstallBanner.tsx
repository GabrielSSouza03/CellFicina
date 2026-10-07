import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'cellficina.pwa.dismissed'

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function InstallBanner() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [iosHint, setIosHint] = useState(false)
  const [hidden, setHidden] = useState(() => sessionStorage.getItem(DISMISS_KEY) === '1')

  useEffect(() => {
    if (hidden || isStandalone()) return
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setPromptEvent(event as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    if (isIos()) setIosHint(true)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [hidden])

  if (hidden || isStandalone() || (!promptEvent && !iosHint)) return null

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setHidden(true)
  }

  async function install() {
    if (!promptEvent) return
    await promptEvent.prompt()
    const choice = await promptEvent.userChoice
    setPromptEvent(null)
    if (choice.outcome === 'accepted') dismiss()
  }

  return <div className="install-banner" role="region" aria-label="Instalar aplicativo">
    <div>
      <strong>Instalar CellFicina</strong>
      <span>{iosHint && !promptEvent ? 'No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início.' : 'Use no computador ou no celular, como um aplicativo.'}</span>
    </div>
    {promptEvent && <button className="btn primary small" type="button" onClick={() => void install()}><Download size={15} /> Instalar</button>}
    {iosHint && !promptEvent && <Share size={16} aria-hidden />}
    <button className="icon-button" type="button" onClick={dismiss} aria-label="Fechar aviso de instalação"><X size={16} /></button>
  </div>
}
