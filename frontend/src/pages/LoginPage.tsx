import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, ArrowRight, Shield, Sparkles, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { GoogleLoginButton } from '../components/auth/GoogleLoginButton'
import { ThemeToggle } from '../components/ui/ThemeToggle'

export function LoginPage() {
  const { login, loginGoogle } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const loggedUser = await login({ username, password })
      const isEmp = loggedUser.role === 'EMPRESA_ADMIN' || loggedUser.role === 'EMPRESA_TECNICO' || loggedUser.is_staff
      navigate(isEmp ? '/admin/dashboard' : '/dashboard')
    } catch (err: any) {
      if (!err.response || err.response.status >= 500) {
        setError('Servidor indisponível. O backend pode estar offline.')
      } else {
        setError('Credenciais inválidas. Verifique usuário e senha.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (credential: string) => {
    setError(null)
    try {
      const loggedUser = await loginGoogle(credential)
      const isEmp = loggedUser.role === 'EMPRESA_ADMIN' || loggedUser.role === 'EMPRESA_TECNICO' || loggedUser.is_staff
      navigate(isEmp ? '/admin/dashboard' : '/dashboard')
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || 'Erro ao processar autenticação pelo Google.'
      setError(detail)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 transition-colors duration-200 relative overflow-hidden flex flex-col justify-center items-center p-4">
      {/* Switch Light/Dark Mode no Canto Superior Direito */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/10 dark:bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/10 dark:bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full bg-white dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-200 dark:border-slate-800/80 relative z-10 space-y-6 transition-colors">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-500 text-white rounded-2xl shadow-xl shadow-indigo-500/25 ring-4 ring-indigo-500/10">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/50 text-indigo-900 dark:text-indigo-300 text-xs font-black mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Plataforma de Governança 2.0</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">SHM Portal</h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-1">Gestão, Orçamento & Aceite de Horas Técnicas</p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800/80 text-rose-900 dark:text-rose-300 text-xs font-bold rounded-xl flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Botão de Autenticação Google OAuth2 Oficial */}
        <div className="space-y-4">
          <GoogleLoginButton
            onSuccess={handleGoogleSuccess}
            onError={(msg) => setError(msg)}
            disabled={loading}
          />

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-300 dark:border-slate-800"></div>
            <span className="flex-shrink mx-3 text-[10px] uppercase font-black text-slate-600 dark:text-slate-400 tracking-wider">
              ou acesse com usuário e senha
            </span>
            <div className="flex-grow border-t border-slate-300 dark:border-slate-800"></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-black text-slate-900 dark:text-slate-300 uppercase tracking-wider mb-1.5">Usuário</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ex: admin"
              className="w-full text-sm bg-slate-50 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition font-bold shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-900 dark:text-slate-300 uppercase tracking-wider mb-1.5">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-sm bg-slate-50 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition font-bold shadow-2xs"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-sm py-3.5 rounded-xl shadow-lg shadow-indigo-600/30 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                <span>Acessar Plataforma</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
