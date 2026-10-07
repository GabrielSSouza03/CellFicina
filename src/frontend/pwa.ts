import { registerSW } from 'virtual:pwa-register'

export function registerPwa() {
  if (typeof window === 'undefined' || window.shoficina) return
  const local = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  if (location.protocol !== 'https:' && !local) return
  registerSW({ immediate: true })
}
