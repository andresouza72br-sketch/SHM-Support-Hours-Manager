import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { AppLayout } from '../components/layout/AppLayout'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientService } from '../api/client'
import { useToast } from '../contexts/ToastContext'
import {
  Sliders,
  Calendar,
  Key,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Server,
  Zap,
  BookOpen,
} from 'lucide-react'

import { Navigate } from 'react-router-dom'
import type { TesteConexaoGoogleResult } from '../types'
import { ManualGoogleCalendarModal } from '../components/schedule/ManualGoogleCalendarModal'

export function ConfiguracoesSistemaPage() {
  const { isEmpresaGerente, user } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()

  const isGerenteEmpresa = Boolean(isEmpresaGerente || user?.role === 'EMPRESA_ADMIN' || user?.is_superuser)

  const [calendarIdInput, setCalendarIdInput] = useState('')
  const [copiado, setCopiado] = useState(false)
  const [resultadoTeste, setResultadoTeste] = useState<TesteConexaoGoogleResult | null>(null)
  const [isManualOpen, setIsManualOpen] = useState(false)

  const { data: config, isFetching, refetch } = useQuery({
    queryKey: ['configuracao-schedule-admin'],
    queryFn: () => clientService.schedule.obterConfiguracao(),
    enabled: isGerenteEmpresa,
  })

  const handleAtualizar = async () => {
    try {
      await refetch()
      toast.success('Diagnósticos e configurações atualizados!')
    } catch {
      toast.error('Falha ao atualizar diagnósticos.')
    }
  }

  useEffect(() => {
    if (config?.calendar_id) {
      setCalendarIdInput(config.calendar_id)
    }
  }, [config?.calendar_id])

  const salvarMutation = useMutation({
    mutationFn: (novoId: string) =>
      clientService.schedule.atualizarConfiguracao({ calendar_id: novoId }),
    onSuccess: (data) => {
      queryClient.setQueryData(['configuracao-schedule-admin'], data)
      toast.success('Configuração da agenda atualizada com sucesso no banco de dados!')
    },
    onError: (err: any) => {
      const msg = err.response?.data?.calendar_id?.[0] || 'Falha ao atualizar configuração da agenda.'
      toast.error(msg)
    },
  })

  const testarConexaoMutation = useMutation({
    mutationFn: () => clientService.schedule.testarConexaoGoogle(),
    onSuccess: (res) => {
      setResultadoTeste(res)
      if (res.sucesso) {
        toast.success(`Google API conectada com sucesso (${res.latencia_ms}ms)!`)
      } else {
        toast.error(`Falha no teste: ${res.mensagem}`)
      }
    },
    onError: () => {
      toast.error('Erro de rede ou timeout ao disparar teste de conexão.')
    },

  })

  if (!isGerenteEmpresa) {
    return <Navigate to="/dashboard" replace />
  }

  const handleCopyEmail = () => {
    if (config?.service_account_email) {
      navigator.clipboard.writeText(config.service_account_email)
      setCopiado(true)
      toast.info('E-mail da Service Account copiado!')
      setTimeout(() => setCopiado(false), 3000)
    }
  }

  const subscribeUrl = config?.google_subscribe_url || (
    config?.calendar_id
      ? `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(config.calendar_id)}`
      : 'https://calendar.google.com'
  )

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Sliders className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <span>Configurações do Sistema</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Parametrização global da agenda corporativa, diagnósticos em tempo real e credenciais da Service Account.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsManualOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-extrabold rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer shadow-2xs"
              title="Abrir manual passo a passo de configuração e manutenção"
            >
              <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Manual Passo a Passo</span>
            </button>

            <button
              type="button"
              onClick={handleAtualizar}
              disabled={isFetching}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 active:scale-95 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs"
              title="Recarregar diagnósticos"
            >
              <RefreshCw className={`w-3.5 h-3.5 transition-transform duration-500 ${isFetching ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
              <span>{isFetching ? 'Atualizando...' : 'Atualizar'}</span>
            </button>
          </div>
        </div>

        {/* Card de Status da Service Account & Google Calendar API */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Integração Google Calendar & Google Meet
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Modo de Operação:</span>
                  {config?.modo_operacao === 'ativo' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" /> Service Account Ativa
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      <AlertTriangle className="w-3 h-3" /> Simulação (Dev / Mock)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <a
              href={subscribeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer self-start sm:self-auto"
            >
              <ExternalLink className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Abrir no Google Agenda</span>
            </a>
          </div>

          {/* E-mail da Service Account para compartilhamento */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>E-mail da Service Account (Bot do Google Cloud)</span>
              </label>
              {config?.service_account_email && (
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition cursor-pointer self-start sm:self-auto"
                >
                  {copiado ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">E-mail Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar E-mail</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 break-all select-all">
              {config?.service_account_email || 'Nenhum e-mail de Service Account configurado em GOOGLE_SERVICE_ACCOUNT_JSON ou FILE.'}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              💡 <strong>Dica de Configuração:</strong> Para que o SHM consiga criar reuniões reais no seu Google Calendar, abra as configurações da sua agenda no Google Calendar Web, vá em <em>"Compartilhar com pessoas específicas"</em>, adicione o e-mail acima e selecione a permissão <strong>"Fazer alterações nos eventos"</strong>.
              <button
                type="button"
                onClick={() => setIsManualOpen(true)}
                className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 hover:underline ml-1 cursor-pointer"
              >
                <span>Ver passo a passo detalhado &rarr;</span>
              </button>
            </p>
          </div>

          {/* Edição do Calendar ID com persistência no banco */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              ID da Agenda Corporativa (GOOGLE_CALENDAR_ID)
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <input
                type="text"
                value={calendarIdInput}
                onChange={(e) => setCalendarIdInput(e.target.value)}
                placeholder="ex: suporte-SHM ou workspace.icb@gmail.com ou c_xxxx@group.calendar.google.com"
                className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
              />
              <button
                type="button"
                onClick={() => salvarMutation.mutate(calendarIdInput)}
                disabled={salvarMutation.isPending || !calendarIdInput.trim() || calendarIdInput === config?.calendar_id}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shrink-0"
              >
                {salvarMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Salvar Configuração</span>
                )}
              </button>
            </div>
            {config?.atualizado_em && (
              <p className="text-[10px] text-slate-400">
                Última alteração salva em {new Date(config.atualizado_em).toLocaleString('pt-BR')}
                {config.atualizado_por_nome ? ` por ${config.atualizado_por_nome}` : ''}.
              </p>
            )}
          </div>
        </div>

        {/* Card de Teste de Conexão Ativo (Ping Healthcheck) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Diagnóstico em Tempo Real da Google Calendar API</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dispare um teste de comunicação com timeout de 8 segundos para validar a integridade da Service Account e permissões de escrita.
              </p>
            </div>

            <button
              type="button"
              onClick={() => testarConexaoMutation.mutate()}
              disabled={testarConexaoMutation.isPending}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-wait shrink-0"
            >
              {testarConexaoMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Testando Google API...</span>
                </>
              ) : (
                <>
                  <Server className="w-4 h-4" />
                  <span>Testar Comunicação com Google API</span>
                </>
              )}
            </button>
          </div>

          {/* Resultado do Teste */}
          {resultadoTeste && (
            <div
              className={`rounded-xl p-4 border space-y-2 text-xs transition animate-in fade-in duration-200 ${
                resultadoTeste.sucesso
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
              }`}
            >
              <div className="flex items-center justify-between font-black">
                <div className="flex items-center gap-2">
                  {resultadoTeste.sucesso ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  )}
                  <span>
                    {resultadoTeste.sucesso ? 'Conexão Estabelecida com Sucesso!' : 'Falha na Comunicação com o Google'}
                  </span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/70 dark:bg-slate-900/60 border border-current">
                  Latência: {resultadoTeste.latencia_ms} ms
                </span>
              </div>

              <p className="leading-relaxed font-medium">{resultadoTeste.mensagem}</p>

              {resultadoTeste.detalhes && (
                <div className="mt-2 p-2.5 bg-white/80 dark:bg-slate-900/80 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40 font-mono text-[11px] space-y-1">
                  {resultadoTeste.detalhes.summary && <div>• Título da Agenda: <strong>{resultadoTeste.detalhes.summary}</strong></div>}
                  {resultadoTeste.detalhes.timeZone && <div>• Fuso Horário: <strong>{resultadoTeste.detalhes.timeZone}</strong></div>}
                  {resultadoTeste.detalhes.accessRole && <div>• Papel de Acesso: <strong>{resultadoTeste.detalhes.accessRole}</strong></div>}
                </div>
              )}

              {resultadoTeste.sugestao && (
                <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-300 mt-1">
                  👉 {resultadoTeste.sugestao}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Modal Interativo Passo a Passo de Manutenção do Google Calendar */}
        <ManualGoogleCalendarModal
          isOpen={isManualOpen}
          onClose={() => setIsManualOpen(false)}
          serviceAccountEmail={config?.service_account_email}
          currentCalendarId={config?.calendar_id}
        />
      </div>
    </AppLayout>
  )
}
