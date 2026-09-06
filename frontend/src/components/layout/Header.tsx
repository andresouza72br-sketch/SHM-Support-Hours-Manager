import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { Bell, LogOut, LayoutDashboard, Layers, Loader2, FileText, CheckCheck, Building2, Settings, ChevronDown, ShieldCheck, Calendar, User as UserIcon, Sliders } from 'lucide-react'


import { useAuth } from '../../contexts/AuthContext'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientService } from '../../api/client'
import { type Contrato, type Notification, getUserRoleBadgeInfo } from '../../types'
import { ThemeToggle } from '../ui/ThemeToggle'
import { useToast } from '../../contexts/ToastContext'

interface HeaderProps {
  contratoSelecionado?: number | null
  onSelectContrato?: (id: number | null) => void
  contratos?: Contrato[]
}

export function Header({ contratoSelecionado, onSelectContrato, contratos = [] }: HeaderProps) {
  const { user, logout, isEmpresa, isEmpresaGerente } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [showNotifs, setShowNotifs] = useState(false)
  const notifContainerRef = useRef<HTMLDivElement>(null)
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuContainerRef = useRef<HTMLDivElement>(null)

  const isGerenteEmpresa = Boolean(isEmpresaGerente || user?.role === 'EMPRESA_ADMIN' || user?.is_superuser)
  const roleInfo = getUserRoleBadgeInfo(user)

  const clearAutoCloseTimer = useCallback(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current)
      autoCloseTimerRef.current = null
    }
  }, [])

  const startAutoCloseTimer = useCallback(() => {
    clearAutoCloseTimer()
    autoCloseTimerRef.current = setTimeout(() => {
      setShowNotifs(false)
    }, 5000)
  }, [clearAutoCloseTimer])

  useEffect(() => {
    if (!showNotifs) {
      clearAutoCloseTimer()
      return
    }

    startAutoCloseTimer()

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        notifContainerRef.current &&
        !notifContainerRef.current.contains(event.target as Node)
      ) {
        setShowNotifs(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowNotifs(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      clearAutoCloseTimer()
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showNotifs, startAutoCloseTimer, clearAutoCloseTimer])

  useEffect(() => {
    if (!showUserMenu) return

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        userMenuContainerRef.current &&
        !userMenuContainerRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowUserMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showUserMenu])

  const contratoQuery = searchParams.get('contrato')
  const isMultipleContratosInQuery = Boolean(contratoQuery && contratoQuery.includes(','))

  // ID do contrato ativo (preferência: props > query param)
  const activeContratoId =
    contratoSelecionado !== undefined
      ? contratoSelecionado
      : contratoQuery && !isMultipleContratosInQuery
      ? Number(contratoQuery)
      : null

  // Sincroniza query parameter quando activeContratoId muda via prop externa
  useEffect(() => {
    if (isMultipleContratosInQuery) return
    const currentQuery = searchParams.get('contrato')
    if (activeContratoId && currentQuery !== String(activeContratoId)) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.set('contrato', String(activeContratoId))
      setSearchParams(nextParams, { replace: true })
    } else if (activeContratoId === null && currentQuery) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete('contrato')
      setSearchParams(nextParams, { replace: true })
    }
  }, [activeContratoId, isMultipleContratosInQuery, searchParams, setSearchParams])

  const handleContractChange = (val: number | null) => {
    if (onSelectContrato) {
      onSelectContrato(val)
    }
    const nextParams = new URLSearchParams(searchParams)
    if (val) {
      nextParams.set('contrato', String(val))
    } else {
      nextParams.delete('contrato')
    }
    setSearchParams(nextParams, { replace: true })
  }

  // Status do Sistema (Versão e Release dinâmicos)
  const { data: systemStatus } = useQuery({
    queryKey: ['system-status'],
    queryFn: () => clientService.system.status(),
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  })

  const releaseBadgeLabel = systemStatus?.release
    ? systemStatus.release.split('—')[0].trim()
    : '2.5 Manifest'

  const releaseBadgeTooltip = systemStatus
    ? `Versão Oficial ${systemStatus.version} (${systemStatus.release || systemStatus.service})`
    : 'Versão 2.5 Manifest ativa'

  // Notificações
  const { data: rawNotifs } = useQuery({
    queryKey: ['notificacoes'],
    queryFn: clientService.notificacoes.list,
    refetchInterval: 10000,
  })

  const notificacoes: Notification[] = Array.isArray(rawNotifs) ? rawNotifs : []
  const naoLidas = notificacoes.filter((n) => !n.lida)
  const listaContratos: Contrato[] = Array.isArray(contratos) ? contratos : []

  const marcarLidaMutation = useMutation({
    mutationFn: clientService.notificacoes.marcarLida,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificacoes'] }),
  })

  const marcarTodasMutation = useMutation({
    mutationFn: clientService.notificacoes.marcarTodasLidas,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] })
      toast.success('Todas as notificações foram marcadas como lidas.', 'Notificações')
    },
  })

  const [avatarError, setAvatarError] = useState(false)

  useEffect(() => {
    setAvatarError(false)
  }, [user?.avatar_url])

  const userInitials = (user?.first_name ? user.first_name[0] : user?.username?.[0] || 'U').toUpperCase()

  return (
    <header className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-2xs">
      <div className="w-full px-3 sm:px-5 lg:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4 min-w-0">
        {/* Logo & Main Switcher */}
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 shrink min-w-0">
          <Link to="/dashboard" className="flex items-center gap-2 group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center font-black text-white text-lg shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
              S
            </div>
            <div className="hidden sm:block">
              <span className="font-black text-slate-900 dark:text-white text-base tracking-tight leading-none block">
                SHM
              </span>
              <span className="text-[10px] font-black text-indigo-700 dark:text-indigo-400 tracking-wider uppercase leading-none mt-0.5 block">
                Suporte Sob Medida
              </span>
            </div>
          </Link>

          {/* Release Badge (Apresentação na barra superior) */}
          <div
            title={releaseBadgeTooltip}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold shadow-2xs cursor-default shrink-0"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600 dark:bg-emerald-500"></span>
            </span>
            <span>{releaseBadgeLabel}</span>
          </div>

          {/* Navigation Switcher */}
          {isEmpresa ? (
            <nav className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xs shrink-0">
              <Link
                to={activeContratoId ? `/dashboard?contrato=${activeContratoId}` : '/dashboard'}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-extrabold transition duration-150 ${
                  location.pathname === '/dashboard'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-transparent'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                }`}
                title="Visão Kanban"
              >
                <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden md:inline">Visão Kanban</span>
              </Link>
              <Link
                to={activeContratoId ? `/admin/dashboard?contrato=${activeContratoId}` : '/admin/dashboard'}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-extrabold transition duration-150 ${
                  location.pathname === '/admin/dashboard'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-transparent'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                }`}
                title="Painel Operacional"
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden md:inline">Painel Operacional</span>
              </Link>
              <Link
                to="/admin/contratos"
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-extrabold transition duration-150 ${
                  location.pathname === '/admin/contratos' || location.pathname === '/contratos'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-transparent'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                }`}
                title="Contratos"
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden md:inline">Contratos</span>
              </Link>
              <Link
                to="/admin/clientes"
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-extrabold transition duration-150 ${
                  location.pathname === '/admin/clientes' || location.pathname === '/clientes'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-transparent'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                }`}
                title="Clientes"
              >
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden md:inline">Clientes</span>
              </Link>
              <Link
                to="/schedule"
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-extrabold transition duration-150 ${
                  location.pathname === '/schedule'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-transparent'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                }`}
                title="Agenda de Suporte & Reuniões"
              >
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden md:inline">Agenda</span>
              </Link>
            </nav>
          ) : (
            <nav className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xs shrink-0">
              <Link
                to={activeContratoId ? `/dashboard?contrato=${activeContratoId}` : '/dashboard'}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-extrabold transition duration-150 ${
                  location.pathname === '/dashboard'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-transparent'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                }`}
                title="Painel"
              >
                <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden md:inline">Painel</span>
              </Link>
              <Link
                to="/contratos"
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-extrabold transition duration-150 ${
                  location.pathname === '/contratos'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-transparent'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                }`}
                title="Contratos"
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden md:inline">Contratos</span>
              </Link>
              <Link
                to="/clientes"
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-extrabold transition duration-150 ${
                  location.pathname === '/clientes'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-transparent'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                }`}
                title="Minha Empresa & Equipe"
              >
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden md:inline">Minha Empresa</span>
              </Link>
              <Link
                to="/schedule"
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-extrabold transition duration-150 ${
                  location.pathname === '/schedule'
                    ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-xs border border-slate-200/80 dark:border-transparent'
                    : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                }`}
                title="Agenda de Suporte & Reuniões"
              >
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden md:inline">Agenda</span>
              </Link>
            </nav>
          )}

          {listaContratos.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 sm:px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xs shrink min-w-0 max-w-[200px] sm:max-w-[280px] md:max-w-[360px] lg:max-w-[480px]">
              <span className="hidden lg:inline text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider shrink-0">
                Contrato:
              </span>
              <select
                value={activeContratoId || ''}
                onChange={(e) => handleContractChange(e.target.value ? Number(e.target.value) : null)}
                className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 sm:px-2.5 py-1.5 font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs cursor-pointer w-full truncate"
              >
                <option value="">
                  {isMultipleContratosInQuery
                    ? `Filtro Múltiplo (${contratoQuery ? contratoQuery.split(',').length : 0})`
                    : `Todos os Contratos (${listaContratos.length})`}
                </option>
                {listaContratos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.numero} {c.cliente_nome ? `— ${c.cliente_nome}` : ''} ({Number(c.saldo).toFixed(1)}h)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right Action Icons & Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Light Mode / Dark Mode Switch */}
          <div className="flex items-center">
            <ThemeToggle size="sm" />
          </div>

          {/* Notificações Dropdown */}
          <div
            ref={notifContainerRef}
            onMouseEnter={clearAutoCloseTimer}
            onMouseLeave={() => {
              if (showNotifs) startAutoCloseTimer()
            }}
            onFocus={clearAutoCloseTimer}
            onBlur={(e) => {
              if (showNotifs && !notifContainerRef.current?.contains(e.relatedTarget as Node)) {
                startAutoCloseTimer()
              }
            }}
            className="relative"
          >
            <button
              onClick={() => setShowNotifs((prev) => !prev)}
              className="relative p-2.5 text-slate-700 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-400 bg-slate-100/80 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer"
              title="Notificações"
              aria-expanded={showNotifs}
            >
              <Bell className="w-5 h-5" />
              {naoLidas.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-xs animate-pulse">
                  {naoLidas.length}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden ring-1 ring-slate-900/10">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-sm text-slate-900 dark:text-white">Notificações</span>
                    {naoLidas.length > 0 && (
                      <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 font-extrabold px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800/60">
                        {naoLidas.length} novas
                      </span>
                    )}
                  </div>
                  {naoLidas.length > 0 && (
                    <button
                      disabled={marcarTodasMutation.isPending}
                      onClick={() => marcarTodasMutation.mutate()}
                      className="text-xs text-indigo-700 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 font-extrabold flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                    >
                      {marcarTodasMutation.isPending ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Lendo todas...</span>
                        </>
                      ) : (
                        <>
                          <CheckCheck className="w-3.5 h-3.5" />
                          <span>Ler todas</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
                  {notificacoes.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs italic font-medium">Nenhuma notificação registrada.</div>
                  ) : (
                    notificacoes.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (!n.lida) marcarLidaMutation.mutate(n.id)
                          if (n.url) navigate(n.url)
                          setShowNotifs(false)
                        }}
                        className={`p-3.5 text-xs cursor-pointer transition ${
                          n.lida
                            ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                            : 'bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 font-medium text-slate-900 dark:text-white border-l-4 border-indigo-600'
                        }`}
                      >
                        <div className="font-extrabold text-slate-900 dark:text-slate-100 mb-0.5">{n.titulo}</div>
                        <div className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{n.mensagem}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill & Dropdown Menu */}
          <div ref={userMenuContainerRef} className="relative flex items-center gap-2 pl-2 border-l border-slate-300 dark:border-slate-800">
            <button
              onClick={() => setShowUserMenu((prev) => !prev)}
              aria-expanded={showUserMenu}
              className="flex items-center gap-2 sm:gap-2.5 p-1 sm:px-2 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer text-left border border-transparent hover:border-slate-200 dark:hover:border-slate-700 select-none"
              title="Menu do Usuário"
            >
              {user?.avatar_url && !avatarError ? (
                <div className="w-8 h-8 rounded-full overflow-hidden shadow-xs ring-2 ring-white dark:ring-slate-800 border border-slate-300 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <img
                    src={user.avatar_url}
                    alt={user?.first_name || user?.username || 'Foto de Perfil'}
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarError(true)}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-black text-xs flex items-center justify-center shadow-xs ring-2 ring-white dark:ring-slate-800 shrink-0">
                  {userInitials}
                </div>
              )}
              <div className="hidden md:flex flex-col text-left max-w-[130px]">
                <span className="text-xs font-black text-slate-900 dark:text-slate-100 leading-tight truncate">
                  {user?.first_name || user?.username}
                </span>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold leading-tight truncate">
                  {roleInfo.fullLabel}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
                  showUserMenu ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
                }`}
              />
            </button>

            <button
              onClick={logout}
              title="Encerrar Sessão"
              className="p-2 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 bg-slate-100/80 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Menu Suspenso que abre para baixo */}
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden ring-1 ring-slate-900/10 animate-in fade-in zoom-in-95 duration-150">
                {/* Cabeçalho com identificação do usuário */}
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                  <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                    {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username}
                  </div>
                  {user?.email && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {user.email}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    {/* Selinho da Organização: Cliente / Empresa */}
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border tracking-wider uppercase ${
                        roleInfo.org === 'Empresa'
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/50'
                          : 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/50'
                      }`}
                    >
                      {roleInfo.org}
                    </span>

                    {/* Selinho do Tipo de Usuário: Gerente / Analista */}
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border tracking-wider uppercase ${
                        roleInfo.roleType === 'Gerente'
                          ? 'bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-800/60'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {roleInfo.roleType}
                    </span>
                  </div>
                </div>

                {/* Itens de Navegação do Menu do Usuário */}
                <div className="p-1.5 space-y-0.5">
                  <Link
                    to="/perfil"
                    onClick={() => setShowUserMenu(false)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                      location.pathname === '/perfil'
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-black'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <UserIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>Meu Perfil</span>
                  </Link>

                  <Link
                    to="/documentacao/auditoria-forense"
                    onClick={() => setShowUserMenu(false)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                      location.pathname === '/documentacao/auditoria-forense'
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-black'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span>Documentação de Auditoria</span>
                  </Link>

                  {/* Exclusivo para Gerente/Admin da Empresa */}
                  {isGerenteEmpresa && (
                    <>
                      <Link
                        to="/admin/configuracoes/notificacoes"
                        onClick={() => setShowUserMenu(false)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                          location.pathname === '/admin/configuracoes/notificacoes'
                            ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-black'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                        <span>Configurar Notificações</span>
                      </Link>

                      <Link
                        to="/admin/configuracoes/sistema"
                        onClick={() => setShowUserMenu(false)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                          location.pathname === '/admin/configuracoes/sistema'
                            ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-black'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Sliders className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                        <span>Configurações do Sistema</span>
                      </Link>
                    </>
                  )}
                </div>


                {/* Ação de Logout */}
                <div className="p-1.5 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      logout()
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>Encerrar Sessão</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}