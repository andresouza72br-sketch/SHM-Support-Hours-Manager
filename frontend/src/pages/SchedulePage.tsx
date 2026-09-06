import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  Plus,
  Search,
  ExternalLink,
  Copy,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  FileText,
  Building2,
  CheckCheck,
  Edit2,
  Sparkles,
  Link as LinkIcon,
} from 'lucide-react'
import { AppLayout } from '../components/layout/AppLayout'
import { ModalAgendamento } from '../components/schedule/ModalAgendamento'
import { clientService } from '../api/client'
import { useToast } from '../contexts/ToastContext'
import type { Agendamento, StatusAgendamento } from '../types'

type AbaVisao = 'proximas' | 'calendario' | 'historico'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export function SchedulePage() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const contratoUrl = searchParams.get('contrato') ? Number(searchParams.get('contrato')) : null
  const clienteUrl = searchParams.get('cliente') ? Number(searchParams.get('cliente')) : null
  const pedidoUrl = searchParams.get('pedido') ? Number(searchParams.get('pedido')) : null

  const [abaAtiva, setAbaAtiva] = useState<AbaVisao>('proximas')
  const [modalNovoAberto, setModalNovoAberto] = useState(false)
  const [termoBusca, setTermoBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')

  // Estado do Calendário Mensal
  const [dataCalendario, setDataCalendario] = useState(new Date())
  const [diaSelecionado, setDiaSelecionado] = useState<Date | null>(new Date())
  const agora = useMemo(() => new Date(), [])

  // Estado do Modal de Cancelamento
  const [agendamentoParaCancelar, setAgendamentoParaCancelar] = useState<Agendamento | null>(null)
  const [motivoCancelamento, setMotivoCancelamento] = useState('')

  // Estado do Modal de Edição de Link da Sala (Meet / Zoom / Teams)
  const [agendamentoParaEditarLink, setAgendamentoParaEditarLink] = useState<Agendamento | null>(null)
  const [linkEditando, setLinkEditando] = useState('')

  // Query de Contratos (para reconhecer o contrato/cliente em foco)
  const { data: contratosRaw = [] } = useQuery({
    queryKey: ['contratos'],
    queryFn: () => clientService.contratos.list(),
  })
  const contratos = Array.isArray(contratosRaw) ? contratosRaw : []

  const contratoEmFoco = useMemo(() => {
    if (!contratoUrl) return null
    return contratos.find((c) => c.id === contratoUrl) || null
  }, [contratos, contratoUrl])

  const clienteEmFocoId = clienteUrl || contratoEmFoco?.cliente || null
  const clienteEmFocoNome = useMemo(() => {
    if (contratoEmFoco?.cliente_nome) return contratoEmFoco.cliente_nome
    if (clienteEmFocoId) {
      const matchContrato = contratos.find((item) => item.cliente === clienteEmFocoId)
      if (matchContrato?.cliente_nome) return matchContrato.cliente_nome
    }
    return ''
  }, [contratoEmFoco, clienteEmFocoId, contratos])

  const handleSelectContrato = (id: number | null) => {
    const newParams = new URLSearchParams(searchParams)
    if (id) {
      newParams.set('contrato', String(id))
    } else {
      newParams.delete('contrato')
    }
    setSearchParams(newParams)
  }

  // Query dos Agendamentos com staleTime e intervalo seguro
  const {
    data: agendamentosRaw = [],
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['schedule_agendamentos'],
    queryFn: () => clientService.schedule.list(),
    refetchInterval: 30000,
    staleTime: 10000,
  })

  const agendamentos: Agendamento[] = Array.isArray(agendamentosRaw) ? agendamentosRaw : []

  const temFiltrosAtivos = Boolean(
    termoBusca.trim() || filtroTipo !== 'todos' || filtroStatus !== 'todos'
  )

  const handleLimparFiltros = () => {
    setTermoBusca('')
    setFiltroTipo('todos')
    setFiltroStatus('todos')
  }

  // Ação de Atualização com feedback em tempo real
  const handleAtualizar = async () => {
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['schedule_agendamentos'] }),
        queryClient.invalidateQueries({ queryKey: ['schedule_proxima'] }),
        queryClient.invalidateQueries({ queryKey: ['contratos'] }),
        refetch(),
      ])
      toast.success('Agenda de suporte atualizada com sucesso.', 'Atualizado')
    } catch {
      toast.error('Erro ao atualizar dados da agenda.', 'Erro')
    }
  }

  // Mutação para Cancelar Agendamento
  const cancelarMutation = useMutation({
    mutationFn: ({ id, motivo }: { id: number | string; motivo: string }) =>
      clientService.schedule.cancelar(id, motivo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule_agendamentos'] })
      queryClient.invalidateQueries({ queryKey: ['schedule_proxima'] })
      toast.success('Agendamento cancelado com sucesso.', 'Agenda SHM')
      setAgendamentoParaCancelar(null)
      setMotivoCancelamento('')
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        'Não foi possível cancelar o agendamento.'
      toast.error(msg, 'Erro ao Cancelar')
    },
  })

  // Mutação para Atualizar Link do Meet / Sala Virtual
  const atualizarLinkMutation = useMutation({
    mutationFn: ({ id, google_meet_link }: { id: number | string; google_meet_link: string | null }) =>
      clientService.schedule.update(id, { google_meet_link }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule_agendamentos'] })
      queryClient.invalidateQueries({ queryKey: ['schedule_proxima'] })
      toast.success('Link da reunião atualizado com sucesso.', 'Sala Virtual')
      setAgendamentoParaEditarLink(null)
      setLinkEditando('')
    },
    onError: (err: any) => {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        'Não foi possível atualizar o link da reunião.'
      toast.error(msg, 'Erro ao Atualizar')
    },
  })

  const abrirModalEditarLink = (item: Agendamento) => {
    setAgendamentoParaEditarLink(item)
    setLinkEditando(item.google_meet_link || item.meet_link || '')
  }

  const handleCopiarLinkMeet = (link: string) => {
    navigator.clipboard.writeText(link)
    toast.success('Link do Google Meet copiado!', 'Copiado')
  }

  // Helper resiliente para calcular data de término (evita que reuniões sumam se data_fim vier nula)
  const getAgendamentoDataFim = (item: Agendamento): Date => {
    if (item.data_fim) {
      const d = new Date(item.data_fim)
      if (!isNaN(d.getTime())) return d
    }
    if (item.data_inicio) {
      const d = new Date(item.data_inicio)
      if (!isNaN(d.getTime())) {
        const duracao = typeof item.duracao_minutos === 'number' && item.duracao_minutos > 0 ? item.duracao_minutos : 45
        return new Date(d.getTime() + duracao * 60 * 1000)
      }
    }
    return new Date()
  }

  // Filtragem geral
  const agendamentosFiltrados = useMemo(() => {
    return agendamentos.filter((item) => {
      // Busca textual
      if (termoBusca.trim()) {
        const termo = termoBusca.toLowerCase()
        const matchTitulo = (item.titulo || '').toLowerCase().includes(termo)
        const matchCliente = (item.cliente_nome || '').toLowerCase().includes(termo)
        const matchProtocolo = (item.pedido_protocolo || '').toLowerCase().includes(termo)
        if (!matchTitulo && !matchCliente && !matchProtocolo) return false
      }

      // Filtro de tipo com tolerância e compatibilidade retroativa
      if (filtroTipo !== 'todos') {
        const tipoItem = String(item.tipo)
        const match =
          tipoItem === filtroTipo ||
          (filtroTipo === 'avulso' && (tipoItem === 'reuniao_geral' || tipoItem === 'avulso')) ||
          (filtroTipo === 'reuniao_geral' && (tipoItem === 'avulso' || tipoItem === 'reuniao_geral')) ||
          (filtroTipo === 'orcamento' && (tipoItem === 'apresentacao_orcamento' || tipoItem === 'orcamento')) ||
          (filtroTipo === 'apresentacao_orcamento' && (tipoItem === 'orcamento' || tipoItem === 'apresentacao_orcamento'))
        if (!match) return false
      }

      // Filtro de status com equivalência de status concluído/realizado
      if (filtroStatus !== 'todos') {
        if (filtroStatus === 'realizado') {
          if (item.status !== 'realizado' && item.status !== 'concluido') return false
        } else if (item.status !== filtroStatus) {
          return false
        }
      }

      // Filtro contextual de cliente/contrato em foco (se ativo)
      if (clienteEmFocoId && item.cliente && Number(item.cliente) !== Number(clienteEmFocoId)) {
        return false
      }

      return true
    })
  }, [agendamentos, termoBusca, filtroTipo, filtroStatus, clienteEmFocoId])

  // Separação por Próximas vs Histórico com timestamp estável
  const proximosAgendamentos = useMemo(() => {
    const agoraTimestamp = Date.now()
    return agendamentosFiltrados
      .filter((item) => {
        if (item.status === 'cancelado') return false
        const fim = getAgendamentoDataFim(item)
        return fim.getTime() >= agoraTimestamp
      })
      .sort((a, b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime())
  }, [agendamentosFiltrados])

  const historicoAgendamentos = useMemo(() => {
    const agoraTimestamp = Date.now()
    return agendamentosFiltrados
      .filter((item) => {
        if (item.status === 'cancelado') return true
        const fim = getAgendamentoDataFim(item)
        return fim.getTime() < agoraTimestamp
      })
      .sort((a, b) => new Date(b.data_inicio).getTime() - new Date(a.data_inicio).getTime())
  }, [agendamentosFiltrados])

  // Lógica do Calendário Mensal
  const anoAtual = dataCalendario.getFullYear()
  const mesAtual = dataCalendario.getMonth()

  const primeiroDiaMes = new Date(anoAtual, mesAtual, 1)
  const ultimoDiaMes = new Date(anoAtual, mesAtual + 1, 0)
  const diasNoMes = ultimoDiaMes.getDate()
  const diaSemanaInicio = primeiroDiaMes.getDay()

  const navegarMes = (direcao: 'ant' | 'prox') => {
    const novoMes = direcao === 'ant' ? mesAtual - 1 : mesAtual + 1
    const novaData = new Date(anoAtual, novoMes, 1)
    setDataCalendario(novaData)
    setDiaSelecionado(new Date(novaData.getFullYear(), novaData.getMonth(), 1))
  }

  // Agendamentos mapeados por dia do mês atual (respeitando os filtros ativos!)
  const agendamentosPorDia = useMemo(() => {
    const mapa: Record<number, Agendamento[]> = {}
    agendamentosFiltrados.forEach((item) => {
      const dt = new Date(item.data_inicio)
      if (!isNaN(dt.getTime()) && dt.getFullYear() === anoAtual && dt.getMonth() === mesAtual) {
        const dia = dt.getDate()
        if (!mapa[dia]) mapa[dia] = []
        mapa[dia].push(item)
      }
    })
    return mapa
  }, [agendamentosFiltrados, anoAtual, mesAtual])

  const eventosDiaSelecionado = useMemo(() => {
    if (!diaSelecionado) return []
    return agendamentosFiltrados.filter((item) => {
      const dt = new Date(item.data_inicio)
      return (
        !isNaN(dt.getTime()) &&
        dt.getFullYear() === diaSelecionado.getFullYear() &&
        dt.getMonth() === diaSelecionado.getMonth() &&
        dt.getDate() === diaSelecionado.getDate()
      )
    })
  }, [agendamentosFiltrados, diaSelecionado])

  const formatarHorario = (iso?: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const formatarDataCompleta = (iso?: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const getStatusBadge = (status?: StatusAgendamento, display?: string) => {
    const textoDisplay = display || status || 'Agendado'
    switch (status) {
      case 'agendado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            <span>{textoDisplay}</span>
          </span>
        )
      case 'em_andamento':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>{textoDisplay}</span>
          </span>
        )
      case 'realizado':
      case 'concluido':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <CheckCheck className="w-3 h-3 text-slate-500" />
            <span>{textoDisplay}</span>
          </span>
        )
      case 'cancelado':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <X className="w-3 h-3 text-rose-500" />
            <span>{textoDisplay}</span>
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
            {textoDisplay}
          </span>
        )
    }
  }

  const renderCardAgendamento = (item: Agendamento) => {
    const fim = getAgendamentoDataFim(item)
    const isPassado = fim.getTime() < agora.getTime()
    const isCancelado = item.status === 'cancelado'
    const meetLink = item.google_meet_link || item.meet_link
    const isSincronizado = item.google_sincronizado || item.google_calendar_status === 'sincronizado'

    return (
      <div
        key={item.id}
        className={`p-5 rounded-3xl border transition-all duration-200 relative ${
          isCancelado
            ? 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 opacity-75'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-sm'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {getStatusBadge(item.status, item.status_display)}
              <span className="text-xs font-black px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                {item.tipo_display || item.tipo}
              </span>
              {item.cliente_nome && (
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {item.cliente_nome}
                </span>
              )}
            </div>

            <h3 className="text-base font-black text-slate-900 dark:text-white pt-1">
              {item.titulo}
            </h3>

            {item.descricao && (
              <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                {item.descricao}
              </p>
            )}
          </div>

          <div className="text-left sm:text-right shrink-0 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700/60">
            <div className="text-xs font-black text-indigo-700 dark:text-indigo-400 capitalize">
              {formatarDataCompleta(item.data_inicio)}
            </div>
            <div className="text-sm font-black text-slate-900 dark:text-white flex items-center sm:justify-end gap-1 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {formatarHorario(item.data_inicio)} - {formatarHorario(item.data_fim)}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">
                ({item.duracao_minutos} min)
              </span>
            </div>
          </div>
        </div>

        {/* Vínculo Operacional (Pedido / Ciclo) */}
        {(item.pedido_protocolo || item.ciclo) && (
          <div className="flex items-center gap-2 mb-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            {item.pedido_protocolo && (
              <Link
                to={`/admin/pedidos/${item.pedido}/analise`}
                className="inline-flex items-center gap-1 font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900 transition"
              >
                <FileText className="w-3 h-3" />
                <span>Pedido #{item.pedido_protocolo}</span>
              </Link>
            )}
            {item.ciclo && (
              <span className="text-slate-500 dark:text-slate-400">
                Ciclo #{item.ciclo}
              </span>
            )}
          </div>
        )}

        {/* Participantes */}
        {item.participantes && item.participantes.length > 0 && (
          <div className="mb-4">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
              Participantes ({item.participantes.length})
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {item.participantes.map((p, idx) => (
                <span
                  key={p.id ?? idx}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300"
                  title={`${p.nome} (${p.email}) - ${p.tipo}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <span>{p.nome}</span>
                  <span className="text-[10px] text-slate-400 font-normal">({p.tipo})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Rodapé e Ações (Meet Link & Cancelar) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            {isSincronizado ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Google Calendar sincronizado</span>
              </span>
            ) : item.google_calendar_status === 'pendente' ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Sincronizando com Google Calendar...</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
                <span>Google Calendar offline</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end flex-wrap">
            {!isCancelado && (
              <>
                {meetLink ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleCopiarLinkMeet(meetLink)}
                      className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                      title="Copiar link da reunião"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <a
                      href={meetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-xs hover:scale-105 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Entrar no Meet</span>
                      <ExternalLink className="w-3 h-3 opacity-80" />
                    </a>
                    <button
                      type="button"
                      onClick={() => abrirModalEditarLink(item)}
                      className="p-2 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-700 transition cursor-pointer"
                      title="Alterar link da reunião"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <a
                      href="https://meet.google.com/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-850 bg-indigo-50/70 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                      title="Abre o Google Meet para iniciar uma nova sala instantânea oficial"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Iniciar Sala Meet</span>
                      <ExternalLink className="w-3 h-3 opacity-70" />
                    </a>
                    <button
                      type="button"
                      onClick={() => abrirModalEditarLink(item)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer flex items-center gap-1.5"
                      title="Definir link da reunião para todos os participantes"
                    >
                      <LinkIcon className="w-3 h-3 text-slate-500" />
                      <span>Definir Link</span>
                    </button>
                  </>
                )}
              </>
            )}

            {!isPassado && !isCancelado && (
              <button
                type="button"
                onClick={() => setAgendamentoParaCancelar(item)}
                className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                title="Cancelar agendamento"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <AppLayout
      contratoSelecionado={contratoUrl}
      onSelectContrato={handleSelectContrato}
    >
      <div className="space-y-6">
        {/* Banner de Contexto de Cliente / Contrato em Foco */}
        {contratoEmFoco && (
          <div className="flex items-center justify-between gap-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 p-3.5 rounded-2xl text-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <span className="text-slate-700 dark:text-slate-300">
                Foco ativo: <strong className="text-slate-900 dark:text-white font-black">{contratoEmFoco.cliente_nome}</strong> • Contrato #{contratoEmFoco.numero}
              </span>
            </div>
            <button
              onClick={() => handleSelectContrato(null)}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Ver todos os clientes
            </button>
          </div>
        )}
        {/* Cabeçalho Superior da Página */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  Agenda de Suporte
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sincronização em tempo real com Google Calendar (`suporte-SHM`) e Google Meet
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAtualizar}
              disabled={isFetching}
              className="px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 font-bold text-xs shadow-2xs transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
              title="Atualizar agenda e sincronização em tempo real"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
              <span className="hidden sm:inline">
                {isFetching ? 'Atualizando...' : 'Atualizar'}
              </span>
            </button>

            <button
              onClick={() => setModalNovoAberto(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Agendamento</span>
            </button>
          </div>
        </div>

        {/* Barra de Abas e Filtros */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-slate-800/80 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          {/* Navegação de Abas */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl">
            <button
              onClick={() => setAbaAtiva('proximas')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                abaAtiva === 'proximas'
                  ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Próximas ({proximosAgendamentos.length})
            </button>
            <button
              onClick={() => setAbaAtiva('calendario')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                abaAtiva === 'calendario'
                  ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Calendário Mensal
            </button>
            <button
              onClick={() => setAbaAtiva('historico')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                abaAtiva === 'historico'
                  ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Histórico ({historicoAgendamentos.length})
            </button>
          </div>

          {/* Filtros e Busca */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                placeholder="Buscar por título, cliente..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-hidden font-medium cursor-pointer"
            >
              <option value="todos">Todos os Tipos</option>
              <option value="alinhamento">Alinhamento de Chamado</option>
              <option value="orcamento">Apresentação de Orçamento</option>
              <option value="homologacao">Homologação e Aceite</option>
              <option value="suporte_emergencial">Suporte Emergencial</option>
              <option value="avulso">Reunião Geral / Avulsa</option>
            </select>

            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-hidden font-medium cursor-pointer"
            >
              <option value="todos">Todos os Status</option>
              <option value="agendado">Agendado</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="realizado">Realizado</option>
              <option value="cancelado">Cancelado</option>
            </select>

            {temFiltrosAtivos && (
              <button
                type="button"
                onClick={handleLimparFiltros}
                className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700 transition cursor-pointer flex items-center gap-1"
                title="Limpar todos os filtros ativos"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>

        {/* Conteúdo Principal de acordo com a Aba */}
        {isLoading ? (
          <div className="p-16 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 text-center flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Carregando agendamentos e sincronização em tempo real...
            </span>
          </div>
        ) : isError ? (
          <div className="p-12 rounded-3xl border border-dashed border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Instabilidade ao carregar a agenda
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Não foi possível sincronizar os agendamentos no momento. Tente novamente ou recarregue a página.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={handleAtualizar}
                disabled={isFetching}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                <span>Tentar Novamente</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {abaAtiva === 'proximas' && (
          <div className="space-y-4">
            {proximosAgendamentos.length === 0 ? (
              <div className="p-12 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {temFiltrosAtivos ? 'Nenhuma reunião encontrada para os filtros' : 'Nenhuma reunião agendada'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  {temFiltrosAtivos
                    ? 'Existem compromissos cadastrados, mas nenhum corresponde aos filtros atuais selecionados.'
                    : 'Não há compromissos futuros cadastrados na agenda corporativa.'}
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  {temFiltrosAtivos && (
                    <button
                      onClick={handleLimparFiltros}
                      className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Limpar Filtros</span>
                    </button>
                  )}
                  <button
                    onClick={handleAtualizar}
                    disabled={isFetching}
                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
                    <span>Atualizar Lista</span>
                  </button>
                  <button
                    onClick={() => setModalNovoAberto(true)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition cursor-pointer"
                  >
                    + Novo Agendamento
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {proximosAgendamentos.map(renderCardAgendamento)}
              </div>
            )}
          </div>
        )}

        {abaAtiva === 'calendario' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Grade do Calendário */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800/80 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-900 dark:text-white capitalize">
                  {MESES[mesAtual]} {anoAtual}
                </h2>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleAtualizar}
                    disabled={isFetching}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer disabled:opacity-60"
                    title="Atualizar eventos do calendário"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
                  </button>
                  <button
                    onClick={() => navegarMes('ant')}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDataCalendario(new Date())}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    Hoje
                  </button>
                  <button
                    onClick={() => navegarMes('prox')}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Dias da Semana */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-black text-slate-400 py-1 border-b border-slate-100 dark:border-slate-700">
                {DIAS_SEMANA.map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              {/* Matriz dos Dias */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: diaSemanaInicio }).map((_, i) => (
                  <div key={`vazio-${i}`} className="h-20 p-1 bg-slate-50/50 dark:bg-slate-900/20 rounded-xl" />
                ))}

                {Array.from({ length: diasNoMes }).map((_, i) => {
                  const dia = i + 1
                  const eventos = agendamentosPorDia[dia] || []
                  const isHoje =
                    agora.getFullYear() === anoAtual &&
                    agora.getMonth() === mesAtual &&
                    agora.getDate() === dia
                  const isSelecionado =
                    diaSelecionado &&
                    diaSelecionado.getFullYear() === anoAtual &&
                    diaSelecionado.getMonth() === mesAtual &&
                    diaSelecionado.getDate() === dia

                  return (
                    <div
                      key={`dia-${dia}`}
                      onClick={() => setDiaSelecionado(new Date(anoAtual, mesAtual, dia))}
                      className={`min-h-[85px] p-1.5 rounded-2xl border transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                        isSelecionado
                          ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-xs'
                          : 'border-slate-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center ${
                            isHoje
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {dia}
                        </span>

                        {eventos.length > 0 && (
                          <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                            {eventos.length}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 mt-1 overflow-hidden">
                        {eventos.slice(0, 2).map((ev) => (
                          <div
                            key={ev.id}
                            className="text-[10px] font-semibold truncate px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-slate-700 text-indigo-900 dark:text-slate-200"
                            title={`${formatarHorario(ev.data_inicio)} - ${ev.titulo}`}
                          >
                            {formatarHorario(ev.data_inicio)} {ev.titulo}
                          </div>
                        ))}
                        {eventos.length > 2 && (
                          <div className="text-[9px] text-slate-400 font-bold px-1">
                            +{eventos.length - 2} mais
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Painel Lateral do Dia Selecionado */}
            <div className="bg-white dark:bg-slate-800/80 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {diaSelecionado
                      ? diaSelecionado.toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          day: '2-digit',
                          month: 'long',
                        })
                      : 'Nenhum dia selecionado'}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {eventosDiaSelecionado.length} reuniões
                  </span>
                </div>
              </div>

              {eventosDiaSelecionado.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Nenhuma reunião agendada para esta data.
                </div>
              ) : (
                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                  {eventosDiaSelecionado.map((item) => {
                    const meetLink = item.google_meet_link || item.meet_link
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                            {formatarHorario(item.data_inicio)} - {formatarHorario(item.data_fim)}
                          </span>
                          {getStatusBadge(item.status, item.status_display)}
                        </div>

                        <h4 className="text-xs font-black text-slate-900 dark:text-white">
                          {item.titulo}
                        </h4>

                        {item.cliente_nome && (
                          <p className="text-[11px] text-slate-500 font-semibold">
                            Cliente: {item.cliente_nome}
                          </p>
                        )}

                        {item.status !== 'cancelado' && (
                          <div className="flex items-center gap-1.5 mt-2">
                            {meetLink ? (
                              <>
                                <a
                                  href={meetLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                                >
                                  <Video className="w-3.5 h-3.5" />
                                  <span>Entrar no Meet</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() => abrirModalEditarLink(item)}
                                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition cursor-pointer"
                                  title="Alterar link da reunião"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <a
                                  href="https://meet.google.com/new"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-850 bg-indigo-50/70 dark:bg-indigo-950/30 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer"
                                  title="Iniciar sala instantânea no Google Meet"
                                >
                                  <Sparkles className="w-3 h-3 text-indigo-500" />
                                  <span>Iniciar Meet</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() => abrirModalEditarLink(item)}
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                                >
                                  <LinkIcon className="w-3 h-3 text-slate-500" />
                                  <span>Link</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {abaAtiva === 'historico' && (
          <div className="space-y-4">
            {historicoAgendamentos.length === 0 ? (
              <div className="p-12 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/30 text-center space-y-3">
                <p className="text-slate-400 text-xs">
                  {temFiltrosAtivos
                    ? 'Nenhum histórico de reunião encontrado para os filtros selecionados.'
                    : 'Não há reuniões anteriores arquivadas no histórico.'}
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  {temFiltrosAtivos && (
                    <button
                      onClick={handleLimparFiltros}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold transition cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Limpar Filtros</span>
                    </button>
                  )}
                  <button
                    onClick={handleAtualizar}
                    disabled={isFetching}
                    className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
                    <span>Atualizar Histórico</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {historicoAgendamentos.map(renderCardAgendamento)}
              </div>
            )}
          </div>
        )}
      </>
    )}
  </div>

      {/* Modal de Criação de Agendamento */}
      <ModalAgendamento
        isOpen={modalNovoAberto}
        onClose={() => setModalNovoAberto(false)}
        clienteId={clienteEmFocoId || undefined}
        clienteNome={clienteEmFocoNome || undefined}
        contratoId={contratoUrl || undefined}
        contratoNumero={contratoEmFoco?.numero || undefined}
        pedidoId={pedidoUrl || undefined}
        onAgendado={() => {
          queryClient.invalidateQueries({ queryKey: ['schedule_agendamentos'] })
          queryClient.invalidateQueries({ queryKey: ['schedule_proxima'] })
        }}
      />

      {/* Modal de Confirmação de Cancelamento */}
      {agendamentoParaCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Cancelar Reunião
                </h3>
                <p className="text-xs text-slate-500">
                  A reunião será cancelada no Google Calendar e os participantes serão avisados.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {agendamentoParaCancelar.titulo}
              </span>
              <p className="text-slate-500">
                {formatarDataCompleta(agendamentoParaCancelar.data_inicio)} às{' '}
                {formatarHorario(agendamentoParaCancelar.data_inicio)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Motivo do Cancelamento:
              </label>
              <textarea
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                placeholder="Ex: Reagendado por solicitação do cliente..."
                rows={3}
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setAgendamentoParaCancelar(null)
                  setMotivoCancelamento('')
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={cancelarMutation.isPending}
                onClick={() => {
                  cancelarMutation.mutate({
                    id: agendamentoParaCancelar.id,
                    motivo: motivoCancelamento,
                  })
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
              >
                {cancelarMutation.isPending ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Definir / Alterar Link da Sala (Meet / Zoom / Teams) */}
      {agendamentoParaEditarLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Link da Sala Virtual
                  </h3>
                  <p className="text-xs text-slate-500">
                    Google Meet, Zoom, Teams ou outra videoconferência.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAgendamentoParaEditarLink(null)
                  setLinkEditando('')
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <div className="font-bold text-slate-800 dark:text-slate-200">
                {agendamentoParaEditarLink.titulo}
              </div>
              <div className="text-slate-500 flex items-center gap-1.5 flex-wrap">
                <span>{formatarDataCompleta(agendamentoParaEditarLink.data_inicio)}</span>
                <span>•</span>
                <span>{formatarHorario(agendamentoParaEditarLink.data_inicio)}</span>
                {agendamentoParaEditarLink.cliente_nome && (
                  <>
                    <span>•</span>
                    <span>{agendamentoParaEditarLink.cliente_nome}</span>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  URL da Sala Virtual:
                </label>
                <a
                  href="https://meet.google.com/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  title="Abre o Google Meet para iniciar uma nova sala instantânea oficial"
                >
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  <span>Criar sala (meet.google.com/new) ↗</span>
                </a>
              </div>
              <input
                type="url"
                value={linkEditando}
                onChange={(e) => setLinkEditando(e.target.value)}
                placeholder="Ex: https://meet.google.com/abc-defg-hij"
                className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono text-slate-800 dark:text-slate-100"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Dica: Você pode clicar em <strong>Criar sala</strong> acima para abrir o Meet oficial na sua conta, copiar a URL da sala e colar aqui. Todos os participantes poderão clicar e entrar na mesma sala.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              {agendamentoParaEditarLink.google_meet_link ? (
                <button
                  type="button"
                  disabled={atualizarLinkMutation.isPending}
                  onClick={() => {
                    atualizarLinkMutation.mutate({
                      id: agendamentoParaEditarLink.id,
                      google_meet_link: null,
                    })
                  }}
                  className="text-xs text-rose-500 hover:underline cursor-pointer"
                >
                  Remover link da sala
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAgendamentoParaEditarLink(null)
                    setLinkEditando('')
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={atualizarLinkMutation.isPending}
                  onClick={() => {
                    atualizarLinkMutation.mutate({
                      id: agendamentoParaEditarLink.id,
                      google_meet_link: linkEditando.trim() || null,
                    })
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {atualizarLinkMutation.isPending ? 'Salvando...' : 'Salvar Link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
