import { useState, useMemo } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ShieldCheck,
  Database,
  History,
  Clock,
  Play,
  Loader2,
  CheckCircle2,
  ShieldAlert,
  Search,
  RefreshCw,
  Copy,
  Check,
  ArrowUpRight,
  FileCheck2,
  ChevronRight,
  Home,
  Scale,
  Hash,
  FileCode,
  Lock,
  Link2,
} from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { clientService } from '../api/client'
import { ExecucaoAuditoriaResult } from '../types'

type TipoParticaoFiltro = 'todas' | 'contratos' | 'clientes' | 'global'

export function LogHashChainingPage() {
  const { isEmpresaGerente, user } = useAuth()
  const toast = useToast()
  const queryClient = useQueryClient()
  const isGerenteEmpresa = Boolean(isEmpresaGerente || user?.role === 'EMPRESA_ADMIN' || user?.is_superuser)

  const [buscaParticao, setBuscaParticao] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<TipoParticaoFiltro>('todas')
  const [digestCopiado, setDigestCopiado] = useState<string | null>(null)
  const [resultadoExecucaoAuditoria, setResultadoExecucaoAuditoria] = useState<ExecucaoAuditoriaResult | null>(null)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date>(new Date())

  const { data: painelAuditoria, isFetching: isFetchingAuditoria, refetch: refetchPainel } = useQuery({
    queryKey: ['auditoria-painel-integridade'],
    queryFn: () => clientService.auditoria.painelIntegridade(),
    enabled: isGerenteEmpresa,
  })

  const { data: selosDiarios = [], isFetching: isFetchingSelos, refetch: refetchSelos } = useQuery({
    queryKey: ['auditoria-selos-diarios'],
    queryFn: () => clientService.auditoria.listarSelosDiarios(),
    enabled: isGerenteEmpresa,
  })

  const isCarregandoGeral = isFetchingAuditoria || isFetchingSelos

  const executarAuditoriaMutation = useMutation({
    mutationFn: () => clientService.auditoria.executarAuditoriaDiaria(),
    onSuccess: (res) => {
      setResultadoExecucaoAuditoria(res)
      setUltimaAtualizacao(new Date())
      queryClient.invalidateQueries({ queryKey: ['auditoria-painel-integridade'] })
      queryClient.invalidateQueries({ queryKey: ['auditoria-selos-diarios'] })
      if (res.sucesso) {
        toast.success(res.mensagem || 'Auditoria diária e fechamento executados com sucesso!')
      } else {
        toast.error(res.mensagem || 'Houve inconsistência na verificação de integridade.')
      }
    },
    onError: () => {
      toast.error('Erro ao disparar execução da auditoria diária.')
    },
  })

  const handleAtualizar = async () => {
    try {
      await Promise.all([refetchPainel(), refetchSelos()])
      setUltimaAtualizacao(new Date())
      toast.success('Visualização atualizada! (Consulta segura de leitura: nenhum dado ou rotina foi alterado)')
    } catch {
      toast.error('Falha ao atualizar dados de auditoria.')
    }
  }

  const handleCopyDigest = (digest: string) => {
    navigator.clipboard.writeText(digest)
    setDigestCopiado(digest)
    toast.info('Digest SHA-256 do selo copiado com sucesso!')
    setTimeout(() => setDigestCopiado(null), 2500)
  }

  // Filtragem combinada por tipo de partição e texto de busca
  const selosFiltrados = useMemo(() => {
    return selosDiarios.filter((selo) => {
      const particaoLower = selo.particao.toLowerCase()

      // Filtro por categoria
      if (filtroTipo === 'contratos' && !particaoLower.startsWith('contrato:')) return false
      if (filtroTipo === 'clientes' && !particaoLower.startsWith('cliente:')) return false
      if (filtroTipo === 'global' && particaoLower !== 'global') return false

      // Filtro por texto de busca
      if (buscaParticao.trim()) {
        const busca = buscaParticao.trim().toLowerCase()
        const casouParticao = particaoLower.includes(busca)
        const casouHash = selo.selo_digest.toLowerCase().includes(busca)
        const casouData = selo.data_referencia.includes(busca)
        return casouParticao || casouHash || casouData
      }

      return true
    })
  }, [selosDiarios, filtroTipo, buscaParticao])

  if (!isGerenteEmpresa) {
    return <Navigate to="/dashboard" replace />
  }

  const is100Integra = (painelAuditoria?.particoes_rompidas ?? 0) === 0

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Breadcrumb de Navegação */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Link
            to="/dashboard"
            className="hover:text-slate-900 dark:hover:text-white transition flex items-center gap-1"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Início</span>
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          <Link
            to="/documentacao/auditoria-forense"
            className="hover:text-slate-900 dark:hover:text-white transition"
          >
            Auditoria Forense
          </Link>
          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          <span className="font-bold text-slate-800 dark:text-slate-200">Consolidação Hash Chaining</span>
        </nav>

        {/* Cabeçalho Principal da Página */}
        <div className="pb-5 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-100 dark:border-purple-900 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-2xs shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Consolidação Hash Chaining
                </h1>
                <span
                  className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                  title="RN-16: Fechamento pericial diário com selagem criptográfica às 00:00 UTC"
                >
                  Daily Seal
                </span>
                {is100Integra ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Cadeia Verificada
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Atenção: Inconsistência Detectada
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-3xl">
                Consolidação noturna dos hashes encadeados (Hash Chaining), imutabilidade append-only e prova de integridade pericial conforme ABNT NBR ISO/IEC 27037 e CPP Art. 158.
              </p>
            </div>

            <div className="flex flex-col items-start lg:items-end gap-2 shrink-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <Link
                  to="/documentacao/auditoria-forense"
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer shadow-2xs"
                  title="Acessar manual e documentação pericial"
                >
                  <FileCheck2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Guia Pericial</span>
                  <ArrowUpRight className="w-3 h-3 opacity-60" />
                </Link>

                <button
                  type="button"
                  onClick={handleAtualizar}
                  disabled={isCarregandoGeral}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer disabled:opacity-50 shadow-2xs group"
                  title="Consulta somente leitura: busca os dados mais recentes do servidor sem alterar absolutamente nenhum dado, contrato ou rotina."
                >
                  <RefreshCw className={`w-3.5 h-3.5 transition-transform duration-500 ${isCarregandoGeral ? 'animate-spin text-purple-600 dark:text-purple-400' : 'group-hover:rotate-180'}`} />
                  <span>{isCarregandoGeral ? 'Recarregando...' : 'Recarregar Dados'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => executarAuditoriaMutation.mutate()}
                  disabled={executarAuditoriaMutation.isPending}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-wait shrink-0"
                  title="Disparo manual sob demanda do fechamento diário e teste de integridade pericial. Não altera contratos nem a rotina noturna automática (00:00 UTC)."
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

              {/* Indicador de segurança e horário da última consulta */}
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Somente leitura (100% seguro)</span>
                </span>
                <span>•</span>
                <span className="font-mono">
                  Consulta às {ultimaAtualizacao.toLocaleTimeString('pt-BR')}
                </span>
              </div>
            </div>
          </div>

          {/* Listinha de Badges com os Selos de Métodos, Normas e Certificações descritos no subtítulo - em UMA LINHA SÓ */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar flex-nowrap">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs hover:border-purple-300 dark:hover:border-purple-700 transition cursor-default whitespace-nowrap shrink-0"
              title="ABNT NBR ISO/IEC 27037: Diretrizes para identificação, coleta, aquisição e preservação de evidência digital"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
              <span>ABNT NBR ISO/IEC 27037</span>
            </span>

            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition cursor-default whitespace-nowrap shrink-0"
              title="Código de Processo Penal Brasileiro (Arts. 158-A a 158-F): Cadeia de Custódia Probatória e Rastreabilidade"
            >
              <Scale className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>CPP Art. 158</span>
            </span>

            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-700 transition cursor-default whitespace-nowrap shrink-0"
              title="SHA-256 (FIPS 180-4): Algoritmo determinístico de dispersão criptográfica de 256 bits com bloco gênese monotônico"
            >
              <Hash className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>SHA-256</span>
            </span>

            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs hover:border-amber-300 dark:hover:border-amber-700 transition cursor-default whitespace-nowrap shrink-0"
              title="RFC 8785: JSON Canonicalization Scheme (JCS) para serialização determinística e invariante de eventos periciais"
            >
              <FileCode className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>RFC 8785 (JCS)</span>
            </span>

            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs hover:border-rose-300 dark:hover:border-rose-700 transition cursor-default whitespace-nowrap shrink-0"
              title="Append-Only: Imutabilidade estrita por gatilhos PostgreSQL que bloqueiam UPDATE e DELETE na base"
            >
              <Lock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>Append-Only</span>
            </span>

            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs hover:border-blue-300 dark:hover:border-blue-700 transition cursor-default whitespace-nowrap shrink-0"
              title="Hash Chaining: Encadeamento monotônico ininterrupto de elos criptográficos particionados"
            >
              <Link2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>Hash Chaining</span>
            </span>
          </div>
        </div>

        {/* 4 Cards de Métricas de Integridade */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Integridade</span>
              </div>
              {is100Integra && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
            <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
              {is100Integra ? (
                <span className="text-emerald-600 dark:text-emerald-400">100% Íntegra</span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400">
                  {painelAuditoria?.particoes_rompidas} Rompida(s)
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              {painelAuditoria?.particoes_integras ?? 0} partição(ões) verificada(s)
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-indigo-500" />
              <span>Partições Ativas</span>
            </div>
            <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
              {painelAuditoria?.total_particoes ?? 0}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Contratos, clientes e global
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <History className="w-4 h-4 text-purple-500" />
              <span>Eventos Gravados</span>
            </div>
            <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
              {painelAuditoria?.total_eventos_auditados ?? 0}
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Registros imutáveis append-only
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Último Selo Noturno</span>
            </div>
            <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white truncate" title={painelAuditoria?.ultimo_selo_diario?.selado_em}>
              {painelAuditoria?.ultimo_selo_diario?.selado_em
                ? new Date(painelAuditoria.ultimo_selo_diario.selado_em).toLocaleDateString('pt-BR')
                : 'Nenhum selo'}
            </div>
            <div className="text-[11px] text-slate-400 font-mono truncate" title={painelAuditoria?.ultimo_selo_diario?.selo_digest}>
              {painelAuditoria?.ultimo_selo_diario?.selo_digest
                ? `${painelAuditoria.ultimo_selo_diario.selo_digest.substring(0, 16)}...`
                : 'Aguardando 1ª selagem'}
            </div>
          </div>
        </div>

        {/* Feedback de Execução Imediata */}
        {resultadoExecucaoAuditoria && (
          <div
            className={`rounded-2xl p-5 border text-xs space-y-2.5 transition animate-in fade-in duration-200 shadow-xs ${
              resultadoExecucaoAuditoria.sucesso
                ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-black">
              <div className="flex items-center gap-2">
                {resultadoExecucaoAuditoria.sucesso ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <span className="text-sm">Resultado da Execução Manual sob Demanda</span>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-white/80 dark:bg-slate-900/60 border border-current self-start sm:self-auto">
                Latência: {resultadoExecucaoAuditoria.latencia_ms} ms
              </span>
            </div>
            <p className="font-semibold text-xs leading-relaxed">{resultadoExecucaoAuditoria.mensagem}</p>
            <div className="text-[11px] opacity-85 pt-1 border-t border-current/20 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>Data de Referência: <strong>{resultadoExecucaoAuditoria.data_referencia}</strong></span>
              <span>Total Avaliado: <strong>{resultadoExecucaoAuditoria.total_particoes}</strong> partição(ões)</span>
              <span>Novos Selos Lavrados: <strong>{resultadoExecucaoAuditoria.selos_gerados}</strong></span>
              <span>Partições Rompidas: <strong>{resultadoExecucaoAuditoria.particoes_rompidas}</strong></span>
            </div>
          </div>
        )}

        {/* Tabela Pericial e Filtros */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
          {/* Barra Superior da Tabela: Título, Filtros por Abas e Busca */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Log das Execuções Diárias</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {selosFiltrados.length}
                </span>
              </h2>
            </div>

            {/* Abas Rápidas de Filtro de Partição */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFiltroTipo('todas')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  filtroTipo === 'todas'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipo('contratos')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  filtroTipo === 'contratos'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Contratos
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipo('clientes')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  filtroTipo === 'clientes'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Clientes
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipo('global')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  filtroTipo === 'global'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Global
              </button>
            </div>

            {/* Campo de Busca Textual */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={buscaParticao}
                onChange={(e) => setBuscaParticao(e.target.value)}
                placeholder="Filtrar partição, hash ou data..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-2xs"
              />
              {buscaParticao && (
                <button
                  type="button"
                  onClick={() => setBuscaParticao('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Tabela com Scroll Horizontal Suave */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/20">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-bold">
                    <th className="py-3 px-4">Data Ref.</th>
                    <th className="py-3 px-3">Partição</th>
                    <th className="py-3 px-3">Executado Em</th>
                    <th className="py-3 px-3 text-center">Eventos Hoje</th>
                    <th className="py-3 px-3 text-center">Seq.</th>
                    <th className="py-3 px-3 font-mono">Digest SHA-256 do Selo</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {selosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                        <div className="flex flex-col items-center justify-center space-y-2.5">
                          <ShieldCheck className="w-10 h-10 opacity-30 text-purple-500" />
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            Nenhum selo diário encontrado para os filtros selecionados.
                          </p>
                          <button
                            type="button"
                            onClick={() => executarAuditoriaMutation.mutate()}
                            disabled={executarAuditoriaMutation.isPending}
                            className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                          >
                            Disparar agora a selagem e fechamento diário
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    selosFiltrados.map((selo) => {
                      const isCopiado = digestCopiado === selo.selo_digest
                      return (
                        <tr
                          key={selo.id}
                          className="hover:bg-white dark:hover:bg-slate-800/60 transition-colors"
                        >
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            {new Date(selo.data_referencia + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                              {selo.particao}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap text-[11px]">
                            {new Date(selo.selado_em).toLocaleString('pt-BR', {
                              dateStyle: 'short',
                              timeStyle: 'medium',
                            })}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              {selo.total_eventos_dia}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            #{selo.ultima_sequencia}
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span title={selo.selo_digest} className="select-all">
                                {selo.selo_digest.substring(0, 16)}...
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyDigest(selo.selo_digest)}
                                className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                                title="Copiar Digest SHA-256 completo"
                              >
                                {isCopiado ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
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

          {/* Rodapé de Garantia Probatória */}
          <div className="text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4">
            <p className="leading-relaxed">
              🔒 <strong>Garantia Probatória:</strong> Os selos de fechamento consolidam as dispersões SHA-256 de todas as partições do sistema diariamente às 00:00 UTC, em conformidade com as normas ABNT NBR ISO/IEC 27037 e CPP Art. 158.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
