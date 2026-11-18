import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Layers, Inbox, Calendar } from 'lucide-react'
import type { Pedido, StatusPedido } from '../../types'

interface KanbanBoardProps {
  pedidosPorStatus: Record<string, Pedido[]>
  isLoading: boolean
  onAgendarPedido?: (pedido: Pedido) => void
  onNovoPedidoClick?: () => void
}

const COLUNAS: { id: StatusPedido; titulo: string; dot: string; border: string; bg: string }[] = [
  { id: 'aberto', titulo: 'Abertos', dot: 'bg-slate-500', border: 'border-slate-300 dark:border-slate-800', bg: 'bg-slate-100/90 dark:bg-slate-900/40' },
  { id: 'em_orcamento', titulo: 'Em Orçamento', dot: 'bg-indigo-600', border: 'border-indigo-300 dark:border-indigo-900/50', bg: 'bg-indigo-50/70 dark:bg-indigo-950/20' },
  { id: 'aguardando_aprovacao', titulo: 'Ag. Aprovação', dot: 'bg-amber-500 animate-pulse', border: 'border-amber-300 dark:border-amber-900/50', bg: 'bg-amber-50/70 dark:bg-amber-950/20' },
  { id: 'em_execucao', titulo: 'Em Execução', dot: 'bg-blue-600', border: 'border-blue-300 dark:border-blue-900/50', bg: 'bg-blue-50/70 dark:bg-blue-950/20' },
  { id: 'aguardando_aceite', titulo: 'Ag. Aceite', dot: 'bg-purple-600 animate-pulse', border: 'border-purple-300 dark:border-purple-900/50', bg: 'bg-purple-50/70 dark:bg-purple-950/20' },
  { id: 'concluido', titulo: 'Concluídos', dot: 'bg-emerald-600', border: 'border-emerald-300 dark:border-emerald-900/50', bg: 'bg-emerald-50/70 dark:bg-emerald-950/20' },
]

export function KanbanBoard({ pedidosPorStatus = {}, isLoading, onAgendarPedido, onNovoPedidoClick }: KanbanBoardProps) {
  const navigate = useNavigate()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isMouseDownRef = useRef(false)
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)
  const scrollLeftRef = useRef(0)
  const hasMovedRef = useRef(false)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button, a, select, input, textarea')) return

    isMouseDownRef.current = true
    hasMovedRef.current = false
    startXRef.current = e.pageX - (scrollContainerRef.current?.offsetLeft || 0)
    scrollLeftRef.current = scrollContainerRef.current?.scrollLeft || 0
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current || !scrollContainerRef.current) return
    const x = e.pageX - scrollContainerRef.current.offsetLeft
    const walk = x - startXRef.current
    if (Math.abs(walk) > 4) {
      if (!isDragging) setIsDragging(true)
      hasMovedRef.current = true
    }
    if (hasMovedRef.current) {
      scrollContainerRef.current.scrollLeft = scrollLeftRef.current - walk
    }
  }

  const handleMouseUp = () => {
    if (isMouseDownRef.current) {
      isMouseDownRef.current = false
      setIsDragging(false)
      setTimeout(() => {
        hasMovedRef.current = false
      }, 50)
    }
  }

  const handleMouseLeave = () => {
    if (isMouseDownRef.current) {
      isMouseDownRef.current = false
      setIsDragging(false)
      setTimeout(() => {
        hasMovedRef.current = false
      }, 50)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full space-y-6">
      {/* Header Title & Top Actions */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Painel de Pedidos
          </h1>
        </div>

        <button
          onClick={() => {
            if (onNovoPedidoClick) {
              onNovoPedidoClick()
            } else {
              navigate('/pedidos/novo')
            }
          }}
          className="px-5 py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Pedido</span>
        </button>
      </div>

      {/* 6-Column Kanban Grid */}
      <div
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className={`flex gap-3.5 items-start overflow-x-auto pb-6 pt-1 select-none w-full ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {COLUNAS.map((col) => {
          const colData = pedidosPorStatus ? pedidosPorStatus[col.id] : []
          const pedidos = Array.isArray(colData) ? colData : []

          return (
            <div
              key={col.id}
              className={`flex-1 min-w-[260px] rounded-3xl border ${col.border} ${col.bg} p-3.5 flex flex-col min-h-[550px] shadow-xs shrink-0 transition-colors`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1 pt-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${col.dot}`} />
                  <span className="font-black text-xs text-slate-900 dark:text-slate-200 uppercase tracking-wider truncate">
                    {col.titulo}
                  </span>
                </div>
                <span className="text-[11px] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 px-2 py-0.5 rounded-full font-black border border-slate-300 dark:border-slate-700 shadow-xs shrink-0 ml-1.5">
                  {pedidos.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="space-y-2.5 flex-1">
                {pedidos.map((p) => {
                  const ciclos = Array.isArray(p.ciclos_resumo) ? p.ciclos_resumo : []
                  const totalHorasRealizadas = ciclos.reduce((acc, c) => acc + (Number(c.horas_realizadas) || 0), 0)
                  const totalHorasEstimadas = ciclos.reduce((acc, c) => acc + (Number(c.horas_estimadas) || 0), 0)

                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        if (hasMovedRef.current) return
                        navigate(`/pedidos/${p.id}`)
                      }}
                      className={`bg-white dark:bg-slate-800/90 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md dark:hover:shadow-indigo-500/10 transition-all duration-200 ${
                        isDragging ? 'cursor-grabbing' : 'cursor-pointer'
                      } group hover:-translate-y-0.5 relative overflow-hidden`}
                    >
                      <div className="flex items-center justify-between gap-1.5 mb-2 min-w-0">
                        <span
                          className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-700/70 text-slate-900 dark:text-slate-200 px-1.5 py-0.5 rounded-md border border-slate-300 dark:border-slate-600 truncate shrink min-w-0"
                          title={p.protocolo}
                        >
                          {p.protocolo}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {onAgendarPedido && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onAgendarPedido(p)
                              }}
                              className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition cursor-pointer"
                              title="Agendar reunião para este chamado"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                              p.prioridade === 'urgente'
                                ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60'
                                : p.prioridade === 'alta'
                                ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60'
                                : p.prioridade === 'media'
                                ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800/60'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {p.prioridade_display}
                          </span>
                        </div>
                      </div>

                      <h3 className="font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100 line-clamp-2 mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition leading-snug">
                        {p.assunto}
                      </h3>

                      <div className="text-[10px] text-slate-600 dark:text-slate-400 font-medium mb-2.5 flex items-center justify-between gap-1">
                        <span className="truncate max-w-[110px] font-bold text-slate-700 dark:text-slate-300" title={p.contrato_numero}>
                          {p.contrato_numero}
                        </span>
                        <span className="shrink-0 font-semibold text-slate-500 dark:text-slate-400">{p.criado_em ? new Date(p.criado_em).toLocaleDateString('pt-BR') : '-'}</span>
                      </div>

                      {ciclos.length > 0 && (
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-xs gap-1">
                          <span className="flex items-center gap-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">
                            <Layers className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span className="truncate">{ciclos.length} ciclo{ciclos.length > 1 ? 's' : ''}</span>
                          </span>
                          <span className="text-[10px] font-black text-indigo-800 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50 px-2 py-0.5 rounded-full shrink-0">
                            {totalHorasRealizadas > 0 ? `${totalHorasRealizadas.toFixed(1)}h gastas` : `${totalHorasEstimadas.toFixed(1)}h Estimadas`}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}

                {pedidos.length === 0 && !isLoading && (
                  <div className="h-32 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs space-y-2 font-medium bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700/60 m-1">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700/50 flex items-center justify-center">
                      <Inbox className="w-4 h-4 text-slate-500 dark:text-slate-400 stroke-[2]" />
                    </div>
                    <span className="italic">Nenhum pedido nesta fase</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}