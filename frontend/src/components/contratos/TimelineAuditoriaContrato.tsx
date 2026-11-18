import { useState, useMemo, useRef, useEffect } from 'react'
import {
  FileText,
  Download,
  Upload,
  Trash2,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertOctagon,
  Clock,
  User as UserIcon,
  Globe,
  FileEdit,
  Printer,
  Fingerprint,
  Star,
  Search,
  X,
  Layers,
  XCircle,
  RefreshCw,
  Link2,
  Binary,
  Copy,
  Check,
} from 'lucide-react'
import type { ContratoAuditLog, ForensicAuditLog, AuditIntegrityVerification } from '../../types'
import { clientService } from '../../api/client'
interface TimelineAuditoriaContratoProps {
  logs: ContratoAuditLog[]
  isLoading?: boolean
  contratoId?: number
}

type CategoriaEvento = 'todas' | 'documentos' | 'governanca' | 'notificacoes' | 'relatorios'

const EVENTOS_POR_CATEGORIA: Record<CategoriaEvento, string[]> = {
  todas: [],
  documentos: ['upload_documento', 'download_documento', 'exclusao_documento'],
  governanca: ['criacao', 'aceite', 'alteracao', 'conclusao', 'cancelamento', 'avaliacao_ciclo'],
  notificacoes: ['atualizacao_emails', 'convite_email', 'confirmacao_email', 'recusa_email'],
  relatorios: ['download_relatorio'],
}

function getEventIcon(tipo: string) {
  switch (tipo) {
    case 'criacao':
      return <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
    case 'aceite':
      return <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
    case 'upload_documento':
      return <Upload className="w-4 h-4 text-sky-600 dark:text-sky-400" />
    case 'download_documento':
      return <Download className="w-4 h-4 text-teal-600 dark:text-teal-400" />
    case 'download_relatorio':
      return <Printer className="w-4 h-4 text-purple-600 dark:text-purple-400" />
    case 'exclusao_documento':
      return <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
    case 'atualizacao_emails':
    case 'convite_email':
      return <Mail className="w-4 h-4 text-violet-600 dark:text-violet-400" />
    case 'confirmacao_email':
      return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
    case 'recusa_email':
      return <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
    case 'conclusao':
      return <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
    case 'cancelamento':
      return <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400" />
    case 'alteracao':
      return <FileEdit className="w-4 h-4 text-amber-600 dark:text-amber-400" />
    case 'avaliacao_ciclo':
      return <Star className="w-4 h-4 text-amber-500 dark:text-amber-400" />
    default:
      return <Clock className="w-4 h-4 text-slate-500" />
  }
}

function getEventBadgeColor(tipo: string) {
  switch (tipo) {
    case 'criacao':
      return 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
    case 'aceite':
      return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    case 'upload_documento':
      return 'bg-sky-50 dark:bg-sky-950/50 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800'
    case 'download_documento':
      return 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800'
    case 'download_relatorio':
      return 'bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
    case 'exclusao_documento':
      return 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
    case 'atualizacao_emails':
    case 'convite_email':
      return 'bg-violet-50 dark:bg-violet-950/50 text-violet-800 dark:text-violet-300 border-violet-200 dark:border-violet-800'
    case 'confirmacao_email':
      return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    case 'recusa_email':
      return 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
    case 'conclusao':
      return 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    case 'cancelamento':
      return 'bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-800'
    case 'avaliacao_ciclo':
      return 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
  }
}

export function TimelineAuditoriaContrato({ logs = [], isLoading = false, contratoId }: TimelineAuditoriaContratoProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoria, setCategoria] = useState<CategoriaEvento>('todas')
  const timelineContainerRef = useRef<HTMLDivElement>(null)

  // Estado Pericial de Integridade Criptográfica (SHA-256)
  const [verificacao, setVerificacao] = useState<AuditIntegrityVerification | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [trilhaForense, setTrilhaForense] = useState<ForensicAuditLog[]>([])
  const [exibirForense, setExibirForense] = useState(false)
  const [loadingForense, setLoadingForense] = useState(false)
  const [copiedHash, setCopiedHash] = useState<string | null>(null)

  const handleVerificarIntegridade = async () => {
    if (!contratoId) return
    setIsVerifying(true)
    try {
      const res = await clientService.contratos.verificarIntegridade(contratoId)
      setVerificacao(res)
    } catch (err: any) {
      if (err?.response?.data) {
        setVerificacao(err.response.data)
      } else {
        setVerificacao({
          status: 'rompido',
          mensagem: 'Falha na comunicação com o serviço de verificação pericial.',
          verificado_em: new Date().toISOString(),
        })
      }
    } finally {
      setIsVerifying(false)
    }
  }

  const handleToggleForense = async () => {
    if (!exibirForense && trilhaForense.length === 0 && contratoId) {
      setLoadingForense(true)
      try {
        const forensicData = await clientService.contratos.trilhaForense(contratoId)
        setTrilhaForense(forensicData)
      } catch (err) {
        console.error('Falha ao carregar trilha forense:', err)
      } finally {
        setLoadingForense(false)
      }
    }
    setExibirForense((prev) => !prev)
  }

  useEffect(() => {
    if (contratoId) {
      handleVerificarIntegridade()
    }
  }, [contratoId])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedHash(text)
    setTimeout(() => setCopiedHash(null), 2000)
  }

  // Se exibirForense estiver ativo e houver trilha forense carregada, mapeia para o formato de exibição
  const logsAtivos = useMemo(() => {
    if (exibirForense && trilhaForense.length > 0) {
      return trilhaForense.map((fl) => ({
        id: fl.id as any,
        contrato: (fl.contrato || 0) as any,
        tipo_evento: fl.tipo_evento,
        tipo_evento_display: fl.tipo_evento_display || fl.tipo_evento,
        descricao: fl.descricao,
        justificativa: fl.justificativa,
        usuario_nome: fl.usuario_nome,
        usuario_role: fl.usuario_role,
        ip_origem: fl.ip_origem,
        user_agent: fl.user_agent,
        timestamp: fl.timestamp,
        documento_nome: null,
        documento_hash: fl.payload_hash,
        // Metadados específicos periciais
        _sequencia: fl.sequencia,
        _previous_hash: fl.previous_hash,
        _current_hash: fl.current_hash,
        _nivel: fl.nivel_relevancia,
      }))
    }
    return logs
  }, [exibirForense, trilhaForense, logs])

  // Contagem por categoria
  const contagens = useMemo(() => {
    const counts: Record<CategoriaEvento, number> = {
      todas: logsAtivos.length,
      documentos: 0,
      governanca: 0,
      notificacoes: 0,
      relatorios: 0,
    }

    logsAtivos.forEach((log) => {
      const tipo = log.tipo_evento
      if (EVENTOS_POR_CATEGORIA.documentos.includes(tipo)) counts.documentos += 1
      if (EVENTOS_POR_CATEGORIA.governanca.includes(tipo)) counts.governanca += 1
      if (EVENTOS_POR_CATEGORIA.notificacoes.includes(tipo)) counts.notificacoes += 1
      if (EVENTOS_POR_CATEGORIA.relatorios.includes(tipo)) counts.relatorios += 1
    })

    return counts
  }, [logsAtivos])

  // Filtragem combinada por categoria e termo de busca
  const logsFiltrados = useMemo(() => {
    return logsAtivos.filter((log) => {
      // Filtro de Categoria
      if (categoria !== 'todas') {
        const permitidos = EVENTOS_POR_CATEGORIA[categoria]
        if (!permitidos.includes(log.tipo_evento)) {
          return false
        }
      }

      // Filtro de Busca Textual
      if (searchTerm.trim()) {
        const termo = searchTerm.toLowerCase().trim()
        const matchDescricao = log.descricao?.toLowerCase().includes(termo)
        const matchDocNome = log.documento_nome?.toLowerCase().includes(termo)
        const matchJustificativa = log.justificativa?.toLowerCase().includes(termo)
        const matchUsuario = log.usuario_nome?.toLowerCase().includes(termo)
        const matchRole = log.usuario_role?.toLowerCase().includes(termo)
        const matchIp = log.ip_origem?.toLowerCase().includes(termo)
        const matchHash = log.documento_hash?.toLowerCase().includes(termo)
        const matchTipoDisplay = log.tipo_evento_display?.toLowerCase().includes(termo)

        if (
          !matchDescricao &&
          !matchDocNome &&
          !matchJustificativa &&
          !matchUsuario &&
          !matchRole &&
          !matchIp &&
          !matchHash &&
          !matchTipoDisplay
        ) {
          return false
        }
      }

      return true
    })
  }, [logsAtivos, categoria, searchTerm])

  if (isLoading) {
    return <div className="p-6 text-center text-xs text-slate-500 italic">Carregando trilha de auditoria...</div>
  }

  if (logs.length === 0 && !contratoId) {
    return (
      <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
        Nenhum registro de auditoria disponível para este contrato.
      </div>
    )
  }

  const temFiltroAtivo = Boolean(searchTerm.trim() || categoria !== 'todas')

  const categoriasConfig: { id: CategoriaEvento; label: string; icon: React.ReactNode }[] = [
    { id: 'todas', label: 'Todos', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'documentos', label: 'Documentos', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'governanca', label: 'Governança', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { id: 'notificacoes', label: 'E-mails', icon: <Mail className="w-3.5 h-3.5" /> },
    { id: 'relatorios', label: 'Relatórios', icon: <Printer className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="space-y-4">
      {/* Selo Pericial de Integridade Criptográfica (RN-16) */}
      {contratoId && (
        <div
          className={`p-4 rounded-2xl border transition-all ${
            verificacao?.status === 'integro'
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 shadow-xs'
              : verificacao?.status === 'rompido'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div
                className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${
                  verificacao?.status === 'integro'
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                    : verificacao?.status === 'rompido'
                    ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {isVerifying ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : verificacao?.status === 'integro' ? (
                  <ShieldCheck className="w-5 h-5" />
                ) : (
                  <AlertOctagon className="w-5 h-5" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    {verificacao?.status === 'integro'
                      ? 'Trilha Pericial 100% Íntegra'
                      : verificacao?.status === 'rompido'
                      ? 'Alerta Pericial: Cadeia Rompida'
                      : 'Verificação Criptográfica da Cadeia'}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 font-bold">
                    RFC 8785 • SHA-256
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  {verificacao?.mensagem || 'Aguardando verificação matemática dos elos periciais...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={handleToggleForense}
                disabled={loadingForense}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${
                  exibirForense
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Binary className="w-3.5 h-3.5" />
                <span>{exibirForense ? 'Modo Normal' : 'Ver Elos Forenses'}</span>
              </button>

              <button
                type="button"
                onClick={handleVerificarIntegridade}
                disabled={isVerifying}
                title="Recalcular dispersões canônicas de toda a partição"
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                <span>{isVerifying ? 'Verificando...' : 'Re-verificar'}</span>
              </button>
            </div>
          </div>

          {verificacao && verificacao.status === 'integro' && (
            <div className="mt-3 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/40 flex flex-wrap items-center gap-4 text-[11px] font-mono text-emerald-800 dark:text-emerald-300">
              <span>
                <strong>Registros Verificados:</strong> {verificacao.total_registros_verificados ?? logs.length}
              </span>
              {verificacao.tempo_verificacao_ms !== undefined && (
                <span>
                  <strong>Tempo:</strong> {verificacao.tempo_verificacao_ms} ms
                </span>
              )}
              {verificacao.ultimo_hash && (
                <span className="flex items-center gap-1">
                  <strong>Último Elo:</strong>
                  <span className="bg-emerald-100/70 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded text-[10px]">
                    {verificacao.ultimo_hash.substring(0, 16)}...{verificacao.ultimo_hash.substring(verificacao.ultimo_hash.length - 8)}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(verificacao.ultimo_hash!)}
                    className="p-1 hover:text-emerald-950 dark:hover:text-white transition cursor-pointer"
                    title="Copiar Hash Completo SHA-256"
                  >
                    {copiedHash === verificacao.ultimo_hash ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Barra de Filtros e Busca */}
      <div className="space-y-3 p-3.5 bg-slate-50/80 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/70">
        {/* Campo de Busca Textual */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por termo, documento, usuário, IP ou justificativa..."
            className="w-full pl-10 pr-10 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition shadow-2xs"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Chips de Categoria */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {categoriasConfig.map((cat) => {
              const isSelected = categoria === cat.id
              const count = contagens[cat.id]
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoria(cat.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/25 border border-indigo-600'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                  <span
                    className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Status / Ação de Limpar */}
          {temFiltroAtivo && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {logsFiltrados.length} de {logs.length} {logs.length === 1 ? 'registro' : 'registros'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setCategoria('todas')
                }}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lista da Trilha de Auditoria */}
      {logsFiltrados.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Nenhum evento encontrado para os critérios de busca selecionados.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('')
              setCategoria('todas')
            }}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            Limpar filtros e ver todos os registros
          </button>
        </div>
      ) : (
        <div className="relative">
          <div
            ref={timelineContainerRef}
            className="max-h-[385px] overflow-y-auto pr-3 pl-6 space-y-4 relative before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scroll-smooth"
          >
          {logsFiltrados.map((log) => {
            const icon = getEventIcon(log.tipo_evento)
            const badgeColor = getEventBadgeColor(log.tipo_evento)
            const dataObj = new Date(log.timestamp)
            const dataFormatada = dataObj.toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })

            return (
              <div key={log.id} className="relative group">
                {/* Timeline Dot */}
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-600 dark:border-indigo-400 flex items-center justify-center shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xs transition">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border flex items-center gap-1.5 ${badgeColor}`}>
                        {icon}
                        <span>{log.tipo_evento_display}</span>
                      </span>
                      {log.documento_nome && (
                        <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                          {log.documento_nome}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                      {dataFormatada}
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed mb-2">
                    {log.descricao}
                  </p>

                  {/* Se houver justificativa (Cancelamento / Decisão / Exclusão) */}
                  {log.justificativa && (
                    <div className="mt-2 p-3 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-900 dark:text-rose-200 shadow-2xs">
                      <span className="font-bold text-[11px] font-mono block uppercase tracking-wider mb-0.5 text-rose-700 dark:text-rose-400">Justificativa Formal:</span>
                      <p className="italic">{log.justificativa}</p>
                    </div>
                  )}

                  {/* Elo Criptográfico Pericial (SHA-256 Chained Hash) */}
                  {((log as any)._previous_hash || (log as any)._current_hash) && (
                    <div className="mt-2.5 p-2.5 bg-slate-900 text-slate-200 rounded-xl font-mono text-[10px] space-y-1.5 border border-slate-800 shadow-inner">
                      <div className="flex items-center justify-between text-indigo-400 font-bold border-b border-slate-800 pb-1">
                        <span className="flex items-center gap-1.5">
                          <Link2 className="w-3 h-3 text-indigo-400" />
                          <span>Elo Pericial #{(log as any)._sequencia}</span>
                        </span>
                        {(log as any)._nivel && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                              (log as any)._nivel === 'N1'
                                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                : (log as any)._nivel === 'N2'
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {(log as any)._nivel}
                          </span>
                        )}
                      </div>

                      <div className="space-y-0.5 text-[11px] font-mono">
                        <div className="flex items-center gap-1.5 text-slate-400 truncate">
                          <span className="text-slate-500 font-semibold w-16 shrink-0">Previous:</span>
                          <span className="truncate" title={(log as any)._previous_hash}>
                            {(log as any)._previous_hash}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-400 truncate font-semibold">
                          <span className="text-emerald-500 font-bold w-16 shrink-0">Current:</span>
                          <span className="truncate" title={(log as any)._current_hash}>
                            {(log as any)._current_hash}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Metadados Forenses (Usuário, IP, SHA-256) */}
                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-bold">
                      <UserIcon className="w-3 h-3 text-slate-400" />
                      <span>{log.usuario_nome || 'Sistema'}</span>
                      {log.usuario_role && <span className="font-normal">({log.usuario_role})</span>}
                    </span>

                    {log.ip_origem && (
                      <span className="flex items-center gap-1 font-mono">
                        <Globe className="w-3 h-3 text-slate-400" />
                        <span>IP: {log.ip_origem}</span>
                      </span>
                    )}

                    {log.documento_hash && (
                      <span
                        className="flex items-center gap-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700"
                        title={`SHA-256: ${log.documento_hash}`}
                      >
                        <Fingerprint className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>
                          SHA-256: {log.documento_hash.substring(0, 8)}...{log.documento_hash.substring(log.documento_hash.length - 8)}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(log.documento_hash!)}
                          className="p-0.5 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                          title="Copiar Hash Completo SHA-256"
                        >
                          {copiedHash === log.documento_hash ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          </div>
        </div>
      )}
    </div>
  )
}
