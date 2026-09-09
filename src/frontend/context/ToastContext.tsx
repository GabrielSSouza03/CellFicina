import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type Toast = { id: number; type: 'success' | 'error'; message: string }

const ToastContext = createContext<{ push: (type: Toast['type'], message: string) => void } | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current, { id, type, message }])
    setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 4200)
  }, [])
  const value = useMemo(() => ({ push }), [push])
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack">
        {toasts.map((toast) => <div key={toast.id} className={`toast ${toast.type}`}>{toast.message}</div>)}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
