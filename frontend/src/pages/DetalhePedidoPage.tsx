import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Layers,
  Settings,
  Paperclip,
  Download,
  Music,
  Image as ImageIcon,
  Archive,
  FileText,
  User,
  Calendar,
  Clock,
  Flame,
  AlertTriangle,
  Building2,
  Tag,
  Cloud,
  CloudUpload,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { CicloCarousel } from '../components/ciclos/CicloCarousel'
import { ModalAgendamento } from '../components/schedule/ModalAgendamento'
import { clientService } from '../api/client'
import { useAuth } from '../contexts/AuthContext'

function formatarTamanho(bytes: number): string {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isAudioFile(nome: string): boolean {
  const ext = nome.split('.').pop()?.toLowerCase() || ''
  return ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)
}

function getIconeArquivo(nome: string) {
  const ext = nome.split('.').pop()?.toLowerCase() || ''
  if (isAudioFile(nome)) {
    return <Music className="w-4 h-4 text-violet-500 shrink-0" />
  }
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
    return <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" />
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <Archive className="w-4 h-4 text-amber-500 shrink-0" />
  }
  return <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
}

function getStatusConfig(status?: string) {
  switch (status) {
    case 'aberto':
      return {
        label: 'Aberto',
        badge: 'bg-sky-50 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/70',
        dot: 'bg-sky-500',
      }
    case 'em_orcamento':
      return {
        label: 'Em Orçamento',
        badge: 'bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/70',
        dot: 'bg-purple-500',
      }
    case 'aguardando_aprovacao':
      return {
        label: 'Aguardando Aprovação',
        badge: 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/70',
        dot: 'bg-amber-500',
      }
    case 'em_execucao':
      return {
        label: 'Em Execução',
        badge: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/70',
        dot: 'bg-indigo-500 animate-pulse',
      }
    case 'aguardando_aceite':
      return {
        label: 'Aguardando Aceite',
        badge: 'bg-violet-50 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/70',
        dot: 'bg-violet-500',
      }
    case 'concluido':
      return {
        label: 'Concluído',
        badge: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/70',
        dot: 'bg-emerald-500',
      }
    case 'cancelado':
      return {
        label: 'Cancelado',
        badge: 'bg-rose-50 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/70',
        dot: 'bg-rose-500',
      }
    default:
      return {
        label: status || 'Pendente',
        badge: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        dot: 'bg-slate-400',
      }
  }
}

function getPrioridadeConfig(prioridade?: string) {
  switch (prioridade) {
    case 'urgente':
      return {
        label: 'Urgente',
        badge: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/70',
        iconColor: 'text-rose-600 dark:text-rose-400',
        iconBg: 'bg-rose-100 dark:bg-rose-950/80',
        sla: 'Atendimento Crítico / SLA Imediato',
      }
    case 'alta':
      return {
        label: 'Alta',
        badge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/70',
        iconColor: 'text-amber-600 dark:text-amber-400',
        iconBg: 'bg-amber-100 dark:bg-amber-950/80',
        sla: 'Prioridade Elevada',
      }
    case 'media':
      return {
        label: 'Média',
        badge: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/70',
        iconColor: 'text-blue-600 dark:text-blue-400',
        iconBg: 'bg-blue-100 dark:bg-blue-950/80',
        sla: 'Prioridade Normal / Padrão',
      }
    case 'baixa':
    default:
      return {
        label: 'Baixa',
        badge: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        iconColor: 'text-slate-600 dark:text-slate-400',
        iconBg: 'bg-slate-100 dark:bg-slate-800',
        sla: 'Demanda de Baixo Impacto',
      }
  }
}

function formatarDataHora(dataIso?: string) {
  if (!dataIso) return { data: '-', hora: '-', completa: '-' }
  const d = new Date(dataIso)
  if (isNaN(d.getTime())) return { data: '-', hora: '-', completa: '-' }
  const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return { data, hora, completa: `${data} às ${hora}` }
}

export function DetalhePedidoPage() {
  const { id } = useParams<{ id: string }>()
  const { isEmpresa } = useAuth()
  const queryClient = useQueryClient()
  const [modalAgendamentoOpen, setModalAgendamentoOpen] = useState(false)
  const [isSyncingStorage, setIsSyncingStorage] = useState(false)

  const { data: pedido, isLoading } = useQuery({
    queryKey: ['pedido', id],
    queryFn: () => clientService.pedidos.get(Number(id)),
    enabled: Boolean(id),
    refetchInterval: 5000,
  })

  const { data: storageStatus, refetch: refetchStorage } = useQuery({
    queryKey: ['storage_status', id],
    queryFn: () => clientService.pedidos.statusStorage(Number(id)),
    enabled: Boolean(id),
    refetchInterval: 10000,
  })

  const handleSincronizarStorage = async () => {
    if (!id) return
    try {
      setIsSyncingStorage(true)
      await clientService.pedidos.sincronizarStorage(Number(id))
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['pedido', id] }),
        refetchStorage(),
      ])
    } catch (err) {
      console.error('Erro ao sincronizar com Google Drive:', err)
    } finally {
      setIsSyncingStorage(false)
    }
  }

  if (isLoading) {
    return (
      <AppLayout showSidebar={false}>
        <div className="p-12 text-center text-slate-400 font-medium">Carregando detalhes do pedido...</div>
      </AppLayout>
    )
  }

  if (!pedido) {
    return (
      <AppLayout showSidebar={false}>
        <div className="p-12 text-center text-rose-500 font-bold">Pedido não encontrado.</div>
      </AppLayout>
    )
  }

  const ciclos = pedido.ciclos || []
  const anexos = pedido.anexos || []

  const totalCiclos = ciclos.length
  const ciclosConcluidos = ciclos.filter((c) => c.status === 'aceito').length
  const ciclosEmAndamento = ciclos.filter(
    (c) => c.status === 'em_execucao' || c.status === 'aguardando_aceite' || c.status === 'aprovado'
  ).length
  const ciclosEmOrcamento = ciclos.filter(
    (c) => c.status === 'orcado' || c.status === 'aguardando_aprovacao'
  ).length

  let resumoCiclosTexto = 'Nenhum ciclo criado ainda'
  if (totalCiclos > 0) {
    if (ciclosConcluidos === totalCiclos) {
      resumoCiclosTexto = `Todos os ${totalCiclos} concluídos`
    } else if (ciclosEmAndamento > 0 && ciclosConcluidos > 0) {
      resumoCiclosTexto = `${ciclosConcluidos} concluído(s) • ${ciclosEmAndamento} ativo(s)`
    } else if (ciclosEmAndamento > 0) {
      resumoCiclosTexto = `${ciclosEmAndamento} ciclo(s) em andamento`
    } else if (ciclosEmOrcamento > 0) {
      resumoCiclosTexto = `${ciclosEmOrcamento} em orçamento/aprovação`
    } else {
      resumoCiclosTexto = `${totalCiclos} registrado(s)`
    }
  }

  const statusConfig = getStatusConfig(pedido.status)
  const prioridadeConfig = getPrioridadeConfig(pedido.prioridade)
  const dataInfo = formatarDataHora(pedido.criado_em)

  return (
    <AppLayout showSidebar={false}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Title & Top Actions */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800">
                Governança SHM
              </span>
              <span className="text-xs font-bold text-slate-400">•</span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                {isEmpresa ? 'Painel de Gestão de Pedidos' : 'Acompanhamento de Pedido'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
              {pedido.assunto}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-0.5">
              Manutenção de pedidos, gestão de ciclos de atendimento, arquivos e apontamentos
            </p>

            {/* Badges de Identificação & Status */}
            <div className="flex items-center gap-2 flex-wrap mt-3">
              <span className="text-xs font-mono font-black bg-indigo-100 dark:bg-indigo-950/80 text-indigo-950 dark:text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-300 dark:border-indigo-800/60">
                {pedido.protocolo}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-xs font-black px-2.5 py-1 rounded-md border ${statusConfig.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                <span>{statusConfig.label}</span>
              </span>
              {pedido.cliente_nome && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/90 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700/60">
                  <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate max-w-[200px]">{pedido.cliente_nome}</span>
                </span>
              )}
              {pedido.contrato_numero && (
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-2xs">
                  <span>{pedido.contrato_numero}</span>
                  <span className="text-slate-500 dark:text-slate-400 font-mono font-semibold">(Saldo: {pedido.contrato_saldo}h)</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 mt-1">
            <button
              type="button"
              onClick={() => setModalAgendamentoOpen(true)}
              className="px-4 py-2.5 sm:py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-xs shadow-2xs hover:shadow-xs transition flex items-center gap-2 cursor-pointer"
              title="Agendar reunião para este chamado"
            >
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span>Agendar Reunião</span>
            </button>

            {isEmpresa && (
              <Link
                to={`/admin/pedidos/${pedido.id}/analise`}
                className="px-5 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition flex items-center gap-2 cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>Gerenciar Ciclos</span>
              </Link>
            )}
          </div>
        </div>

        {/* Metadados Detalhados do Pedido */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Solicitante (Quem abriu) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex items-start gap-3.5 transition hover:border-indigo-300 dark:hover:border-indigo-800/80">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                Quem Abriu
              </span>
              <p className="text-sm font-black text-slate-900 dark:text-white truncate mt-0.5" title={pedido.criado_por_nome || 'Usuário'}>
                {pedido.criado_por_nome || 'Usuário'}
              </p>
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate mt-0.5" title={pedido.criado_por_role || pedido.criado_por_email || pedido.cliente_nome}>
                {pedido.criado_por_role || pedido.criado_por_email || pedido.cliente_nome || 'Solicitante'}
              </p>
            </div>
          </div>

          {/* Card 2: Data e Hora */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex items-start gap-3.5 transition hover:border-blue-300 dark:hover:border-blue-800/80">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                Data e Hora
              </span>
              <p className="text-sm font-black text-slate-900 dark:text-white truncate mt-0.5">
                {dataInfo.completa}
              </p>
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                <span>Registrado no sistema</span>
              </p>
            </div>
          </div>

          {/* Card 3: Prioridade */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex items-start gap-3.5 transition hover:border-amber-300 dark:hover:border-amber-800/80">
            <div className={`p-2.5 rounded-xl ${prioridadeConfig.iconBg} ${prioridadeConfig.iconColor} shrink-0`}>
              {pedido.prioridade === 'urgente' ? (
                <Flame className="w-5 h-5" />
              ) : pedido.prioridade === 'alta' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <Tag className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                Prioridade
              </span>
              <div className="mt-1">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-black text-xs uppercase tracking-wider border ${prioridadeConfig.badge}`}>
                  {prioridadeConfig.label}
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate mt-1">
                {prioridadeConfig.sla}
              </p>
            </div>
          </div>

          {/* Card 4: Quantidade de Ciclos */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs flex items-start gap-3.5 transition hover:border-violet-300 dark:hover:border-violet-800/80">
            <div className="p-2.5 rounded-xl bg-violet-50 dark:bg-violet-950/80 text-violet-600 dark:text-violet-400 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
                Ciclos de Atendimento
              </span>
              <p className="text-sm font-black text-slate-900 dark:text-white truncate mt-0.5">
                {totalCiclos} {totalCiclos === 1 ? 'ciclo' : 'ciclos'}
              </p>
              <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate mt-0.5">
                {resumoCiclosTexto}
              </p>
            </div>
          </div>
        </div>

        {/* Card de Detalhamento da Demanda */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-xs transition-colors">
          <p className="text-base sm:text-lg text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-medium">
            {pedido.descricao}
          </p>
        </div>

        {/* Card de Documentos Anexados ao Pedido */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 flex-wrap">
              <Paperclip className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Documentos Anexados ao Pedido ({anexos.length})
              </h3>
              {storageStatus?.pasta_drive_url && (
                <a
                  href={storageStatus.pasta_drive_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 rounded-lg border border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition"
                  title="Abrir pasta do cliente no Google Drive"
                >
                  <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Google Drive do Cliente</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </a>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {anexos.length > 0 ? `${anexos.length} documento(s) anexado(s)` : 'Sem documentos'}
              </span>
              {isEmpresa && anexos.length > 0 && (
                <button
                  type="button"
                  onClick={handleSincronizarStorage}
                  disabled={isSyncingStorage}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                  title="Sincronizar anexos deste pedido com o Google Drive corporativo"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingStorage ? 'animate-spin text-indigo-500' : 'text-slate-500'}`} />
                  <span>{isSyncingStorage ? 'Sincronizando...' : 'Sincronizar Nuvem'}</span>
                </button>
              )}
            </div>
          </div>

          {anexos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {anexos.map((anexo) => {
                const driveStatus = anexo.drive_status || 'PENDENTE'
                const isSynced = driveStatus === 'SINCRONIZADO'
                return (
                  <div
                    key={anexo.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {getIconeArquivo(anexo.nome_original)}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={anexo.nome_original}>
                            {anexo.nome_original}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              {formatarTamanho(anexo.tamanho)}
                            </span>
                            {anexo.hash_sha256 && (
                              <span
                                className="text-[9px] font-mono text-slate-400 dark:text-slate-500 truncate max-w-[100px]"
                                title={`SHA-256: ${anexo.hash_sha256}`}
                              >
                                SHA: {anexo.hash_sha256.substring(0, 8)}...
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {anexo.drive_url && (
                          <a
                            href={anexo.drive_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition"
                            title="Abrir cópia no Google Drive"
                          >
                            <Cloud className="w-4 h-4" />
                          </a>
                        )}
                        <a
                          href={anexo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition"
                          title="Baixar arquivo direto da VPS"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </div>

                    {/* Status de Sincronização e Resiliência Híbrida */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px]">
                      <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        Local VPS
                      </span>
                      {isSynced ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          Drive 🟢
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                          <CloudUpload className="w-3 h-3 animate-pulse" />
                          Sync Nuvem
                        </span>
                      )}
                    </div>

                    {isAudioFile(anexo.nome_original) && (
                      <audio controls src={anexo.url} preload="metadata" className="w-full h-7 mt-1" />
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">
              Nenhum documento foi anexado a este pedido na abertura.
            </p>
          )}
        </div>

        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Ciclos de Atendimento ({ciclos.length})</span>
          </h2>
          <CicloCarousel pedido={pedido} ciclos={ciclos} />
        </div>
      </div>

      {/* Modal de Agendamento com o Pedido em Foco */}
      <ModalAgendamento
        isOpen={modalAgendamentoOpen}
        onClose={() => setModalAgendamentoOpen(false)}
        clienteId={pedido.cliente}
        clienteNome={pedido.cliente_nome}
        contratoId={pedido.contrato}
        contratoNumero={pedido.contrato_numero}
        pedidoId={pedido.id}
        pedidoProtocolo={pedido.protocolo}
        pedidoAssunto={pedido.assunto}
        tipoSugerido="alinhamento"
        onAgendado={() => {
          queryClient.invalidateQueries({ queryKey: ['pedido', id] })
          queryClient.invalidateQueries({ queryKey: ['schedule_proxima'] })
          queryClient.invalidateQueries({ queryKey: ['schedule_agendamentos'] })
        }}
      />
    </AppLayout>
  )
}