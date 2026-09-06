import { useAuth } from '../contexts/AuthContext'
import { AppLayout } from '../components/layout/AppLayout'
import { useQuery } from '@tanstack/react-query'
import { clientService } from '../api/client'
import { getUserRoleBadgeInfo } from '../types'
import {
  User as UserIcon,
  Mail,
  Building2,
  ShieldCheck,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Info,
  Clock,
} from 'lucide-react'
import { Link } from 'react-router-dom'

export function PerfilPage() {
  const { user } = useAuth()
  const roleInfo = getUserRoleBadgeInfo(user)

  const { data: configSchedule } = useQuery({
    queryKey: ['schedule-configuracao-perfil'],
    queryFn: () => clientService.schedule.obterConfiguracao(),
  })


  const subscribeUrl = configSchedule?.google_subscribe_url || (
    configSchedule?.calendar_id
      ? `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(configSchedule.calendar_id)}`
      : 'https://calendar.google.com'
  )

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Cabeçalho da Página */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <UserIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <span>Meu Perfil</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Visualize suas credenciais de acesso, dados cadastrais e integração com o Google Calendar.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/schedule"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
            >
              <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Ver Minha Agenda</span>
            </Link>
          </div>
        </div>

        {/* Card Principal de Identificação */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.first_name || user.username}
                  className="w-20 h-20 rounded-2xl object-cover ring-4 ring-indigo-500/20 shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-black text-2xl shadow-md">
                  {(user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 text-white rounded-full ring-2 ring-white dark:ring-slate-900 shadow-xs" title="Conta Verificada">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </span>
            </div>

            {/* Informações Primárias */}
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-black text-slate-900 dark:text-white truncate">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username}
                </h2>
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border tracking-wider uppercase ${
                    roleInfo.org === 'Empresa'
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/50'
                      : 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/50'
                  }`}
                >
                  {roleInfo.org} • {roleInfo.roleType}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="font-semibold">{user?.email || 'Sem e-mail cadastrado'}</span>
              </div>

              {user?.cliente_nome && (
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>Organização vinculada: <strong className="text-slate-800 dark:text-slate-200">{user.cliente_nome}</strong></span>
                </div>
              )}
            </div>

            {/* Badge Google SSO */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 flex items-center gap-3 self-stretch sm:self-auto shrink-0">
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center shadow-xs border border-slate-200 dark:border-slate-600">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              </div>
              <div>
                <div className="text-[11px] font-black text-slate-800 dark:text-slate-200">Google Identity SSO</div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Autenticado
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card Integração Google Calendar & Inscrição 1-Clique */}
        <div className="bg-gradient-to-br from-indigo-50/60 via-white to-sky-50/40 dark:from-indigo-950/20 dark:via-slate-900 dark:to-sky-950/20 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Integração Google Calendar & Google Meet</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Seus agendamentos no SHM são automaticamente sincronizados na agenda corporativa e enviados como convite para o seu e-mail.
              </p>
            </div>

            <a
              href={subscribeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-indigo-500/25 transition cursor-pointer shrink-0"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Inscrever no Google Calendar</span>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Convites Automáticos</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Toda reunião de alinhamento ou suporte envia um convite com botões de confirmação para sua caixa postal.
              </p>
            </div>

            <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>Salas Google Meet</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Links oficiais de videoconferência do Google Meet são gerados com 1 clique e anexados ao chamado técnico.
              </p>
            </div>

            <div className="bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-xl p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Clock className="w-4 h-4 text-sky-500" />
                <span>Lembretes no Celular</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Ao adicionar o compromisso ao seu Google Agenda, você recebe notificações nativas 24h, 30m e 15m antes.
              </p>
            </div>
          </div>
        </div>

        {/* Detalhes Cadastrais (Modo Somente-Leitura) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Dados Cadastrais Institucionais (Somente Leitura)</span>
            </h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-1">
              <Info className="w-3 h-3" /> Gerenciado pelo Administrador / Google SSO
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Nome de Usuário (Login)
              </label>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200">
                {user?.username}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Endereço de E-mail
              </label>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200">
                {user?.email || '—'}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Perfil de Acesso (RBAC)
              </label>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200">
                {roleInfo.fullLabel}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Organização / Tomador
              </label>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200">
                {user?.cliente_nome || 'Empresa Prestadora de Suporte (SHM)'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
