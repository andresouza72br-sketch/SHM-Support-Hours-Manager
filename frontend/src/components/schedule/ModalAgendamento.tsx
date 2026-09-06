import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  X,
  Calendar,
  Clock,
  Video,
  Users,
  Plus,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
  Building2,
  Sparkles,
  RotateCcw,
  Check,
  UserPlus,
  Mail,
  Briefcase,
  Search,
  ExternalLink,
} from 'lucide-react'
import { clientService } from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import type {
  Agendamento,
  TipoEventoSchedule,
  TipoParticipanteSchedule,
  Cliente,
  Contrato,
  Pedido,
  User,
  ClienteUser,
  EmailNotificacao,
} from '../../types'

export interface ModalAgendamentoProps {
  isOpen: boolean
  onClose: () => void
  onAgendado?: (agendamento: Agendamento) => void
  clienteId?: number
  clienteNome?: string
  contratoId?: number
  contratoNumero?: string
  pedidoId?: number
  pedidoProtocolo?: string
  pedidoAssunto?: string
  cicloId?: number
  cicloTipo?: string
  tipoSugerido?: TipoEventoSchedule
  tituloSugerido?: string
  pautaSugerida?: string
  participantesSugeridos?: Array<{ email: string; nome: string; tipo?: TipoParticipanteSchedule }>
}

export interface PresetReuniao {
  rotulo: string
  tituloPadrao: string
  gerarTitulo: (ctx: {
    clienteNome?: string
    contratoNumero?: string
    pedidoProtocolo?: string
    pedidoAssunto?: string
    isCliente?: boolean
  }) => string
  pautaPadrao: string
}

export const PRESETS_REUNIAO: Record<TipoEventoSchedule, PresetReuniao> = {
  alinhamento: {
    rotulo: 'Alinhamento de Chamado',
    tituloPadrao: 'Alinhamento de Chamado',
    gerarTitulo: ({ clienteNome, pedidoProtocolo, pedidoAssunto, isCliente }) => {
      if (pedidoProtocolo) {
        return `Alinhamento de Chamado - ${pedidoProtocolo}${pedidoAssunto ? ` (${pedidoAssunto})` : ''}`
      }
      if (isCliente) {
        return `Solicitação de Alinhamento - ${clienteNome || 'Cliente'}`
      }
      return clienteNome ? `Alinhamento de Suporte - ${clienteNome}` : 'Reunião de Alinhamento de Chamado'
    },
    pautaPadrao: `1. Revisão do escopo e requisitos da demanda\n2. Alinhamento de prioridades e prazos esperados\n3. Esclarecimento de dúvidas técnicas mútuas\n4. Definição dos próximos passos e responsáveis`,
  },
  orcamento: {
    rotulo: 'Apresentação de Orçamento',
    tituloPadrao: 'Apresentação de Orçamento',
    gerarTitulo: ({ clienteNome, pedidoProtocolo, contratoNumero }) => {
      if (pedidoProtocolo) {
        return `Apresentação de Orçamento - ${pedidoProtocolo}`
      }
      if (contratoNumero) {
        return `Apresentação de Orçamento - Contrato ${contratoNumero}`
      }
      return clienteNome ? `Apresentação de Orçamento - ${clienteNome}` : 'Apresentação de Orçamento e Escopo'
    },
    pautaPadrao: `1. Apresentação da proposta técnica e detalhamento da solução\n2. Estimativa de horas de desenvolvimento e impacto no saldo do contrato\n3. Prazos previstos de entrega e cronograma de execução\n4. Esclarecimento de dúvidas para aprovação formal`,
  },
  homologacao: {
    rotulo: 'Homologação e Aceite',
    tituloPadrao: 'Sessão de Homologação e Aceite',
    gerarTitulo: ({ clienteNome, pedidoProtocolo }) => {
      if (pedidoProtocolo) {
        return `Sessão de Homologação / Aceite - ${pedidoProtocolo}`
      }
      return clienteNome ? `Homologação e Validação de Entregas - ${clienteNome}` : 'Sessão de Homologação e Aceite de Entrega'
    },
    pautaPadrao: `1. Demonstração prática das funcionalidades implementadas\n2. Navegação guiada e testes conjuntos no ambiente de homologação\n3. Validação dos critérios de aceite acordados\n4. Registro de eventuais ajustes ou coleta de aceite final`,
  },
  suporte_emergencial: {
    rotulo: 'Suporte Emergencial',
    tituloPadrao: 'Plantão de Suporte Emergencial',
    gerarTitulo: ({ clienteNome, pedidoProtocolo, isCliente }) => {
      if (pedidoProtocolo) {
        return `Plantão Emergencial - Chamado ${pedidoProtocolo}`
      }
      if (isCliente) {
        return `Solicitação de Suporte Crítico - ${clienteNome || 'Cliente'}`
      }
      return clienteNome ? `Plantão de Suporte Emergencial - ${clienteNome}` : 'Plantão de Atendimento Emergencial'
    },
    pautaPadrao: `1. Diagnóstico do incidente crítico e indisponibilidade\n2. Avaliação de impacto imediato na operação\n3. Aplicação de medidas de contenção / contorno imediato\n4. Plano de ação para correção definitiva da causa raiz`,
  },
  avulso: {
    rotulo: 'Reunião Geral / Avulsa',
    tituloPadrao: 'Reunião Geral de Acompanhamento',
    gerarTitulo: ({ clienteNome, contratoNumero, isCliente }) => {
      if (isCliente) {
        return `Solicitação de Reunião com Suporte - ${clienteNome || 'Cliente'}`
      }
      if (clienteNome) {
        return `Reunião Geral de Acompanhamento - ${clienteNome}`
      }
      if (contratoNumero) {
        return `Alinhamento Geral - Contrato ${contratoNumero}`
      }
      return 'Reunião Geral de Acompanhamento'
    },
    pautaPadrao: `1. Pauta aberta para alinhamento geral entre equipes\n2. Status dos chamados em andamento e saldo contratual\n3. Levantamento de novas demandas e oportunidades de melhoria`,
  },
}

export const ModalAgendamento: React.FC<ModalAgendamentoProps> = ({
  isOpen,
  onClose,
  onAgendado,
  clienteId,
  clienteNome,
  contratoId,
  contratoNumero,
  pedidoId,
  pedidoProtocolo,
  pedidoAssunto,
  cicloId,
  cicloTipo,
  tipoSugerido = 'alinhamento',
  tituloSugerido,
  pautaSugerida,
  participantesSugeridos,
}) => {
  const { user, isEmpresa, isCliente } = useAuth()
  const wasOpenRef = useRef(false)

  // Seleções de contexto
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null)
  const [selectedContratoId, setSelectedContratoId] = useState<number | null>(null)
  const [selectedPedidoId, setSelectedPedidoId] = useState<number | null>(null)

  // Campos do formulário
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tipo, setTipo] = useState<TipoEventoSchedule>(tipoSugerido)
  const [dataInicio, setDataInicio] = useState('')
  const [duracaoMinutos, setDuracaoMinutos] = useState(45)
  const [sincronizarGoogle, setSincronizarGoogle] = useState(true)
  const [googleMeetLink, setGoogleMeetLink] = useState('')

  // Participantes convocados
  const [participantes, setParticipantes] = useState<
    Array<{ email: string; nome: string; tipo: TipoParticipanteSchedule }>
  >([])

  // Aba ativa no seletor de participantes
  const [abaParticipantes, setAbaParticipantes] = useState<'cliente' | 'empresa' | 'contrato' | 'outros'>('cliente')
  const [buscaParticipante, setBuscaParticipante] = useState('')

  // Formulário para convidar outros
  const [outroNome, setOutroNome] = useState('')
  const [outroEmail, setOutroEmail] = useState('')
  const [outroTipo, setOutroTipo] = useState<TipoParticipanteSchedule>('convidado')

  // Feedback
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<Agendamento | null>(null)

  // 1. Consultas de Apoio: Contratos e Clientes
  const { data: contratosRaw = [] } = useQuery({
    queryKey: ['contratos'],
    queryFn: () => clientService.contratos.list(),
    enabled: isOpen,
    staleTime: 30000,
  })
  const contratos: Contrato[] = Array.isArray(contratosRaw) ? contratosRaw : []

  const { data: clientesRaw = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => clientService.clientes.list(),
    enabled: isOpen && Boolean(isEmpresa),
    staleTime: 30000,
  })
  const clientes: Cliente[] = Array.isArray(clientesRaw) ? clientesRaw : []

  // 2. Pedidos abertos para seleção opcional
  const { data: pedidosRaw = [] } = useQuery({
    queryKey: ['pedidos_selecao_modal', selectedClienteId, selectedContratoId],
    queryFn: () =>
      clientService.pedidos.list({
        cliente: selectedClienteId || undefined,
        contrato: selectedContratoId || undefined,
      }),
    enabled: isOpen && Boolean(selectedClienteId),
    staleTime: 15000,
  })
  const pedidos: Pedido[] = Array.isArray(pedidosRaw) ? pedidosRaw : []

  // 3. Usuários do sistema (para Equipe SHM / Empresa)
  const { data: todosUsuariosRaw = [] } = useQuery({
    queryKey: ['usuarios_sistema'],
    queryFn: () => clientService.auth.users(),
    enabled: isOpen,
    staleTime: 60000,
  })
  const todosUsuarios: User[] = Array.isArray(todosUsuariosRaw) ? todosUsuariosRaw : []

  const usuariosEmpresa = useMemo(() => {
    return todosUsuarios.filter(
      (u) =>
        u.is_empresa ||
        u.role === 'EMPRESA_ADMIN' ||
        u.role === 'EMPRESA_TECNICO' ||
        u.is_superuser
    )
  }, [todosUsuarios])

  // 4. Usuários do Cliente Selecionado (Analistas e Gerentes do Cliente)
  const { data: usuariosClienteApiRaw = [] } = useQuery({
    queryKey: ['usuarios_cliente_modal', selectedClienteId],
    queryFn: () =>
      selectedClienteId
        ? clientService.clientes.usuarios.list(selectedClienteId)
        : Promise.resolve([]),
    enabled: isOpen && Boolean(selectedClienteId),
    staleTime: 30000,
  })
  const usuariosClienteApi: ClienteUser[] = Array.isArray(usuariosClienteApiRaw) ? usuariosClienteApiRaw : []

  const usuariosCliente = useMemo(() => {
    if (!selectedClienteId) return []
    const map = new Map<string, { nome: string; email: string; role_display: string }>()

    usuariosClienteApi.forEach((u) => {
      if (u.email && u.is_active !== false) {
        const nome = u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.username
        map.set(u.email.toLowerCase(), {
          nome,
          email: u.email.toLowerCase(),
          role_display: u.role === 'CLIENTE_GERENTE' ? 'Gerente Cliente' : 'Analista Cliente',
        })
      }
    })

    todosUsuarios
      .filter((u) => u.cliente === selectedClienteId)
      .forEach((u) => {
        const emailLower = u.email?.toLowerCase()
        if (emailLower && !map.has(emailLower)) {
          const nome = u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.username
          map.set(emailLower, {
            nome,
            email: emailLower,
            role_display:
              u.role_display ||
              (u.role === 'CLIENTE_GERENTE' ? 'Gerente Cliente' : 'Analista Cliente'),
          })
        }
      })

    return Array.from(map.values())
  }, [selectedClienteId, usuariosClienteApi, todosUsuarios])

  // Contratos filtrados pelo cliente selecionado
  const contratosDoCliente = useMemo(() => {
    if (!selectedClienteId) return contratos
    return contratos.filter((c) => c.cliente === selectedClienteId)
  }, [contratos, selectedClienteId])

  // Objeto do cliente selecionado
  const clienteSelecionadoObj = useMemo<Cliente | null>(() => {
    if (!selectedClienteId) return null
    const encontrado = clientes.find((c) => c.id === selectedClienteId)
    if (encontrado) return encontrado
    if (isCliente && user?.cliente === selectedClienteId) {
      return {
        id: user.cliente,
        display_name: user.cliente_nome || 'Sua Empresa',
        email_contato: user.email || '',
        status: 'ativo',
        tipo: 'PJ',
      } as Cliente
    }
    return null
  }, [clientes, selectedClienteId, isCliente, user])

  // Objeto do contrato selecionado
  const contratoSelecionadoObj = useMemo(() => {
    if (!selectedContratoId) return null
    return contratos.find((c) => c.id === selectedContratoId) || null
  }, [contratos, selectedContratoId])

  // Objeto do pedido selecionado
  const pedidoSelecionadoObj = useMemo(() => {
    if (!selectedPedidoId) return null
    return pedidos.find((p) => p.id === selectedPedidoId) || null
  }, [pedidos, selectedPedidoId])

  // 5. E-mails de Notificação do Contrato & Contatos Principais
  const emailsNotificacaoContrato = useMemo(() => {
    const list: Array<{ nome: string; email: string; origem: string }> = []
    const seenEmails = new Set<string>()

    const addEmail = (email?: string | null, nome?: string | null, origem: string = 'Contrato') => {
      if (!email || !email.trim()) return
      const emailLower = email.trim().toLowerCase()
      if (seenEmails.has(emailLower)) return
      seenEmails.add(emailLower)
      list.push({
        email: emailLower,
        nome: nome?.trim() || emailLower,
        origem,
      })
    }

    // Gestor do contrato
    if (contratoSelecionadoObj?.gestor_email) {
      addEmail(
        contratoSelecionadoObj.gestor_email,
        contratoSelecionadoObj.gestor_nome || 'Gestor do Contrato',
        `Gestor - Contrato #${contratoSelecionadoObj.numero}`
      )
    }

    // E-mails de notificação do contrato
    const notifsContrato =
      contratoSelecionadoObj?.emails_notificacao || contratoSelecionadoObj?.destinatarios || []
    notifsContrato.forEach((item: EmailNotificacao) => {
      if (item.ativo !== false) {
        addEmail(item.email, item.nome, `Notificação Contrato #${contratoSelecionadoObj?.numero}`)
      }
    })

    // Contato principal do cliente
    if (clienteSelecionadoObj?.email_contato) {
      addEmail(
        clienteSelecionadoObj.email_contato,
        clienteSelecionadoObj.pessoa_contato || clienteSelecionadoObj.display_name,
        'Contato Principal do Cliente'
      )
    }

    // E-mails de notificação padrão do cliente
    const notifsCliente: EmailNotificacao[] = clienteSelecionadoObj?.emails_notificacao_padrao || []
    notifsCliente.forEach((item: EmailNotificacao) => {
      if (item.ativo !== false) {
        addEmail(item.email, item.nome, 'Notificação Geral do Cliente')
      }
    })

    return list
  }, [contratoSelecionadoObj, clienteSelecionadoObj])

  // Nome do cliente ativo para labels e templates
  const activeClienteNome = useMemo(() => {
    if (clienteNome) return clienteNome
    if (clienteSelecionadoObj?.display_name) return clienteSelecionadoObj.display_name
    if ((clienteSelecionadoObj as any)?.nome_fantasia) return (clienteSelecionadoObj as any).nome_fantasia
    if (contratoSelecionadoObj?.cliente_nome) return contratoSelecionadoObj.cliente_nome
    if (isCliente && user?.cliente_nome) return user.cliente_nome
    return ''
  }, [clienteNome, clienteSelecionadoObj, contratoSelecionadoObj, isCliente, user])

  // Número do contrato ativo
  const activeContratoNumero = useMemo(() => {
    if (contratoNumero) return contratoNumero
    if (contratoSelecionadoObj?.numero) return contratoSelecionadoObj.numero
    if (pedidoSelecionadoObj?.contrato_numero) return pedidoSelecionadoObj.contrato_numero
    return ''
  }, [contratoNumero, contratoSelecionadoObj, pedidoSelecionadoObj])

  // Protocolo do pedido ativo
  const activePedidoProtocolo = useMemo(() => {
    if (pedidoProtocolo) return pedidoProtocolo
    if (pedidoSelecionadoObj?.protocolo) return pedidoSelecionadoObj.protocolo
    return ''
  }, [pedidoProtocolo, pedidoSelecionadoObj])

  const activePedidoAssunto = useMemo(() => {
    if (pedidoAssunto) return pedidoAssunto
    if (pedidoSelecionadoObj?.assunto) return pedidoSelecionadoObj.assunto
    return ''
  }, [pedidoAssunto, pedidoSelecionadoObj])

  // Helper para gerar o preset para o estado atual
  const obterPresetAtual = (tipoReuniao: TipoEventoSchedule) => {
    const config = PRESETS_REUNIAO[tipoReuniao] || PRESETS_REUNIAO.alinhamento
    return {
      titulo: config.gerarTitulo({
        clienteNome: activeClienteNome,
        contratoNumero: activeContratoNumero,
        pedidoProtocolo: activePedidoProtocolo,
        pedidoAssunto: activePedidoAssunto,
        isCliente,
      }),
      pauta: config.pautaPadrao,
    }
  }

  // Filtragem de participantes sugeridos pela barra de busca (hooks incondicionais no topo)
  const termo = buscaParticipante.trim().toLowerCase()

  const usuariosClienteFiltrados = useMemo(() => {
    if (!termo) return usuariosCliente
    return usuariosCliente.filter(
      (u) => u.nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo)
    )
  }, [usuariosCliente, termo])

  const usuariosEmpresaFiltrados = useMemo(() => {
    if (!termo) return usuariosEmpresa
    return usuariosEmpresa.filter((u) => {
      const nome = u.first_name ? `${u.first_name} ${u.last_name || ''}` : u.username
      return nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo)
    })
  }, [usuariosEmpresa, termo])

  const emailsContratoFiltrados = useMemo(() => {
    if (!termo) return emailsNotificacaoContrato
    return emailsNotificacaoContrato.filter(
      (e) => e.nome.toLowerCase().includes(termo) || e.email.toLowerCase().includes(termo)
    )
  }, [emailsNotificacaoContrato, termo])

  // Inicialização e sincronização ao abrir o modal (apenas na transição para aberto)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setError(null)
      setSucesso(null)

      // Data padrão: amanhã às 14:00
      const amanha = new Date()
      amanha.setDate(amanha.getDate() + 1)
      amanha.setHours(14, 0, 0, 0)
      const tzOffset = amanha.getTimezoneOffset() * 60000
      const localISOTime = new Date(amanha.getTime() - tzOffset).toISOString().slice(0, 16)
      setDataInicio(localISOTime)
      setDuracaoMinutos(45)

      // Tipo
      const initialTipo = tipoSugerido || 'alinhamento'
      setTipo(initialTipo)

      // Resolução de foco inicial de Cliente / Contrato / Pedido
      let resolvedClienteId: number | null = clienteId || null
      let resolvedContratoId: number | null = contratoId || null
      const resolvedPedidoId: number | null = pedidoId || null

      if (isCliente && user?.cliente) {
        resolvedClienteId = user.cliente
      } else if (!resolvedClienteId && resolvedContratoId) {
        const matchC = contratos.find((c) => c.id === resolvedContratoId)
        if (matchC) {
          resolvedClienteId = matchC.cliente
        }
      }

      setSelectedClienteId(resolvedClienteId)
      setSelectedContratoId(resolvedContratoId)
      setSelectedPedidoId(resolvedPedidoId)

      // Título inicial
      if (tituloSugerido) {
        setTitulo(tituloSugerido)
      } else {
        const preset =
          PRESETS_REUNIAO[initialTipo]?.gerarTitulo({
            clienteNome: clienteNome || (isCliente ? user?.cliente_nome || '' : ''),
            contratoNumero,
            pedidoProtocolo,
            pedidoAssunto,
            isCliente,
          }) || 'Reunião de Alinhamento de Suporte'
        setTitulo(preset)
      }

      // Pauta inicial
      if (pautaSugerida) {
        setDescricao(pautaSugerida)
      } else {
        setDescricao(PRESETS_REUNIAO[initialTipo]?.pautaPadrao || '')
      }

      setGoogleMeetLink('')

      // Participantes iniciais
      const listaInicial: Array<{ email: string; nome: string; tipo: TipoParticipanteSchedule }> = []

      if (participantesSugeridos && participantesSugeridos.length > 0) {
        listaInicial.push(
          ...participantesSugeridos.map((p) => ({
            nome: p.nome,
            email: p.email,
            tipo: p.tipo || 'cliente',
          }))
        )
      }

      // Se for cliente logado, garante a sua presença
      if (isCliente && user?.email) {
        const jaPresente = listaInicial.some((p) => p.email.toLowerCase() === user.email.toLowerCase())
        if (!jaPresente) {
          listaInicial.unshift({
            nome: user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.username,
            email: user.email.toLowerCase(),
            tipo: 'cliente',
          })
        }
      }

      setParticipantes(listaInicial)
    }
    wasOpenRef.current = isOpen
  }, [
    isOpen,
    clienteId,
    clienteNome,
    contratoId,
    contratoNumero,
    pedidoId,
    pedidoProtocolo,
    pedidoAssunto,
    tipoSugerido,
    tituloSugerido,
    pautaSugerida,
    participantesSugeridos,
    isCliente,
    user,
  ])

  // Se houver apenas 1 cliente no sistema e nenhum estiver selecionado, auto-seleciona para agilizar
  useEffect(() => {
    if (isOpen && !selectedClienteId && isEmpresa && clientes.length === 1) {
      setSelectedClienteId(clientes[0].id)
    }
  }, [isOpen, selectedClienteId, isEmpresa, clientes])

  // Se o contrato estiver selecionado mas sem cliente, sincroniza o cliente
  useEffect(() => {
    if (isOpen && !selectedClienteId && selectedContratoId && contratos.length > 0) {
      const matchC = contratos.find((c) => c.id === selectedContratoId)
      if (matchC) {
        setSelectedClienteId(matchC.cliente)
      }
    }
  }, [isOpen, selectedClienteId, selectedContratoId, contratos])

  // Se o cliente for selecionado e tiver 1 único contrato ativo, pré-seleciona automaticamente
  useEffect(() => {
    if (isOpen && selectedClienteId && !selectedContratoId && contratos.length > 0) {
      const contratosValidos = contratos.filter((c) => c.cliente === selectedClienteId)
      if (contratosValidos.length === 1) {
        setSelectedContratoId(contratosValidos[0].id)
      }
    }
  }, [isOpen, selectedClienteId, selectedContratoId, contratos])

  // Ajusta a aba inicial de participantes de acordo com a disponibilidade
  useEffect(() => {
    if (isOpen) {
      if (selectedClienteId && usuariosCliente.length > 0) {
        setAbaParticipantes('cliente')
      } else if (emailsNotificacaoContrato.length > 0) {
        setAbaParticipantes('contrato')
      } else {
        setAbaParticipantes('empresa')
      }
    }
  }, [isOpen, selectedClienteId, usuariosCliente.length, emailsNotificacaoContrato.length])

  // Aplicação do preset de acordo com o tipo
  const handleTrocarTipo = (novoTipo: TipoEventoSchedule) => {
    setTipo(novoTipo)
    const preset = PRESETS_REUNIAO[novoTipo]
    if (!preset) return

    const novoTitulo = preset.gerarTitulo({
      clienteNome: activeClienteNome,
      contratoNumero: activeContratoNumero,
      pedidoProtocolo: activePedidoProtocolo,
      pedidoAssunto: activePedidoAssunto,
      isCliente,
    })

    const ehPresetAntigo = Object.values(PRESETS_REUNIAO).some(
      (p) => p.pautaPadrao.trim() === descricao.trim()
    )
    if (!descricao.trim() || ehPresetAntigo) {
      setDescricao(preset.pautaPadrao)
    }

    const ehTituloPresetAntigo = Object.values(PRESETS_REUNIAO).some(
      (p) =>
        p.tituloPadrao === titulo ||
        p.gerarTitulo({
          clienteNome: activeClienteNome,
          contratoNumero: activeContratoNumero,
          pedidoProtocolo: activePedidoProtocolo,
          pedidoAssunto: activePedidoAssunto,
          isCliente,
        }) === titulo
    )

    if (!titulo.trim() || ehTituloPresetAntigo) {
      setTitulo(novoTitulo)
    }
  }

  const handleAplicarPresetManual = () => {
    const preset = obterPresetAtual(tipo)
    setTitulo(preset.titulo)
    setDescricao(preset.pauta)
  }

  // Helpers de Participantes
  const isParticipanteConvocado = (email: string) => {
    const emailNorm = email.trim().toLowerCase()
    return participantes.some((p) => p.email.toLowerCase() === emailNorm)
  }

  const toggleParticipante = (
    email: string,
    nome: string,
    tipoPart: TipoParticipanteSchedule = 'cliente'
  ) => {
    const emailNorm = email.trim().toLowerCase()
    if (isParticipanteConvocado(emailNorm)) {
      setParticipantes((prev) => prev.filter((p) => p.email.toLowerCase() !== emailNorm))
    } else {
      setParticipantes((prev) => [
        ...prev,
        {
          nome: nome.trim() || emailNorm,
          email: emailNorm,
          tipo: tipoPart,
        },
      ])
    }
  }

  const handleConvidarOutro = () => {
    if (!outroEmail.trim()) return
    const emailNorm = outroEmail.trim().toLowerCase()
    if (isParticipanteConvocado(emailNorm)) {
      setError('Este e-mail já foi convocado para a reunião.')
      return
    }
    setError(null)
    setParticipantes((prev) => [
      ...prev,
      {
        nome: outroNome.trim() || emailNorm,
        email: emailNorm,
        tipo: outroTipo,
      },
    ])
    setOutroNome('')
    setOutroEmail('')
  }

  const handleRemoverParticipante = (index: number) => {
    setParticipantes((prev) => prev.filter((_, i) => i !== index))
  }

  const adicionarTodosDoGrupo = (
    items: Array<{ email: string; nome: string; tipo?: TipoParticipanteSchedule }>,
    defaultTipo: TipoParticipanteSchedule = 'cliente'
  ) => {
    setParticipantes((prev) => {
      const novos = [...prev]
      const emailsAtuais = new Set(prev.map((p) => p.email.toLowerCase()))

      items.forEach((item) => {
        const emailNorm = item.email.trim().toLowerCase()
        if (!emailsAtuais.has(emailNorm)) {
          emailsAtuais.add(emailNorm)
          novos.push({
            nome: item.nome.trim() || emailNorm,
            email: emailNorm,
            tipo: item.tipo || defaultTipo,
          })
        }
      })
      return novos
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    let finalClienteId = selectedClienteId || (isCliente ? user?.cliente : undefined) || clienteId
    if (!finalClienteId && selectedContratoId && contratos.length > 0) {
      const matchC = contratos.find((c) => c.id === selectedContratoId)
      if (matchC) finalClienteId = matchC.cliente
    }
    if (!finalClienteId && selectedPedidoId && pedidos.length > 0) {
      const matchP = pedidos.find((p) => p.id === selectedPedidoId)
      if (matchP) finalClienteId = matchP.cliente
    }
    if (!finalClienteId && isEmpresa && clientes.length === 1) {
      finalClienteId = clientes[0].id
    }

    if (!finalClienteId) {
      setError('Por favor, selecione um Cliente para vincular o agendamento.')
      return
    }

    if (!titulo.trim()) {
      setError('Informe o título da reunião.')
      return
    }

    if (!dataInicio) {
      setError('Informe a data e horário de início.')
      return
    }

    const dataInicioObj = new Date(dataInicio)
    if (isNaN(dataInicioObj.getTime())) {
      setError('A data e horário de início informados são inválidos.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const payload = {
        cliente: Number(finalClienteId),
        pedido: selectedPedidoId || pedidoId || null,
        ciclo: cicloId || null,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        tipo,
        data_inicio: dataInicioObj.toISOString(),
        duracao_minutos: duracaoMinutos,
        participantes,
        sincronizar_google: sincronizarGoogle,
        google_meet_link: googleMeetLink.trim() || null,
      }

      const agendamento = await clientService.schedule.create(payload)
      setSucesso(agendamento)
      if (onAgendado) {
        onAgendado(agendamento)
      }
      setTimeout(() => {
        onClose()
      }, 1800)
    } catch (err: any) {
      let msg = 'Erro ao agendar reunião.'
      if (err.response?.data) {
        const data = err.response.data
        if (typeof data === 'string') {
          msg = data
        } else if (data.detail) {
          msg = data.detail
        } else if (data.error) {
          msg = data.error
        } else {
          const fieldErrors = Object.entries(data)
            .map(([field, errors]) => {
              const errStr = Array.isArray(errors) ? errors.join(', ') : String(errors)
              return `${field}: ${errStr}`
            })
            .join(' | ')
          if (fieldErrors) msg = fieldErrors
        }
      } else if (err.message) {
        msg = err.message
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900 flex flex-col max-h-[92vh]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4 dark:border-slate-800 dark:bg-slate-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 shadow-2xs">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                {isCliente ? 'Solicitar Reunião de Suporte' : 'Agendar Reunião de Suporte'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
                {activeClienteNome ? `${activeClienteNome} • ` : ''}
                {activePedidoProtocolo ? `Chamado #${activePedidoProtocolo}` : 'Agenda suporte-SHM'}
                {activeContratoNumero ? ` • Contrato ${activeContratoNumero}` : ''}
                {cicloTipo ? ` • ${cicloTipo}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulário com Scroll */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {sucesso && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-black text-sm">Reunião agendada com sucesso!</p>
                {sucesso.google_meet_link && (
                  <p className="mt-1 text-xs">
                    Sala virtual do Meet gerada:{' '}
                    <a
                      href={sucesso.google_meet_link}
                      target="_blank"
                      rel="noreferrer"
                      className="underline font-mono text-indigo-700 dark:text-indigo-300 font-bold"
                    >
                      {sucesso.google_meet_link}
                    </a>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* SELEÇÃO DE CLIENTE / CONTRATO / CHAMADO (CONTEXTO EM FOCO) */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <Building2 className="w-4 h-4 text-indigo-500" />
                Vínculo Operacional (Cliente & Contrato)
              </span>
              {selectedClienteId ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50">
                  <Check className="w-3 h-3" />
                  Cliente em Foco
                </span>
              ) : (
                <span className="text-[11px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800/50">
                  Obrigatório selecionar
                </span>
              )}
            </div>

            {/* Quando o usuário é CLIENTE */}
            {isCliente ? (
              <div className="space-y-2">
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Empresa Solicitante</span>
                  <span className="font-black text-slate-800 dark:text-slate-200 text-sm">
                    {user?.cliente_nome || 'Sua Empresa'}
                  </span>
                </div>

                {contratosDoCliente.length > 1 && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      Contrato Relacionado
                    </label>
                    <select
                      value={selectedContratoId || ''}
                      onChange={(e) => setSelectedContratoId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 font-medium"
                    >
                      <option value="">-- Selecione o Contrato --</option>
                      {contratosDoCliente.map((c) => (
                        <option key={c.id} value={c.id}>
                          Contrato #{c.numero} (Saldo: {c.saldo}h)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              /* Quando o usuário é GESTOR DA EMPRESA / TÉCNICO */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Seletor de Cliente */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Cliente *
                  </label>
                  <select
                    value={selectedClienteId || ''}
                    onChange={(e) => {
                      const cid = e.target.value ? Number(e.target.value) : null
                      setSelectedClienteId(cid)
                      setSelectedContratoId(null)
                      setSelectedPedidoId(null)
                    }}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Selecione um Cliente --</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.display_name || c.nome_fantasia || c.razao_social}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Seletor de Contrato */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Contrato (Opcional)
                  </label>
                  <select
                    value={selectedContratoId || ''}
                    onChange={(e) => {
                      const cid = e.target.value ? Number(e.target.value) : null
                      setSelectedContratoId(cid)
                      if (cid && !selectedClienteId) {
                        const matchC = contratos.find((c) => c.id === cid)
                        if (matchC) setSelectedClienteId(matchC.cliente)
                      }
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">
                      {selectedClienteId ? '-- Geral / Nenhum contrato específico --' : '-- Todos os Contratos --'}
                    </option>
                    {contratosDoCliente.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.cliente_nome ? `${c.cliente_nome} • ` : ''}#{c.numero} (Saldo: {c.saldo}h)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Seletor de Chamado / Pedido (se houver cliente selecionado) */}
                {pedidos.length > 0 && (
                  <div className="sm:col-span-2 space-y-1 pt-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      Vincular a um Chamado Aberto (Opcional)
                    </label>
                    <select
                      value={selectedPedidoId || ''}
                      onChange={(e) => {
                        const pid = e.target.value ? Number(e.target.value) : null
                        setSelectedPedidoId(pid)
                        if (pid) {
                          const ped = pedidos.find((p) => p.id === pid)
                          if (ped) {
                            if (!selectedClienteId) setSelectedClienteId(ped.cliente)
                            if (!selectedContratoId) setSelectedContratoId(ped.contrato)
                          }
                        }
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Sem chamado específico (Reunião Avulsa/Geral) --</option>
                      {pedidos.map((p) => (
                        <option key={p.id} value={p.id}>
                          #{p.protocolo} - {p.assunto} ({p.status_display})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* TIPO DA REUNIÃO COM BOTÕES PRESET */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Tipo da Reunião & Modelos
              </label>
              <button
                type="button"
                onClick={handleAplicarPresetManual}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                title="Aplica o título e a pauta padrão para o tipo selecionado"
              >
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <span>Aplicar sugestão de título & pauta</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {(Object.keys(PRESETS_REUNIAO) as TipoEventoSchedule[]).map((key) => {
                const config = PRESETS_REUNIAO[key]
                const ativo = tipo === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleTrocarTipo(key)}
                    className={`px-2.5 py-2 rounded-xl text-xs font-bold text-center transition-all cursor-pointer border ${
                      ativo
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:border-indigo-400'
                    }`}
                  >
                    {config.rotulo}
                  </button>
                )
              })}
            </div>
          </div>

          {/* TÍTULO DO COMPROMISSO */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Título do Compromisso *
              </label>
              <button
                type="button"
                onClick={() => setTitulo(obterPresetAtual(tipo).titulo)}
                className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition flex items-center gap-0.5"
                title="Restaurar título sugerido"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Sugerir título</span>
              </button>
            </div>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              placeholder="Ex: Alinhamento de Escopo e Pauta"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          {/* DATA, HORA E DURAÇÃO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <Clock className="h-3.5 w-3.5 text-indigo-500" />
                Data e Horário de Início *
              </label>
              <input
                type="datetime-local"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Duração Prevista
              </label>
              <div className="flex items-center gap-1.5">
                {[15, 30, 45, 60, 90].map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setDuracaoMinutos(min)}
                    className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                      duracaoMinutos === min
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {min}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* PAUTA / OBSERVAÇÕES (PRESET INTELIGENTE) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <FileText className="h-3.5 w-3.5 text-indigo-500" />
                Pauta da Reunião / Observações
              </label>
              <button
                type="button"
                onClick={() => setDescricao(obterPresetAtual(tipo).pauta)}
                className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition flex items-center gap-0.5"
                title="Restaurar tópicos sugeridos para este tipo"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Restaurar pauta padrão</span>
              </button>
            </div>
            <textarea
              rows={4}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva os tópicos a serem alinhados ou instruções para os participantes..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs leading-relaxed text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 font-mono"
            />
          </div>

          {/* PARTICIPANTES CONVOCADOS & SELETOR INTELIGENTE */}
          <div className="space-y-3 border-t border-slate-200 pt-3 dark:border-slate-800">
            {/* Cabeçalho da Convocação */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                <Users className="h-3.5 w-3.5 text-indigo-500" />
                Participantes Convocados ({participantes.length})
              </label>
              <span className="text-[11px] text-slate-400">Receberão convite e link do Meet</span>
            </div>

            {/* Chips de Participantes já Convocados */}
            {participantes.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 max-h-32 overflow-y-auto">
                {participantes.map((part, idx) => (
                  <div
                    key={part.email + idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs text-xs animate-in fade-in"
                  >
                    <span className="font-bold">{part.nome}</span>
                    <span className="text-[10px] text-slate-400">&lt;{part.email}&gt;</span>
                    <span
                      className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                        part.tipo === 'cliente'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : part.tipo === 'tecnico'
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {part.tipo}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoverParticipante(idx)}
                      className="text-slate-400 hover:text-rose-500 p-0.5 rounded-md transition cursor-pointer"
                      title="Remover participante"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/40 dark:bg-slate-800/20">
                Nenhum participante adicionado ainda. Escolha nas sugestões abaixo ou convide outros.
              </div>
            )}

            {/* SELETOR EM ABAS / SUGESTÕES DE PARTICIPANTES */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-800/60">
              {/* Barra de Navegação das Abas de Sugestão */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/90 px-3 py-2 flex-wrap gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setAbaParticipantes('cliente')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      abaParticipantes === 'cliente'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Equipe do Cliente ({usuariosCliente.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAbaParticipantes('empresa')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      abaParticipantes === 'empresa'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Equipe SHM ({usuariosEmpresa.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAbaParticipantes('contrato')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      abaParticipantes === 'contrato'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>E-mails do Contrato ({emailsNotificacaoContrato.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAbaParticipantes('outros')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      abaParticipantes === 'outros'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Convidar Outros</span>
                  </button>
                </div>

                {abaParticipantes !== 'outros' && (
                  <div className="relative w-full sm:w-44">
                    <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={buscaParticipante}
                      onChange={(e) => setBuscaParticipante(e.target.value)}
                      placeholder="Filtrar..."
                      className="w-full pl-7 pr-2.5 py-1 text-xs rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-hidden"
                    />
                  </div>
                )}
              </div>

              {/* Conteúdo da Aba */}
              <div className="p-3">
                {/* 1. ABA EQUIPE DO CLIENTE */}
                {abaParticipantes === 'cliente' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Analistas e Gerentes vinculados a {activeClienteNome || 'este cliente'}</span>
                      {usuariosClienteFiltrados.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            adicionarTodosDoGrupo(
                              usuariosClienteFiltrados.map((u) => ({
                                nome: u.nome,
                                email: u.email,
                                tipo: 'cliente',
                              })),
                              'cliente'
                            )
                          }
                          className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          + Convocar todos do cliente
                        </button>
                      )}
                    </div>

                    {usuariosClienteFiltrados.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 italic">
                        {selectedClienteId
                          ? 'Nenhum analista ou gerente encontrado com e-mail cadastrado para este cliente.'
                          : 'Selecione um cliente acima para visualizar a lista de colaboradores.'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pt-1">
                        {usuariosClienteFiltrados.map((u) => {
                          const convocado = isParticipanteConvocado(u.email)
                          return (
                            <button
                              key={u.email}
                              type="button"
                              onClick={() => toggleParticipante(u.email, u.nome, 'cliente')}
                              className={`flex items-center justify-between p-2 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                                convocado
                                  ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                                  : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{u.nome}</p>
                                <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                                <span className="inline-block mt-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-900/40 px-1.5 py-0.2 rounded">
                                  {u.role_display}
                                </span>
                              </div>
                              <span
                                className={`shrink-0 p-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                                  convocado
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                                }`}
                              >
                                {convocado ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 2. ABA EQUIPE SHM (EMPRESA) */}
                {abaParticipantes === 'empresa' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Equipe técnica e gestores internos da empresa SHM</span>
                      {usuariosEmpresaFiltrados.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            adicionarTodosDoGrupo(
                              usuariosEmpresaFiltrados.map((u) => ({
                                nome: u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.username,
                                email: u.email,
                                tipo: 'tecnico',
                              })),
                              'tecnico'
                            )
                          }
                          className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          + Convocar equipe SHM
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pt-1">
                      {usuariosEmpresaFiltrados.map((u) => {
                        const nome = u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.username
                        const convocado = isParticipanteConvocado(u.email)
                        return (
                          <button
                            key={u.email}
                            type="button"
                            onClick={() => toggleParticipante(u.email, nome, 'tecnico')}
                            className={`flex items-center justify-between p-2 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                              convocado
                                ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800'
                                : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{nome}</p>
                              <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                              <span className="inline-block mt-0.5 text-[9px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-100/60 dark:bg-indigo-900/40 px-1.5 py-0.2 rounded">
                                {u.role === 'EMPRESA_ADMIN' || u.is_superuser ? 'Admin Empresa' : 'Técnico SHM'}
                              </span>
                            </div>
                            <span
                              className={`shrink-0 p-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                                convocado
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                              }`}
                            >
                              {convocado ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 3. ABA E-MAILS DO CONTRATO */}
                {abaParticipantes === 'contrato' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Destinatários de notificação e gestor cadastrados no contrato</span>
                      {emailsContratoFiltrados.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            adicionarTodosDoGrupo(
                              emailsContratoFiltrados.map((e) => ({
                                nome: e.nome,
                                email: e.email,
                                tipo: 'cliente',
                              })),
                              'cliente'
                            )
                          }
                          className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          + Convocar todos os e-mails
                        </button>
                      )}
                    </div>

                    {emailsContratoFiltrados.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 italic">
                        Nenhum e-mail de notificação adicional cadastrado no contrato selecionado.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pt-1">
                        {emailsContratoFiltrados.map((e) => {
                          const convocado = isParticipanteConvocado(e.email)
                          return (
                            <button
                              key={e.email}
                              type="button"
                              onClick={() => toggleParticipante(e.email, e.nome, 'cliente')}
                              className={`flex items-center justify-between p-2 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                                convocado
                                  ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                                  : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{e.nome}</p>
                                <p className="text-[11px] text-slate-500 truncate">{e.email}</p>
                                <span className="inline-block mt-0.5 text-[9px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.2 rounded truncate max-w-[180px]">
                                  {e.origem}
                                </span>
                              </div>
                              <span
                                className={`shrink-0 p-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                                  convocado
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                                }`}
                              >
                                {convocado ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. ABA CONVIDAR OUTROS (AVULSOS / EXTERNOS) */}
                {abaParticipantes === 'outros' && (
                  <div className="space-y-2.5">
                    <p className="text-xs text-slate-500">
                      Convoque participantes externos ou convidados que não estão cadastrados no sistema:
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Nome do Convidado"
                        value={outroNome}
                        onChange={(e) => setOutroNome(e.target.value)}
                        className="sm:w-1/3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                      <input
                        type="email"
                        placeholder="E-mail do Convidado *"
                        value={outroEmail}
                        onChange={(e) => setOutroEmail(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleConvidarOutro()
                          }
                        }}
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      />
                      <select
                        value={outroTipo}
                        onChange={(e) => setOutroTipo(e.target.value as TipoParticipanteSchedule)}
                        className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      >
                        <option value="convidado">Convidado</option>
                        <option value="cliente">Cliente</option>
                        <option value="tecnico">Técnico</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleConvidarOutro}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Adicionar</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* INTEGRAÇÃO GOOGLE MEET & CALENDAR */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3.5 space-y-3 text-xs text-indigo-950 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-indigo-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Video className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div>
                  <p className="font-bold">Google Meet & Calendário suporte-SHM</p>
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-300">
                    Sincroniza no Google Calendar e agenda régua de lembretes em 24h, 30m e 15m.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={sincronizarGoogle}
                  onChange={(e) => setSincronizarGoogle(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full bg-slate-300 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-focus:outline-hidden dark:bg-slate-700"></div>
              </label>
            </div>

            {/* Link da Sala Virtual */}
            <div className="pt-2 border-t border-indigo-100/80 dark:border-indigo-900/40 space-y-1.5">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <label className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300">
                  Link da Sala de Videoconferência (Opcional)
                </label>
                <a
                  href="https://meet.google.com/new"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-400 hover:underline"
                  title="Abre o Google Meet na sua conta para iniciar uma nova sala instantânea oficial"
                >
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  <span>Criar sala (meet.google.com/new)</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <input
                type="url"
                value={googleMeetLink}
                onChange={(e) => setGoogleMeetLink(e.target.value)}
                placeholder="Ex: https://meet.google.com/abc-defg-hij ou cole um link do Zoom/Teams"
                className="w-full rounded-xl border border-indigo-200/80 bg-white dark:bg-slate-850 dark:border-slate-700 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-mono"
              />
              <p className="text-[10px] text-indigo-700/80 dark:text-indigo-400">
                Se você já possui uma sala ou deseja iniciar uma agora via Google Meet, cole o link acima. Você também poderá definir ou alterar o link a qualquer momento no card da reunião.
              </p>
            </div>
          </div>

          {/* RODAPÉ E BOTÕES */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-black text-white shadow-md shadow-indigo-600/20 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 cursor-pointer"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{loading ? 'Sincronizando...' : 'Confirmar Agendamento'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
