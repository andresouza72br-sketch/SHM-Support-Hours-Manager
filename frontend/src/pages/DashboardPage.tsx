import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AppLayout } from '../components/layout/AppLayout'
import { KanbanBoard } from '../components/kanban/KanbanBoard'
import { ProximaReuniaoWidget } from '../components/dashboard/ProximaReuniaoWidget'
import { ModalAgendamento } from '../components/schedule/ModalAgendamento'
import { NovoPedidoModal } from '../components/pedidos/NovoPedidoModal'
import { clientService } from '../api/client'
import type { Pedido, Contrato } from '../types'

export function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const contratoSelecionado = searchParams.get('contrato') ? Number(searchParams.get('contrato')) : null

  const [modalAgendamentoOpen, setModalAgendamentoOpen] = useState(false)
  const [pedidoParaAgendar, setPedidoParaAgendar] = useState<Pedido | null>(null)
  const [novoPedidoModalOpen, setNovoPedidoModalOpen] = useState(false)

  // Detecta requisição de abertura do modal via URL (ex: ?novo=true)
  useEffect(() => {
    if (searchParams.get('novo') === 'true' || searchParams.get('novo_pedido') === 'true') {
      setNovoPedidoModalOpen(true)
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('novo')
      newParams.delete('novo_pedido')
      setSearchParams(newParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const handleSelectContrato = (id: number | null) => {
    const newParams = new URLSearchParams(searchParams)
    if (id) {
      newParams.set('contrato', String(id))
    } else {
      newParams.delete('contrato')
    }
    setSearchParams(newParams)
  }

  const { data: contratosRaw = [] } = useQuery({
    queryKey: ['contratos'],
    queryFn: () => clientService.contratos.list(),
  })
  const contratos: Contrato[] = Array.isArray(contratosRaw) ? contratosRaw : []

  const contratoEmFoco = useMemo(() => {
    if (!contratoSelecionado) return null
    return contratos.find((c) => c.id === contratoSelecionado) || null
  }, [contratos, contratoSelecionado])

  const { data: kanbanData = {}, isLoading } = useQuery({
    queryKey: ['kanban', contratoSelecionado],
    queryFn: () => clientService.pedidos.kanban(contratoSelecionado || undefined),
    refetchInterval: 5000,
  })

  return (
    <AppLayout
      contratoSelecionado={contratoSelecionado}
      onSelectContrato={handleSelectContrato}
    >
      <div className="space-y-6">
        <ProximaReuniaoWidget
          onNovoAgendamentoClick={() => {
            setPedidoParaAgendar(null)
            setModalAgendamentoOpen(true)
          }}
        />

        <KanbanBoard
          pedidosPorStatus={kanbanData}
          isLoading={isLoading}
          onAgendarPedido={(pedido) => {
            setPedidoParaAgendar(pedido)
            setModalAgendamentoOpen(true)
          }}
          onNovoPedidoClick={() => setNovoPedidoModalOpen(true)}
        />
      </div>

      {/* Modal de Novo Pedido sobrepondo o Kanban */}
      <NovoPedidoModal
        isOpen={novoPedidoModalOpen}
        onClose={() => setNovoPedidoModalOpen(false)}
        contratoInicialId={contratoSelecionado}
      />

      {/* Modal de Agendamento reconhecendo o cliente/pedido em foco */}
      <ModalAgendamento
        isOpen={modalAgendamentoOpen}
        onClose={() => {
          setModalAgendamentoOpen(false)
          setPedidoParaAgendar(null)
        }}
        clienteId={pedidoParaAgendar?.cliente || contratoEmFoco?.cliente || undefined}
        clienteNome={pedidoParaAgendar?.cliente_nome || contratoEmFoco?.cliente_nome || undefined}
        contratoId={pedidoParaAgendar?.contrato || contratoSelecionado || undefined}
        contratoNumero={pedidoParaAgendar?.contrato_numero || contratoEmFoco?.numero || undefined}
        pedidoId={pedidoParaAgendar?.id || undefined}
        pedidoProtocolo={pedidoParaAgendar?.protocolo || undefined}
        pedidoAssunto={pedidoParaAgendar?.assunto || undefined}
        tipoSugerido="alinhamento"
        onAgendado={() => {
          queryClient.invalidateQueries({ queryKey: ['schedule_proxima'] })
          queryClient.invalidateQueries({ queryKey: ['schedule_agendamentos'] })
        }}
      />
    </AppLayout>
  )
}