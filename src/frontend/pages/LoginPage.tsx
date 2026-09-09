import { useState } from 'react'
import { BrandLogo } from '../components/BrandLogo'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../services/api'

export function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('admin@shoficina.local')
  const [password, setPassword] = useState('Admin@123')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  return <div className="login-screen">
    <form className="login-card" onSubmit={async (event) => {
      event.preventDefault()
      setLoading(true)
      setError('')
      try {
        await login(email, password)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Não foi possível entrar. Verifique os dados.')
      } finally {
        setLoading(false)
      }
    }}>
      <BrandLogo className="brand-logo login" />
      <h1 className="login-title">Cell<span>Ficina</span></h1>
      <p>Entre para gerenciar a loja e a assistência técnica.</p>
      {error && <div className="banner error">{error}</div>}
      <label>E-mail<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label>
      <label>Senha<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required /></label>
      <button className="btn primary wide" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
      <p className="login-hint">Usuário inicial: admin@shoficina.local · Admin@123</p>
    </form>
  </div>
}
