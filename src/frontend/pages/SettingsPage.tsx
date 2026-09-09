import { useState } from 'react'
import { Settings } from 'lucide-react'
import { settingsService } from '../services/dashboard'
import { ErrorBanner, LoadingBlock } from '../components/MetricCard'
import { useAsync } from '../hooks/useAsync'
import { useToast } from '../context/ToastContext'
import { ApiError } from '../services/api'

export function SettingsPage() {
  const toast = useToast()
  const { data, loading, error, reload } = useAsync(() => settingsService.get(), [])
  const [formError, setFormError] = useState('')
  if (loading) return <LoadingBlock />
  if (error) return <ErrorBanner message={error} />
  const workshop = (data as any)?.workshop
  return <>
    <div className="page-heading"><div><p className="eyebrow">Sistema</p><h1>Configurações</h1><p className="subheading">Ajuste os parâmetros e preferências do sistema.</p></div></div>
    {formError && <ErrorBanner message={formError} />}
    <form className="panel form-panel" onSubmit={async (event) => {
      event.preventDefault()
      const payload = Object.fromEntries(new FormData(event.currentTarget).entries())
      try {
        await settingsService.update(payload)
        toast.push('success', 'Configurações salvas com sucesso.')
        reload()
      } catch (err) {
        setFormError(err instanceof ApiError ? err.message : 'Não foi possível salvar as configurações.')
      }
    }}>
      <div className="section-title"><span className="step"><Settings size={14} /></span><div><h2>Loja</h2><p>Dados da unidade principal.</p></div></div>
      <div className="form-grid">
        <label>Nome<input name="name" defaultValue={workshop?.name} /></label>
        <label>Documento<input name="document" defaultValue={workshop?.document} /></label>
        <label>Telefone<input name="phone" defaultValue={workshop?.phone} /></label>
        <label>E-mail<input name="email" defaultValue={workshop?.email} /></label>
      </div>
      <button className="btn primary" style={{ marginTop: 18 }}>Salvar configurações</button>
    </form>
    <div className="panel form-panel" style={{ marginTop: 17 }}>
      <div className="section-title"><div><h2>Backup e restauração</h2><p>Exporte ou restaure o banco local da loja.</p></div></div>
      <div className="heading-actions">
        <button className="btn secondary" onClick={async () => {
          const selected = await window.shoficina?.selectBackupPath() || window.prompt('Informe o caminho completo para salvar o backup (.db)')
          if (!selected) return
          try { await settingsService.backup(selected); toast.push('success', 'Backup exportado com sucesso.') }
          catch (err) { toast.push('error', err instanceof ApiError ? err.message : 'Não foi possível exportar o backup.') }
        }}>Exportar backup</button>
        <button className="btn danger" onClick={async () => {
          const selected = await window.shoficina?.selectRestorePath() || window.prompt('Informe o caminho completo do backup (.db)')
          if (!selected) return
          try { await settingsService.restore(selected); toast.push('success', 'Backup restaurado. Reabra o sistema se necessário.'); reload() }
          catch (err) { toast.push('error', err instanceof ApiError ? err.message : 'Não foi possível restaurar o backup.') }
        }}>Restaurar backup</button>
      </div>
    </div>
  </>
}
