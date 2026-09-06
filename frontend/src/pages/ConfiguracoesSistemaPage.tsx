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
  ShieldCheck,
  History,
  Search,
  Play,
  Database,
  ArrowUpRight,
  FileCheck2,
  Clock,
} from 'lucide-react'

import { Navigate, Link } from 'react-router-dom'
import type { TesteConexaoGoogleResult, ExecucaoAuditoriaResult } from '../types'
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

  // Estados da Trilha de Auditoria Forense e Selagem Diária
  const [buscaParticao, setBuscaParticao] = useState('')
  const [digestCopiado, setDigestCopiado] = useState<string | null>(null)
  const [resultadoExecucaoAuditoria, setResultadoExecucaoAuditoria] = useState<ExecucaoAuditoriaResult | null>(null)

  const { data: config, isFetching, refetch } = useQuery({
    queryKey: ['configuracao-schedule-admin'],
    queryFn: () => clientService.schedule.obterConfiguracao(),
    enabled: isGerenteEmpresa,
  })

  const { data: painelAuditoria, isFetching: isFetchingAuditoria } = useQuery({
    queryKey: ['auditoria-painel-integridade'],
    queryFn: () => clientService.auditoria.painelIntegridade(),
    enabled: isGerenteEmpresa,
  })

  const { data: selosDiarios = [], isFetching: isFetchingSelos } = useQuery({
    queryKey: ['auditoria-selos-diarios'],
    queryFn: () => clientService.auditoria.listarSelosDiarios(),
    enabled: isGerenteEmpresa,
  })

  const isCarregandoGeral = isFetching || isFetchingAuditoria || isFetchingSelos

  const executarAuditoriaMutation = useMutation({
    mutationFn: () => clientService.auditoria.executarAuditoriaDiaria(),
    onSuccess: (res) => {
      setResultadoExecucaoAuditoria(res)
      queryClient.invalidateQueries({ queryKey: ['auditoria-painel-integridade'] })
      queryClient.invalidateQueries({ queryKey: ['auditoria-selos-diarios'] })
      if (res.sucesso) {
        toast.success(res.mensagem)
      } else {
        toast.error(res.mensagem)
      }
    },
    onError: () => {
      toast.error('Erro ao disparar execução da auditoria diária.')
    },
  })

  const handleAtualizar = async () => {
    try {
      await Promise.all([
        refetch(),
        queryClient.invalidateQueries({ queryKey: ['auditoria-painel-integridade'] }),
        queryClient.invalidateQueries({ queryKey: ['auditoria-selos-diarios'] }),
      ])
      toast.success('Diagnósticos, agenda e auditoria atualizados!')
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

  const handleCopyDigest = (digest: string) => {
    navigator.clipboard.writeText(digest)
    setDigestCopiado(digest)
    toast.info('Digest SHA-256 do selo copiado!')
    setTimeout(() => setDigestCopiado(null), 2500)
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
              disabled={isCarregandoGeral}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 active:scale-95 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs"
              title="Recarregar diagnósticos e histórico de auditoria"
            >
              <RefreshCw className={`w-3.5 h-3.5 transition-transform duration-500 ${isCarregandoGeral ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
              <span>{isCarregandoGeral ? 'Atualizando...' : 'Atualizar'}</span>
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

        {/* Card de Execução Diária da Auditoria Forense & Selagem Diária (RN-16) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Auditoria Forense & Execução Diária</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    RN-16 • Daily Seal
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Consolidação noturna dos hashes encadeados (Hash Chaining), imutabilidade append-only e prova de integridade.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                to="/documentacao/auditoria-forense"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                title="Acessar manual e documentação pericial"
              >
                <FileCheck2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Guia Pericial</span>
                <ArrowUpRight className="w-3 h-3 opacity-60" />
              </Link>

              <button
                type="button"
                onClick={() => executarAuditoriaMutation.mutate()}
                disabled={executarAuditoriaMutation.isPending}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-extrabold rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-wait shrink-0"
                title="Disparar manualmente o fechamento diário e teste de integridade"
              >
                {executarAuditoriaMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Executando Fechamento...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Executar Auditoria Diária Agora</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Grid de Métricas de Integridade */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Integridade</span>
              </div>
              <div className="text-base font-black text-slate-900 dark:text-white">
                {painelAuditoria?.particoes_rompidas === 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400">100% Íntegra</span>
                ) : (
                  <span className="text-rose-600 dark:text-rose-400">
                    {painelAuditoria?.particoes_rompidas} Rompida(s)
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400">
                {painelAuditoria?.particoes_integras || 0} partição(ões) verificada(s)
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-500" />
                <span>Partições</span>
              </div>
              <div className="text-base font-black text-slate-900 dark:text-white">
                {painelAuditoria?.total_particoes || 0}
              </div>
              <div className="text-[10px] text-slate-400">
                Contratos, clientes e global
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-purple-500" />
                <span>Eventos Gravados</span>
              </div>
              <div className="text-base font-black text-slate-900 dark:text-white">
                {painelAuditoria?.total_eventos_auditados || 0}
              </div>
              <div className="text-[10px] text-slate-400">
                Registros criptográficos
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Último Selo</span>
              </div>
              <div className="text-xs font-black text-slate-900 dark:text-white truncate" title={painelAuditoria?.ultimo_selo_diario?.selado_em}>
                {painelAuditoria?.ultimo_selo_diario?.selado_em
                  ? new Date(painelAuditoria.ultimo_selo_diario.selado_em).toLocaleDateString('pt-BR')
                  : 'Nenhum selo'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate" title={painelAuditoria?.ultimo_selo_diario?.selo_digest}>
                {painelAuditoria?.ultimo_selo_diario?.selo_digest
                  ? `${painelAuditoria.ultimo_selo_diario.selo_digest.substring(0, 10)}...`
                  : 'Aguardando 1ª selagem'}
              </div>
            </div>
          </div>

          {/* Feedback de Execução Imediata */}
          {resultadoExecucaoAuditoria && (
            <div
              className={`rounded-xl p-4 border text-xs space-y-2 transition animate-in fade-in duration-200 ${
                resultadoExecucaoAuditoria.sucesso
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              }`}
            >
              <div className="flex items-center justify-between font-black">
                <div className="flex items-center gap-2">
                  {resultadoExecucaoAuditoria.sucesso ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  )}
                  <span>Resultado da Execução Manual</span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/70 dark:bg-slate-900/60 border border-current">
                  Latência: {resultadoExecucaoAuditoria.latencia_ms} ms
                </span>
              </div>
              <p className="font-medium">{resultadoExecucaoAuditoria.mensagem}</p>
              <div className="text-[11px] opacity-80">
                Data Ref: <strong>{resultadoExecucaoAuditoria.data_referencia}</strong> • Total avaliado: <strong>{resultadoExecucaoAuditoria.total_particoes}</strong> partição(ões) • Selos lavrados: <strong>{resultadoExecucaoAuditoria.selos_gerados}</strong>
              </div>
            </div>
          )}

          {/* Barra de Filtro e Busca */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Log das Execuções Diárias ({selosDiarios.length})</span>
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={buscaParticao}
                  onChange={(e) => setBuscaParticao(e.target.value)}
                  placeholder="Filtrar por partição (ex: contrato:1)..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
                />
              </div>

              <button
                type="button"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['auditoria-selos-diarios'] })}
                disabled={isFetchingSelos}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer disabled:opacity-50"
                title="Recarregar histórico de selos"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetchingSelos ? 'animate-spin text-purple-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Tabela de Logs de Selagem Diária */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/20">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                    <th className="py-2.5 px-3.5">Data Ref.</th>
                    <th className="py-2.5 px-3">Partição</th>
                    <th className="py-2.5 px-3">Executado Em</th>
                    <th className="py-2.5 px-3 text-center">Eventos Hoje</th>
                    <th className="py-2.5 px-3 text-center">Seq.</th>
                    <th className="py-2.5 px-3 font-mono">Digest SHA-256 do Selo</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {selosDiarios.filter((s) =>
                    buscaParticao ? s.particao.toLowerCase().includes(buscaParticao.toLowerCase()) : true
                  ).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-slate-500">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <ShieldCheck className="w-8 h-8 opacity-40 text-purple-500" />
                          <p className="text-xs font-medium">Nenhum selo diário encontrado para os critérios selecionados.</p>
                          <button
                            type="button"
                            onClick={() => executarAuditoriaMutation.mutate()}
                            disabled={executarAuditoriaMutation.isPending}
                            className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                          >
                            Clique aqui para executar o fechamento diário agora
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    selosDiarios
                      .filter((s) =>
                        buscaParticao ? s.particao.toLowerCase().includes(buscaParticao.toLowerCase()) : true
                      )
                      .map((selo) => {
                        const isCopiado = digestCopiado === selo.selo_digest
                        return (
                          <tr
                            key={selo.id}
                            className="hover:bg-white dark:hover:bg-slate-800/60 transition-colors"
                          >
                            <td className="py-2.5 px-3.5 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              {new Date(selo.data_referencia + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                {selo.particao}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-[11px]">
                              {new Date(selo.selado_em).toLocaleString('pt-BR', {
                                dateStyle: 'short',
                                timeStyle: 'medium',
                              })}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                {selo.total_eventos_dia}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              #{selo.ultima_sequencia}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span title={selo.selo_digest}>
                                  {selo.selo_digest.substring(0, 16)}...
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyDigest(selo.selo_digest)}
                                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                                  title="Copiar Digest SHA-256 do Selo"
                                >
                                  {isCopiado ? (
                                    <Check className="w-3 h-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <CheckCircle2 className="w-3 h-3" /> Íntegro
                              </span>
                            </td>
                          </tr>
                        )
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-3">
            <span>
              🔒 <strong>Garantia Probatória:</strong> Os selos de fechamento consolidam as dispersões SHA-256 de todas as partições do sistema diariamente às 00:00 UTC, em conformidade com as normas ABNT NBR ISO/IEC 27037 e CPP Art. 158.
            </span>
            <Link
              to="/documentacao/auditoria-forense"
              className="text-purple-600 dark:text-purple-400 hover:underline font-bold whitespace-nowrap inline-flex items-center gap-1"
            >
              <span>Ver Guia Pericial &rarr;</span>
            </Link>
          </p>
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
